import { v4 as uuidv4 } from "uuid";
import { pool } from "../../config/db";
import { sha256 } from "../../utils/crypto/hashing";

export async function createAuditLog(params: {
  orgId: string;
  actorId: string;
  action:
    | "VIEW_TIMELINE"
    | "UPDATE_COMPLAINT"
    | "EXPORT_DATA"
    | "APPROVE_COMPLAINT"
    | "REJECT_COMPLAINT"
    | "CREATE_COMPLAINT"
    | "VIEW_COMPLAINT"
    | "RESOLVE_COMPLAINT";
  complaintId?: string;
}): Promise<void> {
  const prev = await pool.query(
    "SELECT hash FROM org_audit_logs WHERE org_id = $1 ORDER BY timestamp DESC LIMIT 1",
    [params.orgId]
  );
  const previousHash = (prev.rowCount ? (prev.rows[0].hash as string) : null) as string | null;
  const event = {
    orgId: params.orgId,
    actorId: params.actorId,
    action: params.action,
    complaintId: params.complaintId ?? null,
    timestamp: new Date().toISOString()
  };
  const hash = sha256(`${previousHash ?? ""}:${JSON.stringify(event)}`);
  await pool.query(
    "INSERT INTO org_audit_logs (id, org_id, actor_id, action, complaint_id, previous_hash, hash) VALUES ($1,$2,$3,$4,$5,$6,$7)",
    [uuidv4(), params.orgId, params.actorId, params.action, params.complaintId ?? null, previousHash, hash]
  );
}
