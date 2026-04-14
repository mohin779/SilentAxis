export type Role = "EMPLOYEE" | "ORG_ADMIN" | "ORG_STAFF";

export interface AuthUser {
  userId: string;
  orgId: string;
  role: Role;
  email: string;
  sessionId: string;
}

export interface AnonymousContext {
  orgId: string;
  sessionId: string;
}
