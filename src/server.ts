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
  const enableBackgroundWorkers = process.env.NODE_ENV === "production" && Boolean(env.redisUrl);
  if (enableBackgroundWorkers) {
    await startExportWorker();
    await startEvidenceScanWorker();
    startEscalationWorker();
  }

  const server = app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`SilentAxis backend running on port ${env.port}`);
  });

  const shutdown = (signal: string) => {
    // eslint-disable-next-line no-console
    console.log(`Shutting down (${signal})...`);
    server.close(() => process.exit(0));
    // Hard-exit fallback if something is keeping the event loop alive.
    setTimeout(() => process.exit(0), 2000).unref();
  };
  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Failed to start server", error);
  process.exit(1);
});
