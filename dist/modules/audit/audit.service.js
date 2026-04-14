"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuditLog = createAuditLog;
const uuid_1 = require("uuid");
const db_1 = require("../../config/db");
async function createAuditLog(params) {
    await db_1.pool.query("INSERT INTO org_audit_logs (id, org_id, actor_id, action, complaint_id) VALUES ($1,$2,$3,$4,$5)", [(0, uuid_1.v4)(), params.orgId, params.actorId, params.action, params.complaintId ?? null]);
}
