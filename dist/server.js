"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const env_1 = require("./config/env");
const cleanup_worker_1 = require("./workers/cleanup.worker");
const evidenceScan_worker_1 = require("./workers/evidenceScan.worker");
const export_worker_1 = require("./workers/export.worker");
const escalation_worker_1 = require("./workers/escalation.worker");
const verifier_1 = require("./zk/verifier");
async function bootstrap() {
    await (0, cleanup_worker_1.cleanupOldExportJobs)();
    await verifier_1.zkVerifier.initialize();
    await (0, export_worker_1.startExportWorker)();
    await (0, evidenceScan_worker_1.startEvidenceScanWorker)();
    (0, escalation_worker_1.startEscalationWorker)();
    app_1.app.listen(env_1.env.port, () => {
        // eslint-disable-next-line no-console
        console.log(`SilentAxis backend running on port ${env_1.env.port}`);
    });
}
bootstrap().catch((error) => {
    // eslint-disable-next-line no-console
    console.error("Failed to start server", error);
    process.exit(1);
});
