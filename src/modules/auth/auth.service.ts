import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { env } from "../../config/env";
import { Role } from "../../types";

const orgDomainMap: Record<string, { orgId: string; role: Role }> = {
  "employee@acme.com": { orgId: "11111111-1111-1111-1111-111111111111", role: "EMPLOYEE" },
  "admin@acme.com": { orgId: "11111111-1111-1111-1111-111111111111", role: "ORG_ADMIN" },
  "staff@acme.com": { orgId: "11111111-1111-1111-1111-111111111111", role: "ORG_STAFF" }
};

export function loginWithMockSso(email: string): { token: string } {
  const entry = orgDomainMap[email.toLowerCase()];
  if (!entry) {
    throw new Error("User is not part of an allowed organization");
  }

  // Decoy enterprise portal model: login does not imply complaint intent.
  const sessionId = uuidv4();
  const token = jwt.sign(
    {
      userId: uuidv4(),
      email,
      orgId: entry.orgId,
      role: entry.role,
      sessionId
    },
    env.jwtSecret,
    { expiresIn: "1h" }
  );

  return { token };
}
