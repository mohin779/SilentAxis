import { NextFunction, Response } from "express";
import { AuthRequest } from "./auth";

export function enforceOrgIsolation(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.authUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const routeOrgId = req.params.orgId;
  if (routeOrgId && routeOrgId !== req.authUser.orgId) {
    res.status(403).json({ error: "Forbidden: org isolation violation" });
    return;
  }
  next();
}
