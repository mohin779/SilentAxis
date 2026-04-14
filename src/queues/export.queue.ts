import { Queue } from "bullmq";
import { redis } from "../config/redis";

export const EXPORT_QUEUE_NAME = "export-jobs";

export interface ExportJobPayload {
  exportJobId: string;
}

export const exportQueue = new Queue<ExportJobPayload>(EXPORT_QUEUE_NAME, {
  connection: redis
});
