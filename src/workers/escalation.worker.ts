import { pool } from "../config/db";
import { v4 as uuidv4 } from "uuid";

export async function runEscalationOnce(): Promise<void> {
  // 48h timeout escalation if complaint is still not progressed.
  const stale = await pool.query(
    `SELECT c.id, c.org_id
     FROM complaints c
     WHERE c.complaint_status IN ('SUBMITTED','UNDER_REVIEW')
       AND c.created_at <= NOW() - INTERVAL '48 hours'`
  );

  for (const row of stale.rows) {
    await pool.query(
      "INSERT INTO complaint_escalations (id, complaint_id, org_id, reason) VALUES ($1,$2,$3,'TIMEOUT_48H') ON CONFLICT (complaint_id, reason) DO NOTHING",
      [uuidv4(), row.id, row.org_id]
    );
    await pool.query(
      "INSERT INTO complaint_updates (id, complaint_id, message) VALUES ($1,$2,$3)",
      [uuidv4(), row.id, "System auto-escalation triggered (no action within 48 hours)."]
    );
  }

  // Basic pattern detection: same org + same category in last 30 days, count >= 3 => escalate newest.
  const patterns = await pool.query(
    `SELECT org_id, category, COUNT(*)::int AS cnt
     FROM complaints
     WHERE created_at >= NOW() - INTERVAL '30 days'
     GROUP BY org_id, category
     HAVING COUNT(*) >= 3`
  );

  for (const p of patterns.rows) {
    const newest = await pool.query(
      `SELECT id FROM complaints
       WHERE org_id = $1 AND category = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [p.org_id, p.category]
    );
    if (!newest.rowCount) continue;
    const complaintId = newest.rows[0].id as string;
    await pool.query(
      "INSERT INTO complaint_escalations (id, complaint_id, org_id, reason) VALUES ($1,$2,$3,'PATTERN_MATCH') ON CONFLICT (complaint_id, reason) DO NOTHING",
      [uuidv4(), complaintId, p.org_id]
    );
    await pool.query(
      "INSERT INTO complaint_updates (id, complaint_id, message) VALUES ($1,$2,$3)",
      [uuidv4(), complaintId, `System escalation: repeated pattern detected for category '${p.category}'.`]
    );
  }
}

export function startEscalationWorker(): void {
  // Simple in-process scheduler; in production this should be a dedicated worker/cron.
  setInterval(() => {
    runEscalationOnce().catch(() => {
      // Intentionally avoid logging complaint/org details.
    });
  }, 60_000);
}

