import { v4 as uuidv4 } from "uuid";
import { pool } from "../../config/db";

export async function createAuditLog(params: {
  orgId: string;
  actorId: string;
  action: "VIEW_TIMELINE" | "UPDATE_COMPLAINT" | "EXPORT_DATA";
  complaintId?: string;
}): Promise<void> {
  await pool.query(
    "INSERT INTO org_audit_logs (id, org_id, actor_id, action, complaint_id) VALUES ($1,$2,$3,$4,$5)",
    [uuidv4(), params.orgId, params.actorId, params.action, params.complaintId ?? null]
  );
}
