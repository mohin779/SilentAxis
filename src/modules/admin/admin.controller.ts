import { Response } from "express";
import { z } from "zod";
import { pool } from "../../config/db";
import { exportQueue } from "../../queues/export.queue";
import { createAuditLog } from "../audit/audit.service";
import { v4 as uuidv4 } from "uuid";
import { StaffSessionUser } from "../../middleware/staffSession";
import { Request } from "express";

const listSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sort: z.enum(["created_at", "id"]).default("created_at"),
  direction: z.enum(["asc", "desc"]).default("desc"),
  category: z.enum(["fraud", "harassment", "safety", "corruption", "other"]).optional()
});

type StaffReq = Request & { session: any; staff?: StaffSessionUser };

const employeeSchema = z.object({
  employeeIdentifier: z.string().min(3).max(320),
  officialEmail: z.string().email()
});

const bulkEmployeeSchema = z.object({
  csvText: z.string().min(1)
});

export async function listComplaints(req: StaffReq, res: Response): Promise<void> {
  const parsed = listSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query" });
    return;
  }
  const staff = req.session?.staff as StaffSessionUser | undefined;
  if (!staff) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const { page, limit, sort, direction, category } = parsed.data;
  const offset = (page - 1) * limit;
  const filterClause = category ? " AND category = $4" : "";
  const params = category
    ? [staff.orgId, limit, offset, category]
    : [staff.orgId, limit, offset];
  const rows = await pool.query(
    `SELECT id, org_id, encrypted_data, encrypted_key, category, complaint_status, created_at FROM complaints WHERE org_id = $1${filterClause} ORDER BY ${sort} ${direction} LIMIT $2 OFFSET $3`,
    params
  );
  res.json({ page, limit, data: rows.rows });
}

export async function getTimeline(req: StaffReq, res: Response): Promise<void> {
  const staff = req.session?.staff as StaffSessionUser | undefined;
  if (!staff) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const scope = await pool.query("SELECT id FROM complaints WHERE id = $1 AND org_id = $2", [
    req.params.id,
    staff.orgId
  ]);
  if (!scope.rowCount) {
    res.status(404).json({ error: "Complaint not found" });
    return;
  }
  const rows = await pool.query(
    "SELECT id, complaint_id, message, created_at FROM complaint_updates WHERE complaint_id = $1 ORDER BY created_at ASC",
    [req.params.id]
  );
  await createAuditLog({
    orgId: staff.orgId,
    actorId: staff.userId,
    action: "VIEW_TIMELINE",
    complaintId: req.params.id
  });
  res.json(rows.rows);
}

