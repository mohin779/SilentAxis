"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuditLog = createAuditLog;
const uuid_1 = require("uuid");
const db_1 = require("../../config/db");
const hashing_1 = require("../../utils/crypto/hashing");
async function createAuditLog(params) {
    const prev = await db_1.pool.query("SELECT hash FROM org_audit_logs WHERE org_id = $1 ORDER BY timestamp DESC LIMIT 1", [params.orgId]);
    const previousHash = (prev.rowCount ? prev.rows[0].hash : null);
    const event = {
        orgId: params.orgId,
        actorId: params.actorId,
        action: params.action,
        complaintId: params.complaintId ?? null,
        timestamp: new Date().toISOString()
    };
    const hash = (0, hashing_1.sha256)(`${previousHash ?? ""}:${JSON.stringify(event)}`);
    await db_1.pool.query("INSERT INTO org_audit_logs (id, org_id, actor_id, action, complaint_id, previous_hash, hash) VALUES ($1,$2,$3,$4,$5,$6,$7)", [(0, uuid_1.v4)(), params.orgId, params.actorId, params.action, params.complaintId ?? null, previousHash, hash]);
}
