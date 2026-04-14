"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportQueue = exports.EXPORT_QUEUE_NAME = void 0;
const bullmq_1 = require("bullmq");
const redis_1 = require("../config/redis");
exports.EXPORT_QUEUE_NAME = "export-jobs";
exports.exportQueue = new bullmq_1.Queue(exports.EXPORT_QUEUE_NAME, {
    connection: redis_1.redis
});
