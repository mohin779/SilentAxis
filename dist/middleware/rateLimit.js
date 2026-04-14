"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiRateLimit = apiRateLimit;
const redis_1 = require("../config/redis");
async function apiRateLimit(req, res, next) {
    const key = `ratelimit:${req.ip}`;
    const now = Date.now();
    const windowStart = now - 60_000;
    try {
        await redis_1.redis.zremrangebyscore(key, 0, windowStart);
        await redis_1.redis.zadd(key, now, `${now}-${Math.random().toString(36).slice(2)}`);
        const count = await redis_1.redis.zcard(key);
        await redis_1.redis.expire(key, 61);
        if (count > 60) {
            res.status(429).json({ error: "Too many requests" });
            return;
        }
        next();
    }
    catch {
        res.status(503).json({ error: "Rate limiting service unavailable" });
    }
}
