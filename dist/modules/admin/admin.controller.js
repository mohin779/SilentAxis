"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listComplaints = listComplaints;
exports.getTimeline = getTimeline;
exports.addUpdate = addUpdate;
exports.createExportJob = createExportJob;
exports.getAdminStats = getAdminStats;
const zod_1 = require("zod");
const db_1 = require("../../config/db");
const export_queue_1 = require("../../queues/export.queue");
const audit_service_1 = require("../audit/audit.service");
const uuid_1 = require("uuid");
const listSchema = zod_1.z.object({
    page: zod_1.z.coerce.number().min(1).default(1),
    limit: zod_1.z.coerce.number().min(1).max(100).default(20),
    sort: zod_1.z.enum(["created_at", "id"]).default("created_at"),
    direction: zod_1.z.enum(["asc", "desc"]).default("desc"),
    category: zod_1.z.enum(["fraud", "harassment", "safety", "corruption", "other"]).optional()
});
async function listComplaints(req, res) {
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
    const rows = await db_1.pool.query(`SELECT id, org_id, encrypted_data, encrypted_key, category, complaint_status, created_at FROM complaints WHERE org_id = $1${filterClause} ORDER BY ${sort} ${direction} LIMIT $2 OFFSET $3`, params);
    res.json({ page, limit, data: rows.rows });
}
async function getTimeline(req, res) {
    const scope = await db_1.pool.query("SELECT id FROM complaints WHERE id = $1 AND org_id = $2", [
        req.params.id,
        req.authUser.orgId
    ]);
    if (!scope.rowCount) {
        res.status(404).json({ error: "Complaint not found" });
        return;
    }
    const rows = await db_1.pool.query("SELECT id, complaint_id, message, created_at FROM complaint_updates WHERE complaint_id = $1 ORDER BY created_at ASC", [req.params.id]);
    await (0, audit_service_1.createAuditLog)({
        orgId: req.authUser.orgId,
        actorId: req.authUser.userId,
        action: "VIEW_TIMELINE",
        complaintId: req.params.id
    });
    res.json(rows.rows);
}
async function addUpdate(req, res) {
    const schema = zod_1.z.object({
        message: zod_1.z.string().min(1),
        status: zod_1.z.enum(["UNDER_REVIEW", "INVESTIGATING", "RESOLVED", "DISMISSED"]).optional()
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: "Invalid payload" });
        return;
    }
    const complaint = await db_1.pool.query("SELECT id, org_id FROM complaints WHERE id = $1", [req.params.id]);
    if (!complaint.rowCount || complaint.rows[0].org_id !== req.authUser.orgId) {
        res.status(404).json({ error: "Complaint not found" });
        return;
    }
    await db_1.pool.query("INSERT INTO complaint_updates (id, complaint_id, message) VALUES ($1,$2,$3)", [
        (0, uuid_1.v4)(),
        req.params.id,
        parsed.data.message
    ]);
    if (parsed.data.status) {
        await db_1.pool.query("UPDATE complaints SET complaint_status = $1 WHERE id = $2 AND org_id = $3", [
            parsed.data.status,
            req.params.id,
            req.authUser.orgId
        ]);
    }
    await (0, audit_service_1.createAuditLog)({
        orgId: req.authUser.orgId,
        actorId: req.authUser.userId,
        action: "UPDATE_COMPLAINT",
        complaintId: req.params.id
    });
    res.status(201).json({ status: "ok" });
}
async function createExportJob(req, res) {
    const schema = zod_1.z.object({
        filters: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).default({})
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: "Invalid payload" });
        return;
    }
    const id = (0, uuid_1.v4)();
    await db_1.pool.query("INSERT INTO export_jobs (id, org_id, status, filters) VALUES ($1,$2,$3,$4)", [
        id,
        req.authUser.orgId,
        "PENDING",
        JSON.stringify(parsed.data.filters)
    ]);
    await export_queue_1.exportQueue.add("generate-export", { exportJobId: id });
    await (0, audit_service_1.createAuditLog)({
        orgId: req.authUser.orgId,
        actorId: req.authUser.userId,
        action: "EXPORT_DATA"
    });
    res.status(202).json({ jobId: id, status: "PENDING" });
}
async function getAdminStats(req, res) {
    const orgId = req.authUser.orgId;
    const [categoryCounts, monthlyCounts, resolutionTime, openClosed, medianResolution, perInvestigator] = await Promise.all([
        db_1.pool.query("SELECT category, COUNT(*)::int AS count FROM complaints WHERE org_id = $1 GROUP BY category ORDER BY category", [orgId]),
        db_1.pool.query("SELECT TO_CHAR(created_at, 'YYYY-MM') AS month, COUNT(*)::int AS count FROM complaints WHERE org_id = $1 GROUP BY month ORDER BY month", [orgId]),
        db_1.pool.query(`SELECT AVG(EXTRACT(EPOCH FROM (cu.created_at - c.created_at))/3600)::numeric(10,2) AS avg_resolution_hours
       FROM complaints c
       JOIN complaint_updates cu ON cu.complaint_id = c.id
       WHERE c.org_id = $1 AND c.complaint_status IN ('RESOLVED','DISMISSED')`, [orgId]),
        db_1.pool.query(`SELECT
         COUNT(*) FILTER (WHERE complaint_status IN ('SUBMITTED','UNDER_REVIEW','INVESTIGATING'))::int AS open_cases,
         COUNT(*) FILTER (WHERE complaint_status IN ('RESOLVED','DISMISSED'))::int AS closed_cases
       FROM complaints WHERE org_id = $1`, [orgId]),
        db_1.pool.query(`SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (cu.created_at - c.created_at))/3600)::numeric(10,2) AS median_resolution_hours
       FROM complaints c
       JOIN complaint_updates cu ON cu.complaint_id = c.id
       WHERE c.org_id = $1 AND c.complaint_status IN ('RESOLVED','DISMISSED')`, [orgId]),
        db_1.pool.query(`SELECT actor_id AS investigator_id, COUNT(*)::int AS handled
       FROM org_audit_logs
       WHERE org_id = $1 AND action = 'UPDATE_COMPLAINT' AND actor_id IS NOT NULL
       GROUP BY actor_id
       ORDER BY handled DESC`, [orgId])
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
