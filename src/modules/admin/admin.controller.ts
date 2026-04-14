import { Response } from "express";
import { z } from "zod";
import { pool } from "../../config/db";
import { AuthRequest } from "../../middleware/auth";
import { exportQueue } from "../../queues/export.queue";
import { createAuditLog } from "../audit/audit.service";
import { v4 as uuidv4 } from "uuid";

const listSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sort: z.enum(["created_at", "id"]).default("created_at"),
  direction: z.enum(["asc", "desc"]).default("desc"),
  category: z.enum(["fraud", "harassment", "safety", "corruption", "other"]).optional()
});

export async function listComplaints(req: AuthRequest, res: Response): Promise<void> {
  const parsed = listSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query" });
    return;
  }
  const { page, limit, sort, direction, category } = parsed.data;
  const offset = (page - 1) * limit;
  const filterClause = category ? " AND category = $4" : "";
  const params = category
    ? [req.params.orgId, limit, offset, category]
    : [req.params.orgId, limit, offset];
  const rows = await pool.query(
    `SELECT id, org_id, encrypted_data, encrypted_key, category, complaint_status, created_at FROM complaints WHERE org_id = $1${filterClause} ORDER BY ${sort} ${direction} LIMIT $2 OFFSET $3`,
    params
  );
  res.json({ page, limit, data: rows.rows });
}

export async function getTimeline(req: AuthRequest, res: Response): Promise<void> {
  const scope = await pool.query("SELECT id FROM complaints WHERE id = $1 AND org_id = $2", [
    req.params.id,
    req.authUser!.orgId
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
    orgId: req.authUser!.orgId,
    actorId: req.authUser!.userId,
    action: "VIEW_TIMELINE",
    complaintId: req.params.id
  });
  res.json(rows.rows);
}

export async function addUpdate(req: AuthRequest, res: Response): Promise<void> {
  const schema = z.object({
    message: z.string().min(1),
    status: z.enum(["UNDER_REVIEW", "INVESTIGATING", "RESOLVED", "DISMISSED"]).optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }
  const complaint = await pool.query("SELECT id, org_id FROM complaints WHERE id = $1", [req.params.id]);
  if (!complaint.rowCount || complaint.rows[0].org_id !== req.authUser!.orgId) {
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
      req.authUser!.orgId
    ]);
  }
  await createAuditLog({
    orgId: req.authUser!.orgId,
    actorId: req.authUser!.userId,
    action: "UPDATE_COMPLAINT",
    complaintId: req.params.id
  });
  res.status(201).json({ status: "ok" });
}

export async function createExportJob(req: AuthRequest, res: Response): Promise<void> {
  const schema = z.object({
    filters: z.record(z.string(), z.any()).default({})
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }
  const id = uuidv4();
  await pool.query("INSERT INTO export_jobs (id, org_id, status, filters) VALUES ($1,$2,$3,$4)", [
    id,
    req.authUser!.orgId,
    "PENDING",
    JSON.stringify(parsed.data.filters)
  ]);
  await exportQueue.add("generate-export", { exportJobId: id });
  await createAuditLog({
    orgId: req.authUser!.orgId,
    actorId: req.authUser!.userId,
    action: "EXPORT_DATA"
  });
  res.status(202).json({ jobId: id, status: "PENDING" });
}

export async function getAdminStats(req: AuthRequest, res: Response): Promise<void> {
  const orgId = req.authUser!.orgId;
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
