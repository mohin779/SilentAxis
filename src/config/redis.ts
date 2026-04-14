import IORedis from "ioredis";
import { env } from "./env";

export const redis = new IORedis(env.redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true
});

redis.on("error", () => {
  // Intentionally avoid logging connection metadata.
});
