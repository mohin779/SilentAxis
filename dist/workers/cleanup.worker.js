"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupOldExportJobs = cleanupOldExportJobs;
const promises_1 = __importDefault(require("fs/promises"));
const db_1 = require("../config/db");
async function cleanupOldExportJobs() {
    const completed = await db_1.pool.query("SELECT id, file_path FROM export_jobs WHERE status = 'COMPLETED' AND updated_at < NOW() - INTERVAL '7 days'");
    const failed = await db_1.pool.query("SELECT id, file_path FROM export_jobs WHERE status = 'FAILED' AND updated_at < NOW() - INTERVAL '3 days'");
    for (const job of [...completed.rows, ...failed.rows]) {
        if (job.file_path) {
            try {
                await promises_1.default.unlink(job.file_path);
            }
            catch {
                // no-op
            }
        }
        await db_1.pool.query("DELETE FROM export_jobs WHERE id = $1", [job.id]);
    }
}
