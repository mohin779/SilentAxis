import bcrypt from "bcryptjs";
import { pool } from "../../config/db";
import { StaffSessionUser } from "../../middleware/staffSession";

export async function staffLogin(email: string, password: string): Promise<StaffSessionUser> {
  const row = await pool.query(
    "SELECT id, org_id, email, role, password_hash FROM users WHERE email = $1 AND role IN ('ORG_ADMIN','ORG_STAFF','HR','MANAGER','REGIONAL_OFFICER')",
    [email.toLowerCase()]
  );
  if (!row.rowCount) throw new Error("Invalid credentials");
  const u = row.rows[0];
  if (!u.password_hash) throw new Error("Account missing password");
  const ok = await bcrypt.compare(password, u.password_hash as string);
  if (!ok) throw new Error("Invalid credentials");
  return {
    userId: u.id as string,
    orgId: u.org_id as string,
    email: u.email as string,
    role: u.role as StaffSessionUser["role"]
  };
}

