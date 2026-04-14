import { NextFunction, Response } from "express";
import { AuthRequest } from "./auth";

/**
 * Security boundary:
 * Authentication is used only for access, not for attribution.
 * This middleware drops user-level identifiers before complaint logic executes.
 */
export function enforceIdentityDrop(req: AuthRequest, _res: Response, next: NextFunction): void {
  if (req.authUser) {
    req.authUser = {
      userId: "ANON_DROPPED",
      email: "ANON_DROPPED",
      orgId: req.authUser.orgId,
      role: req.authUser.role,
      sessionId: req.authUser.sessionId
    };
  }
  next();
}
