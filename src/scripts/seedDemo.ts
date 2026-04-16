import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { pool } from "../config/db";

async function ensureSeedCompatibility(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS org_employees (
      id UUID PRIMARY KEY,
      org_id UUID NOT NULL REFERENCES organizations(id),
      employee_identifier TEXT NOT NULL,
      official_email TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (org_id, employee_identifier)
    )
  `);
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()");
  await pool.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_schema = 'public'
          AND table_name = 'users'
          AND constraint_type = 'CHECK'
          AND constraint_name = 'users_role_check'
      ) THEN
        ALTER TABLE users DROP CONSTRAINT users_role_check;
      END IF;
    END $$;
  `);
  await pool.query(`
    ALTER TABLE users
      ADD CONSTRAINT users_role_check
      CHECK (role IN ('EMPLOYEE', 'ORG_ADMIN', 'ORG_STAFF', 'HR', 'MANAGER', 'REGIONAL_OFFICER'))
  `);
}

async function upsertOrg(): Promise<string> {
  const orgId = "11111111-1111-1111-1111-111111111111";
  await pool.query("INSERT INTO organizations (id, name) VALUES ($1,$2) ON CONFLICT (id) DO NOTHING", [
    orgId,
    "Acme Corp"
  ]);
  return orgId;
}

async function upsertUser(params: { orgId: string; email: string; role: string; password: string }) {
  const passwordHash = await bcrypt.hash(params.password, 10);
  // Keep ID stable per email to simplify re-seeding.
  const existing = await pool.query("SELECT id FROM users WHERE email = $1", [params.email.toLowerCase()]);
  const id = existing.rowCount ? (existing.rows[0].id as string) : uuidv4();
  await pool.query(
    `INSERT INTO users (id, org_id, email, role, password_hash)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (email)
     DO UPDATE SET role = EXCLUDED.role, password_hash = EXCLUDED.password_hash, org_id = EXCLUDED.org_id`,
    [id, params.orgId, params.email.toLowerCase(), params.role, passwordHash]
  );
}

async function upsertEmployeeDirectory(params: { orgId: string; employeeIdentifier: string; officialEmail: string }) {
  await pool.query(
    `INSERT INTO org_employees (id, org_id, employee_identifier, official_email)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (org_id, employee_identifier)
     DO UPDATE SET official_email = EXCLUDED.official_email`,
    [uuidv4(), params.orgId, params.employeeIdentifier, params.officialEmail.toLowerCase()]
  );
}

async function main() {
  await ensureSeedCompatibility();
  const orgId = await upsertOrg();

  // Staff demo credentials (session-based login).
  await upsertUser({ orgId, email: "admin@acme.com", role: "ORG_ADMIN", password: "AdminPass!123" });
  await upsertUser({ orgId, email: "hr@acme.com", role: "HR", password: "HrPass!123" });
  await upsertUser({ orgId, email: "manager1@acme.com", role: "MANAGER", password: "ManagerPass!123" });
  await upsertUser({ orgId, email: "manager2@acme.com", role: "MANAGER", password: "ManagerPass!123" });
  await upsertUser({ orgId, email: "manager3@acme.com", role: "MANAGER", password: "ManagerPass!123" });
  await upsertUser({ orgId, email: "regional@acme.com", role: "REGIONAL_OFFICER", password: "RegionalPass!123" });

  // Employee directory for OTP routing (identity is NOT used past OTP).
  await upsertEmployeeDirectory({ orgId, employeeIdentifier: "employee123", officialEmail: "employee123@acme.com" });
  await upsertEmployeeDirectory({ orgId, employeeIdentifier: "employee456", officialEmail: "employee456@acme.com" });

  // eslint-disable-next-line no-console
  console.log("Seed complete.");
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });

