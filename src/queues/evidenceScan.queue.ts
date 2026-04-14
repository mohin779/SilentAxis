import { Queue } from "bullmq";
import { redis } from "../config/redis";

export const EVIDENCE_SCAN_QUEUE_NAME = "evidence-scan";

export interface EvidenceScanJobPayload {
  evidenceId: string;
}

export const evidenceScanQueue = new Queue<EvidenceScanJobPayload>(EVIDENCE_SCAN_QUEUE_NAME, {
  connection: redis
});
