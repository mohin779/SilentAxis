import crypto from "crypto";
import nodemailer from "nodemailer";
import { v4 as uuidv4 } from "uuid";
import { pool } from "../../config/db";
import { env } from "../../config/env";
import { sha256 } from "../../utils/crypto/hashing";

function randomOtp6(): string {
  return String(crypto.randomInt(0, 1000000)).padStart(6, "0");
}

function hashOtp(challengeId: string, otp: string): string {
  return sha256(`${challengeId}:${otp}:${env.jwtSecret}`);
}

function hashToken(token: string): string {
  return sha256(`anon-token:${token}:${env.jwtSecret}`);
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
}): Promise<{ challengeId: string }> {
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
  return { challengeId };
}

export async function verifyOtpChallenge(challengeId: string, otp: string): Promise<boolean> {
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

export async function issueAnonymousToken(challengeId: string): Promise<string> {
  // Read org_id but DO NOT store employee_identifier in token table.
  const row = await pool.query("SELECT org_id, verified_at FROM otp_challenges WHERE id = $1", [challengeId]);
  if (!row.rowCount) throw new Error("Challenge not found");
  if (!row.rows[0].verified_at) throw new Error("OTP not verified");

  const token = crypto.randomBytes(32).toString("hex"); // 256-bit
  const tokenHash = hashToken(token);

  await pool.query(
    "INSERT INTO anonymous_tokens (token_hash, org_id, expires_at, uses_remaining) VALUES ($1,$2,NOW() + INTERVAL '30 minutes',1)",
    [tokenHash, row.rows[0].org_id]
  );

  // Identity link removal: delete challenge so DB no longer links identifier -> verified session.
  await pool.query("DELETE FROM otp_challenges WHERE id = $1", [challengeId]);

  return token;
}

export async function consumeAnonymousToken(token: string): Promise<{ orgId: string }> {
  const tokenHash = hashToken(token);
  const row = await pool.query(
    "SELECT token_hash, org_id, expires_at, uses_remaining FROM anonymous_tokens WHERE token_hash = $1",
    [tokenHash]
  );
  if (!row.rowCount) throw new Error("Invalid token");
  const t = row.rows[0];
  if (new Date(t.expires_at).getTime() < Date.now()) throw new Error("Token expired");
  if ((t.uses_remaining as number) <= 0) throw new Error("Token already used");

  await pool.query("UPDATE anonymous_tokens SET uses_remaining = uses_remaining - 1 WHERE token_hash = $1", [
    tokenHash
  ]);
  return { orgId: t.org_id as string };
}

