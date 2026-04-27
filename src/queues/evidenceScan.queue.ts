import { Queue } from "bullmq";
import { env } from "../config/env";
import { redisQueue } from "../config/redis";

export const EVIDENCE_SCAN_QUEUE_NAME = "evidence-scan";

export interface EvidenceScanJobPayload {
  evidenceId: string;
}

let evidenceScanQueue: Queue<EvidenceScanJobPayload> | null = null;

function getEvidenceScanQueue(): Queue<EvidenceScanJobPayload> | null {
  const enabled = process.env.NODE_ENV === "production" && Boolean(env.redisUrl);
  if (!enabled) return null;
  if (!evidenceScanQueue) {
    evidenceScanQueue = new Queue<EvidenceScanJobPayload>(EVIDENCE_SCAN_QUEUE_NAME, {
      connection: redisQueue
    });
  }
  return evidenceScanQueue;
}

export async function enqueueEvidenceScanJob(payload: EvidenceScanJobPayload): Promise<void> {
  const q = getEvidenceScanQueue();
  if (!q) return;
  await q.add("scan-evidence", payload);
}
