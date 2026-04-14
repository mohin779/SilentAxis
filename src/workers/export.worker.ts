import fs from "fs/promises";
import path from "path";
import { Job, Worker } from "bullmq";
import { pool } from "../config/db";
import { redis } from "../config/redis";
import { EXPORT_QUEUE_NAME, ExportJobPayload } from "../queues/export.queue";

async function processExportJob(job: Job<ExportJobPayload>): Promise<void> {
  const exportRow = await pool.query("SELECT id, org_id, filters FROM export_jobs WHERE id = $1", [
    job.data.exportJobId
  ]);
  if (!exportRow.rowCount) return;

  const current = exportRow.rows[0] as { id: string; org_id: string; filters: { category?: string } };
  try {
    await pool.query("UPDATE export_jobs SET status = 'PROCESSING', updated_at = NOW() WHERE id = $1", [
      current.id
    ]);
    const categoryFilter = current.filters?.category ? " AND category = $2" : "";
    const complaints = await pool.query(
      `SELECT id, encrypted_data, category, complaint_status, created_at
       FROM complaints
       WHERE org_id = $1${categoryFilter}
       ORDER BY created_at DESC`,
      current.filters?.category ? [current.org_id, current.filters.category] : [current.org_id]
    );
    const rows = complaints.rows.map(
      (r: {
        id: string;
        encrypted_data: string;
        category: string;
        complaint_status: string;
        created_at: Date;
      }) =>
        `${r.id},${r.encrypted_data},${r.category},${r.complaint_status},${r.created_at.toISOString()}`
    );
    const csv = ["id,encrypted_data,category,complaint_status,created_at", ...rows].join("\n");
    const folder = path.join(process.cwd(), "exports");
    await fs.mkdir(folder, { recursive: true });
    const filePath = path.join(folder, `${current.id}.csv`);
    await fs.writeFile(filePath, csv, "utf8");
    await pool.query(
      "UPDATE export_jobs SET status = 'COMPLETED', file_path = $1, updated_at = NOW() WHERE id = $2",
      [filePath, current.id]
    );
  } catch {
    await pool.query("UPDATE export_jobs SET status = 'FAILED', updated_at = NOW() WHERE id = $1", [current.id]);
  }
}

let exportWorker: Worker<ExportJobPayload> | undefined;

export async function startExportWorker(): Promise<void> {
  if (exportWorker) return;
  exportWorker = new Worker<ExportJobPayload>(EXPORT_QUEUE_NAME, processExportJob, {
    connection: redis
  });
}
