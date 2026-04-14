"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enforceDeviceBinding = enforceDeviceBinding;
const redis_1 = require("../config/redis");
/**
 * Soft device binding:
 * first request binds a session to a fingerprint header;
 * later requests must match to reduce session theft misuse.
 */
function enforceDeviceBinding(req, res, next) {
    if (!req.authUser) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    if (req.isOnionClient) {
        next();
        return;
    }
    const fingerprint = req.header("x-device-fingerprint");
    if (!fingerprint) {
        res.status(400).json({ error: "Missing x-device-fingerprint header" });
        return;
    }
    const key = `device:${req.authUser.sessionId}`;
    redis_1.redis
        .get(key)
        .then(async (existing) => {
        if (!existing) {
            await redis_1.redis.set(key, fingerprint, "EX", 3600);
            next();
            return;
        }
        if (existing !== fingerprint) {
            res.status(403).json({ error: "Device binding mismatch" });
            return;
        }
        await redis_1.redis.expire(key, 3600);
        next();
    })
        .catch(() => {
        res.status(503).json({ error: "Device binding service unavailable" });
    });
}
