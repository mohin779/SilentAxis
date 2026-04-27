import { NextFunction, Request, Response } from "express";
import { redisApi } from "../config/redis";
import { env } from "../config/env";

export async function apiRateLimit(req: Request, res: Response, next: NextFunction): Promise<void> {
  // Local/dev reliability: skip Redis-backed rate limiting outside production.
  // This prevents request hangs when Redis is unavailable or degraded.
  if (process.env.NODE_ENV !== "production" || !env.redisUrl) {
    next();
    return;
  }
  const key = `ratelimit:${req.ip}`;
  const now = Date.now();
  const windowStart = now - 60_000;

  try {
    await redisApi.zremrangebyscore(key, 0, windowStart);
    await redisApi.zadd(key, now, `${now}-${Math.random().toString(36).slice(2)}`);
    const count = await redisApi.zcard(key);
    await redisApi.expire(key, 61);

    if (count > 60) {
      res.status(429).json({ error: "Too many requests" });
      return;
    }
    next();
  } catch {
    // Fail-open to avoid hanging local development when Redis is down.
    next();
  }
}
