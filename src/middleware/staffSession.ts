import { NextFunction, Request, Response } from "express";

export type StaffRole = "ORG_ADMIN" | "ORG_STAFF" | "HR" | "MANAGER" | "REGIONAL_OFFICER";

export interface StaffSessionUser {
  userId: string;
  orgId: string;
  email: string;
  role: StaffRole;
}

declare module "express-session" {
  interface SessionData {
    staff?: StaffSessionUser;
  }
}

export function requireStaffSession(req: Request, res: Response, next: NextFunction): void {
  if (!req.session?.staff) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

export function requireStaffRole(roles: StaffRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const staff = req.session?.staff;
    if (!staff || !roles.includes(staff.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}

