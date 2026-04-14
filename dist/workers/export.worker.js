"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startExportWorker = startExportWorker;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const bullmq_1 = require("bullmq");
const db_1 = require("../config/db");
const redis_1 = require("../config/redis");
const export_queue_1 = require("../queues/export.queue");
async function processExportJob(job) {
    const exportRow = await db_1.pool.query("SELECT id, org_id, filters FROM export_jobs WHERE id = $1", [
        job.data.exportJobId
    ]);
    if (!exportRow.rowCount)
        return;
    const current = exportRow.rows[0];
    try {
        await db_1.pool.query("UPDATE export_jobs SET status = 'PROCESSING', updated_at = NOW() WHERE id = $1", [
            current.id
        ]);
        const categoryFilter = current.filters?.category ? " AND category = $2" : "";
        const complaints = await db_1.pool.query(`SELECT id, encrypted_data, category, complaint_status, created_at
       FROM complaints
       WHERE org_id = $1${categoryFilter}
       ORDER BY created_at DESC`, current.filters?.category ? [current.org_id, current.filters.category] : [current.org_id]);
        const rows = complaints.rows.map((r) => `${r.id},${r.encrypted_data},${r.category},${r.complaint_status},${r.created_at.toISOString()}`);
        const csv = ["id,encrypted_data,category,complaint_status,created_at", ...rows].join("\n");
        const folder = path_1.default.join(process.cwd(), "exports");
        await promises_1.default.mkdir(folder, { recursive: true });
        const filePath = path_1.default.join(folder, `${current.id}.csv`);
        await promises_1.default.writeFile(filePath, csv, "utf8");
        await db_1.pool.query("UPDATE export_jobs SET status = 'COMPLETED', file_path = $1, updated_at = NOW() WHERE id = $2", [filePath, current.id]);
    }
    catch {
        await db_1.pool.query("UPDATE export_jobs SET status = 'FAILED', updated_at = NOW() WHERE id = $1", [current.id]);
    }
}
let exportWorker;
async function startExportWorker() {
    if (exportWorker)
        return;
    exportWorker = new bullmq_1.Worker(export_queue_1.EXPORT_QUEUE_NAME, processExportJob, {
        connection: redis_1.redis
    });
}
