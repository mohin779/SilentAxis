import { NextFunction, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AuthRequest } from "./auth";
import { consumeAnonymousToken } from "../modules/auth/employeeOtp.service";

export async function requireComplaintAccess(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // Path 1: existing JWT flow (backward compatibility).
  try {
    req.authUser = jwt.verify(token, env.jwtSecret) as any;
    next();
    return;
  } catch {
    // Continue to anonymous token path.
  }

  // Path 2: anonymous token flow.
  try {
    const consumed = await consumeAnonymousToken(token);
    req.authUser = {
      userId: "ANON_TOKEN_USER",
      email: "ANON_TOKEN_USER",
      orgId: consumed.orgId,
      role: "EMPLOYEE",
      sessionId: `anon-${Date.now()}`
    };
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

