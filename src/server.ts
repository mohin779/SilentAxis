import { app } from "./app";
import { env } from "./config/env";
import { cleanupOldExportJobs } from "./workers/cleanup.worker";
import { startEvidenceScanWorker } from "./workers/evidenceScan.worker";
import { startExportWorker } from "./workers/export.worker";
import { startEscalationWorker } from "./workers/escalation.worker";
import { zkVerifier } from "./zk/verifier";

async function bootstrap() {
  await cleanupOldExportJobs();
  await zkVerifier.initialize();
  await startExportWorker();
  await startEvidenceScanWorker();
  startEscalationWorker();
  app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`SilentAxis backend running on port ${env.port}`);
  });
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Failed to start server", error);
  process.exit(1);
});
