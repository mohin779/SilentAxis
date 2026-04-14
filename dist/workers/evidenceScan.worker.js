"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startEvidenceScanWorker = startEvidenceScanWorker;
const promises_1 = __importDefault(require("fs/promises"));
const bullmq_1 = require("bullmq");
const db_1 = require("../config/db");
const redis_1 = require("../config/redis");
const evidenceScan_queue_1 = require("../queues/evidenceScan.queue");
const maxFileBytes = 10 * 1024 * 1024;
const suspiciousExtensions = [".exe", ".dll", ".bat", ".cmd", ".js"];
async function processEvidenceScan(job) {
    const row = await db_1.pool.query("SELECT id, file_path FROM complaint_evidence WHERE id = $1", [job.data.evidenceId]);
    if (!row.rowCount)
        return;
    const current = row.rows[0];
    try {
        const path = current.file_path;
        if (path.startsWith("s3://")) {
            await db_1.pool.query("UPDATE complaint_evidence SET scan_status = 'SAFE', scan_reason = $1 WHERE id = $2", [
                "Remote object accepted by policy",
                current.id
            ]);
            return;
        }
        const stats = await promises_1.default.stat(path);
        const lower = path.toLowerCase();
        const suspiciousExt = suspiciousExtensions.some((ext) => lower.endsWith(ext));
        if (suspiciousExt) {
            await db_1.pool.query("UPDATE complaint_evidence SET scan_status = 'REJECTED', scan_reason = $1 WHERE id = $2", [
                "Suspicious binary extension",
                current.id
            ]);
            return;
        }
        if (stats.size > maxFileBytes) {
            await db_1.pool.query("UPDATE complaint_evidence SET scan_status = 'REJECTED', scan_reason = $1 WHERE id = $2", [
                "File exceeds allowed size",
                current.id
            ]);
            return;
        }
        await db_1.pool.query("UPDATE complaint_evidence SET scan_status = 'SAFE', scan_reason = NULL WHERE id = $1", [
            current.id
        ]);
    }
    catch {
        await db_1.pool.query("UPDATE complaint_evidence SET scan_status = 'REJECTED', scan_reason = $1 WHERE id = $2", [
            "Unable to scan file",
            current.id
        ]);
    }
}
let evidenceWorker;
async function startEvidenceScanWorker() {
    if (evidenceWorker)
        return;
    evidenceWorker = new bullmq_1.Worker(evidenceScan_queue_1.EVIDENCE_SCAN_QUEUE_NAME, processEvidenceScan, {
        connection: redis_1.redis
    });
}
