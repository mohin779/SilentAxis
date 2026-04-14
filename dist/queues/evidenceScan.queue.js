"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evidenceScanQueue = exports.EVIDENCE_SCAN_QUEUE_NAME = void 0;
const bullmq_1 = require("bullmq");
const redis_1 = require("../config/redis");
exports.EVIDENCE_SCAN_QUEUE_NAME = "evidence-scan";
exports.evidenceScanQueue = new bullmq_1.Queue(exports.EVIDENCE_SCAN_QUEUE_NAME, {
    connection: redis_1.redis
});
