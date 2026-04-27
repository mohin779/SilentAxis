import IORedis from "ioredis";
import { env } from "./env";

// BullMQ requires `maxRetriesPerRequest: null` for blocking commands.
export const redisQueue = new IORedis(env.redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  lazyConnect: true,
  retryStrategy: () => null
});

// HTTP middleware should fail fast if Redis is down to avoid "hung" requests.
export const redisApi = new IORedis(env.redisUrl, {
  enableOfflineQueue: false,
  connectTimeout: 2000,
  maxRetriesPerRequest: 1,
  enableReadyCheck: true,
  lazyConnect: true,
  retryStrategy: () => null
});

redisQueue.on("error", () => {
  // Intentionally avoid logging connection metadata.
});

redisApi.on("error", () => {
  // Intentionally avoid logging connection metadata.
});