export async function addUpdate(req: StaffReq, res: Response): Promise<void> {
  const schema = z.object({
    message: z.string().min(1),
    status: z.enum(["UNDER_REVIEW", "INVESTIGATING", "RESOLVED", "DISMISSED"]).optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }
  const staff = req.session?.staff as StaffSessionUser | undefined;
  if (!staff) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const complaint = await pool.query("SELECT id, org_id FROM complaints WHERE id = $1", [req.params.id]);
  if (!complaint.rowCount || complaint.rows[0].org_id !== staff.orgId) {
    res.status(404).json({ error: "Complaint not found" });
    return;
  }
  await pool.query("INSERT INTO complaint_updates (id, complaint_id, message) VALUES ($1,$2,$3)", [
    uuidv4(),
    req.params.id,
    parsed.data.message
  ]);
  if (parsed.data.status) {
    await pool.query("UPDATE complaints SET complaint_status = $1 WHERE id = $2 AND org_id = $3", [
      parsed.data.status,
      req.params.id,
      staff.orgId
    ]);
  }
  await createAuditLog({
    orgId: staff.orgId,
    actorId: staff.userId,
    action: "UPDATE_COMPLAINT",
    complaintId: req.params.id
  });
  res.status(201).json({ status: "ok" });
}

export async function createExportJob(req: StaffReq, res: Response): Promise<void> {
  const schema = z.object({
    filters: z.record(z.string(), z.any()).default({})
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }
  const staff = req.session?.staff as StaffSessionUser | undefined;
  if (!staff) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const id = uuidv4();
  await pool.query("INSERT INTO export_jobs (id, org_id, status, filters) VALUES ($1,$2,$3,$4)", [
    id,
    staff.orgId,
    "PENDING",
    JSON.stringify(parsed.data.filters)
  ]);
  await exportQueue.add("generate-export", { exportJobId: id });
  await createAuditLog({
    orgId: staff.orgId,
    actorId: staff.userId,
    action: "EXPORT_DATA"
  });
  res.status(202).json({ jobId: id, status: "PENDING" });
}

export async function getAdminStats(req: StaffReq, res: Response): Promise<void> {
  const staff = req.session?.staff as StaffSessionUser | undefined;
  if (!staff) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const orgId = staff.orgId;
  const [categoryCounts, monthlyCounts, resolutionTime, openClosed, medianResolution, perInvestigator] =
    await Promise.all([
    pool.query(
      "SELECT category, COUNT(*)::int AS count FROM complaints WHERE org_id = $1 GROUP BY category ORDER BY category",
      [orgId]
    ),
    pool.query(
      "SELECT TO_CHAR(created_at, 'YYYY-MM') AS month, COUNT(*)::int AS count FROM complaints WHERE org_id = $1 GROUP BY month ORDER BY month",
      [orgId]
    ),
    pool.query(
      `SELECT AVG(EXTRACT(EPOCH FROM (cu.created_at - c.created_at))/3600)::numeric(10,2) AS avg_resolution_hours
       FROM complaints c
       JOIN complaint_updates cu ON cu.complaint_id = c.id
       WHERE c.org_id = $1 AND c.complaint_status IN ('RESOLVED','DISMISSED')`,
      [orgId]
    ),
    pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE complaint_status IN ('SUBMITTED','UNDER_REVIEW','INVESTIGATING'))::int AS open_cases,
         COUNT(*) FILTER (WHERE complaint_status IN ('RESOLVED','DISMISSED'))::int AS closed_cases
       FROM complaints WHERE org_id = $1`,
      [orgId]
    ),
    pool.query(
      `SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (cu.created_at - c.created_at))/3600)::numeric(10,2) AS median_resolution_hours
       FROM complaints c
       JOIN complaint_updates cu ON cu.complaint_id = c.id
       WHERE c.org_id = $1 AND c.complaint_status IN ('RESOLVED','DISMISSED')`,
      [orgId]
    ),
    pool.query(
      `SELECT actor_id AS investigator_id, COUNT(*)::int AS handled
       FROM org_audit_logs
       WHERE org_id = $1 AND action = 'UPDATE_COMPLAINT' AND actor_id IS NOT NULL
       GROUP BY actor_id
       ORDER BY handled DESC`,
      [orgId]
    )
    ]);

  res.json({
    perCategory: categoryCounts.rows,
    monthlyTrend: monthlyCounts.rows,
    averageResolutionHours: resolutionTime.rows[0]?.avg_resolution_hours ?? null,
    medianResolutionHours: medianResolution.rows[0]?.median_resolution_hours ?? null,
    averageInvestigationHours: resolutionTime.rows[0]?.avg_resolution_hours ?? null,
    complaintsPerInvestigator: perInvestigator.rows,
    caseState: openClosed.rows[0]
  });
}

export async function listEmployees(req: StaffReq, res: Response): Promise<void> {
  const staff = req.session?.staff as StaffSessionUser | undefined;
  if (!staff) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const rows = await pool.query(
    `SELECT id, org_id, employee_identifier, official_email, created_at
     FROM org_employees
     WHERE org_id = $1
     ORDER BY created_at DESC`,
    [staff.orgId]
  );
  res.json(rows.rows);
}

export async function addEmployee(req: StaffReq, res: Response): Promise<void> {
  const staff = req.session?.staff as StaffSessionUser | undefined;
  if (!staff) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const parsed = employeeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }
  const id = uuidv4();
  const { employeeIdentifier, officialEmail } = parsed.data;
  await pool.query(
    `INSERT INTO org_employees (id, org_id, employee_identifier, official_email)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (org_id, employee_identifier)
     DO UPDATE SET official_email = EXCLUDED.official_email`,
    [id, staff.orgId, employeeIdentifier.trim(), officialEmail.trim().toLowerCase()]
  );
  res.status(201).json({ status: "ok" });
}

function parseEmployeeCsv(csvText: string): Array<{ employeeIdentifier: string; officialEmail: string }> {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return [];

  const maybeHeader = lines[0].toLowerCase();
  const start = maybeHeader.includes("employee") && maybeHeader.includes("email") ? 1 : 0;
  const rows: Array<{ employeeIdentifier: string; officialEmail: string }> = [];

  for (let i = start; i < lines.length; i += 1) {
    const cols = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    if (cols.length < 2) continue;
    rows.push({ employeeIdentifier: cols[0], officialEmail: cols[1] });
  }
  return rows;
}

export async function importEmployeesCsv(req: StaffReq, res: Response): Promise<void> {
  const staff = req.session?.staff as StaffSessionUser | undefined;
  if (!staff) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const parsed = bulkEmployeeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }

  const rows = parseEmployeeCsv(parsed.data.csvText);
  if (!rows.length) {
    res.status(400).json({ error: "CSV has no valid rows" });
    return;
  }

  const accepted: string[] = [];
  const rejected: Array<{ row: number; reason: string }> = [];

  for (let i = 0; i < rows.length; i += 1) {
    const one = employeeSchema.safeParse(rows[i]);
    if (!one.success) {
      rejected.push({ row: i + 1, reason: "Invalid employeeIdentifier or officialEmail" });
      continue;
    }
    await pool.query(
      `INSERT INTO org_employees (id, org_id, employee_identifier, official_email)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (org_id, employee_identifier)
       DO UPDATE SET official_email = EXCLUDED.official_email`,
      [uuidv4(), staff.orgId, one.data.employeeIdentifier.trim(), one.data.officialEmail.trim().toLowerCase()]
    );
    accepted.push(one.data.employeeIdentifier);
  }

  res.status(201).json({
    status: "ok",
    insertedOrUpdated: accepted.length,
    rejected
  });
}
