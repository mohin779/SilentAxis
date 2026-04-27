import { Queue } from "bullmq";
import { env } from "../config/env";
import { redisQueue } from "../config/redis";

export const EXPORT_QUEUE_NAME = "export-jobs";

export interface ExportJobPayload {
  exportJobId: string;
}

let exportQueue: Queue<ExportJobPayload> | null = null;

function getExportQueue(): Queue<ExportJobPayload> | null {
  const enabled = process.env.NODE_ENV === "production" && Boolean(env.redisUrl);
  if (!enabled) return null;
  if (!exportQueue) {
    exportQueue = new Queue<ExportJobPayload>(EXPORT_QUEUE_NAME, {
      connection: redisQueue
    });
  }
  return exportQueue;
}

export async function enqueueExportJob(payload: ExportJobPayload): Promise<void> {
  const q = getExportQueue();
  if (!q) return;
  await q.add("generate-export", payload);
}
