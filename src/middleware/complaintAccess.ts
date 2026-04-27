import { NextFunction, Response } from "express";
import { AuthRequest } from "./auth";

export async function requireComplaintAccess(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const anonSession = (req as any).session?.anonymousComplaint as { orgId?: string } | undefined;
  if (!anonSession?.orgId) {
    res.status(401).json({ error: "Anonymous complaint access not established. Verify OTP first." });
    return;
  }

  req.authUser = {
    userId: "ANON_SESSION",
    email: "anon@silentaxis.local",
    orgId: anonSession.orgId,
    role: "EMPLOYEE",
    sessionId: `anon-${anonSession.orgId}`
  };
  next();
}

