import crypto from "crypto";
import nodemailer from "nodemailer";
import { v4 as uuidv4 } from "uuid";
import { pool } from "../../config/db";
import { env } from "../../config/env";
import { sha256 } from "../../utils/crypto/hashing";

let otpSchemaEnsured = false;

async function ensureOtpSchema(): Promise<void> {
  if (otpSchemaEnsured) return;

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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS otp_challenges (
      id UUID PRIMARY KEY,
      org_id UUID NOT NULL REFERENCES organizations(id),
      employee_identifier TEXT NOT NULL,
      otp_hash TEXT NOT NULL,
      attempts INT NOT NULL DEFAULT 0,
      expires_at TIMESTAMPTZ NOT NULL,
      verified_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS otp_verification_receipts (
      receipt_hash TEXT PRIMARY KEY,
      org_id UUID NOT NULL REFERENCES organizations(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL
    )
  `);

  await pool.query("CREATE INDEX IF NOT EXISTS otp_challenges_org_expires_idx ON otp_challenges (org_id, expires_at DESC)");
  await pool.query(
    "CREATE INDEX IF NOT EXISTS otp_verification_receipts_expires_idx ON otp_verification_receipts (expires_at DESC)"
  );

  otpSchemaEnsured = true;
}

function randomOtp6(): string {
  return String(crypto.randomInt(0, 1000000)).padStart(6, "0");
}

function hashOtp(challengeId: string, otp: string): string {
  return sha256(`${challengeId}:${otp}:${env.jwtSecret}`);
}

function hashReceipt(receipt: string): string {
  return sha256(`otp-receipt:${receipt}:${env.jwtSecret}`);
}

async function sendOtpEmail(to: string, otp: string): Promise<void> {
  // MVP-friendly: if SMTP not configured, behave as "sent" without logging the OTP.
  if (!process.env.SMTP_HOST) return;

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: false,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? "" }
      : undefined
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? "no-reply@silentaxis.local",
    to,
    subject: "Your SilentAxis verification code",
    text: `Your verification code is: ${otp}\n\nThis code expires in 10 minutes.`
  });
}

export async function startOtpChallenge(input: {
  orgId: string;
  employeeIdentifier: string;
}): Promise<{ challengeId: string; devOtp?: string }> {
  await ensureOtpSchema();
  const employee = await pool.query(
    "SELECT official_email FROM org_employees WHERE org_id = $1 AND employee_identifier = $2",
    [input.orgId, input.employeeIdentifier]
  );
  if (!employee.rowCount) {
    throw new Error("Unknown employee identifier");
  }

  const challengeId = uuidv4();
  const otp = randomOtp6();
  const otpHash = hashOtp(challengeId, otp);
  await pool.query(
    "INSERT INTO otp_challenges (id, org_id, employee_identifier, otp_hash, attempts, expires_at) VALUES ($1,$2,$3,$4,0,NOW() + INTERVAL '10 minutes')",
    [challengeId, input.orgId, input.employeeIdentifier, otpHash]
  );

  await sendOtpEmail(employee.rows[0].official_email as string, otp);
  const showDevOtp = process.env.DEV_SHOW_OTP === "true";
  return showDevOtp ? { challengeId, devOtp: otp } : { challengeId };
}

export async function verifyOtpChallenge(challengeId: string, otp: string): Promise<boolean> {
  await ensureOtpSchema();
  const row = await pool.query(
    "SELECT id, otp_hash, attempts, expires_at, verified_at FROM otp_challenges WHERE id = $1",
    [challengeId]
  );
  if (!row.rowCount) throw new Error("Challenge not found");
  const ch = row.rows[0];
  if (ch.verified_at) return true;
  if (new Date(ch.expires_at).getTime() < Date.now()) throw new Error("OTP expired");
  if ((ch.attempts as number) >= 5) throw new Error("Too many attempts");

  const expected = ch.otp_hash as string;
  const got = hashOtp(challengeId, otp);
  const ok = crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(got));
  await pool.query("UPDATE otp_challenges SET attempts = attempts + 1 WHERE id = $1", [challengeId]);
  if (!ok) return false;

  await pool.query("UPDATE otp_challenges SET verified_at = NOW() WHERE id = $1", [challengeId]);
  return true;
}

export function deriveDeterministicIdentity(email: string): string {
  return sha256(`${email.trim().toLowerCase()}:${env.identityServerSecret}`);
}

export function generateIdentityTrapdoor(): string {
  return crypto.randomBytes(31).toString("hex");
}

export function createCommitment(identityNullifier: string, identityTrapdoor: string): string {
  return sha256(`${identityNullifier}:${identityTrapdoor}`);
}

export async function getChallengeOfficialEmail(challengeId: string): Promise<string> {
  await ensureOtpSchema();
  const row = await pool.query(
    `SELECT oe.official_email
     FROM otp_challenges oc
     JOIN org_employees oe
       ON oe.org_id = oc.org_id
      AND oe.employee_identifier = oc.employee_identifier
     WHERE oc.id = $1
     LIMIT 1`,
    [challengeId]
  );
  if (!row.rowCount) {
    throw new Error("Challenge not found");
  }
  return row.rows[0].official_email as string;
}

export async function issueEligibilityReceipt(challengeId: string): Promise<{ receipt: string; orgId: string }> {
  await ensureOtpSchema();
  const row = await pool.query("SELECT org_id, employee_identifier, verified_at FROM otp_challenges WHERE id = $1", [challengeId]);
  if (!row.rowCount) throw new Error("Challenge not found");
  if (!row.rows[0].verified_at) throw new Error("OTP not verified");

  const receipt = crypto.randomBytes(32).toString("hex");
  const receiptHash = hashReceipt(receipt);

  await pool.query(
    "INSERT INTO otp_verification_receipts (receipt_hash, org_id, expires_at) VALUES ($1,$2,NOW() + INTERVAL '20 minutes')",
    [receiptHash, row.rows[0].org_id]
  );

  await pool.query("DELETE FROM otp_challenges WHERE id = $1", [challengeId]);

  return { receipt, orgId: row.rows[0].org_id as string };
}

export async function consumeEligibilityReceipt(receipt: string): Promise<{ orgId: string }> {
  await ensureOtpSchema();
  const receiptHash = hashReceipt(receipt);
  const row = await pool.query(
    "SELECT receipt_hash, org_id, expires_at FROM otp_verification_receipts WHERE receipt_hash = $1",
    [receiptHash]
  );
  if (!row.rowCount) throw new Error("Invalid eligibility receipt");
  const t = row.rows[0];
  if (new Date(t.expires_at).getTime() < Date.now()) throw new Error("Token expired");
  await pool.query("DELETE FROM otp_verification_receipts WHERE receipt_hash = $1", [receiptHash]);
  return { orgId: t.org_id as string };
}

