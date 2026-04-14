import fs from "fs/promises";
import { pool } from "../config/db";

export async function cleanupOldExportJobs(): Promise<void> {
  const completed = await pool.query(
    "SELECT id, file_path FROM export_jobs WHERE status = 'COMPLETED' AND updated_at < NOW() - INTERVAL '7 days'"
  );
  const failed = await pool.query(
    "SELECT id, file_path FROM export_jobs WHERE status = 'FAILED' AND updated_at < NOW() - INTERVAL '3 days'"
  );
  for (const job of [...completed.rows, ...failed.rows]) {
    if (job.file_path) {
      try {
        await fs.unlink(job.file_path);
      } catch {
        // no-op
      }
    }
    await pool.query("DELETE FROM export_jobs WHERE id = $1", [job.id]);
  }
}
