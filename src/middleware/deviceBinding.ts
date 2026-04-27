import { NextFunction, Response } from "express";
import { redisApi } from "../config/redis";
import { AuthRequest } from "./auth";
import { TorAwareRequest } from "./torHeaders";

/**
 * Soft device binding:
 * first request binds a session to a fingerprint header;
 * later requests must match to reduce session theft misuse.
 */
export function enforceDeviceBinding(req: AuthRequest & TorAwareRequest, res: Response, next: NextFunction): void {
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
  redisApi
    .get(key)
    .then(async (existing) => {
      if (!existing) {
        await redisApi.set(key, fingerprint, "EX", 3600);
        next();
        return;
      }
      if (existing !== fingerprint) {
        res.status(403).json({ error: "Device binding mismatch" });
        return;
      }
      await redisApi.expire(key, 3600);
      next();
    })
    .catch(() => {
      res.status(503).json({ error: "Device binding service unavailable" });
    });
}
