import { NextFunction, Request, Response } from "express";
import { redis } from "../config/redis";

export async function apiRateLimit(req: Request, res: Response, next: NextFunction): Promise<void> {
  const key = `ratelimit:${req.ip}`;
  const now = Date.now();
  const windowStart = now - 60_000;

  try {
    await redis.zremrangebyscore(key, 0, windowStart);
    await redis.zadd(key, now, `${now}-${Math.random().toString(36).slice(2)}`);
    const count = await redis.zcard(key);
    await redis.expire(key, 61);

    if (count > 60) {
      res.status(429).json({ error: "Too many requests" });
      return;
    }
    next();
  } catch {
    res.status(503).json({ error: "Rate limiting service unavailable" });
  }
}
