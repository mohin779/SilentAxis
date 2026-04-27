export type Role = "EMPLOYEE" | "ORG_ADMIN" | "ORG_STAFF" | "HR" | "MANAGER" | "REGIONAL_OFFICER";

export interface AuthUser {
  userId: string;
  orgId: string;
  role: Role;
  email: string;
  sessionId: string;
}

export type ApprovalRole = "HR" | "MANAGER" | "REGIONAL_OFFICER";

export interface AnonymousContext {
  orgId: string;
  sessionId: string;
}
