import fs from "fs/promises";
import { Job, Worker } from "bullmq";
import { pool } from "../config/db";
import { redisQueue } from "../config/redis";
import { EVIDENCE_SCAN_QUEUE_NAME, EvidenceScanJobPayload } from "../queues/evidenceScan.queue";

const maxFileBytes = 10 * 1024 * 1024;
const suspiciousExtensions = [".exe", ".dll", ".bat", ".cmd", ".js"];

async function processEvidenceScan(job: Job<EvidenceScanJobPayload>): Promise<void> {
  const row = await pool.query("SELECT id, file_path FROM complaint_evidence WHERE id = $1", [job.data.evidenceId]);
  if (!row.rowCount) return;
  const current = row.rows[0] as { id: string; file_path: string };
  try {
    const path = current.file_path;
    if (path.startsWith("s3://")) {
      await pool.query("UPDATE complaint_evidence SET scan_status = 'SAFE', scan_reason = $1 WHERE id = $2", [
        "Remote object accepted by policy",
        current.id
      ]);
      return;
    }
    const stats = await fs.stat(path);
    const lower = path.toLowerCase();
    const suspiciousExt = suspiciousExtensions.some((ext) => lower.endsWith(ext));
    if (suspiciousExt) {
      await pool.query("UPDATE complaint_evidence SET scan_status = 'REJECTED', scan_reason = $1 WHERE id = $2", [
        "Suspicious binary extension",
        current.id
      ]);
      return;
    }
    if (stats.size > maxFileBytes) {
      await pool.query("UPDATE complaint_evidence SET scan_status = 'REJECTED', scan_reason = $1 WHERE id = $2", [
        "File exceeds allowed size",
        current.id
      ]);
      return;
    }
    await pool.query("UPDATE complaint_evidence SET scan_status = 'SAFE', scan_reason = NULL WHERE id = $1", [
      current.id
    ]);
  } catch {
    await pool.query("UPDATE complaint_evidence SET scan_status = 'REJECTED', scan_reason = $1 WHERE id = $2", [
      "Unable to scan file",
      current.id
    ]);
  }
}

let evidenceWorker: Worker<EvidenceScanJobPayload> | undefined;

export async function startEvidenceScanWorker(): Promise<void> {
  if (evidenceWorker) return;
  evidenceWorker = new Worker<EvidenceScanJobPayload>(EVIDENCE_SCAN_QUEUE_NAME, processEvidenceScan, {
    connection: redisQueue
  });
}
