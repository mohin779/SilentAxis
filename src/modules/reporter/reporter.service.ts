import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import { pool } from "../../config/db";
import { encrypt, decrypt } from "../../utils/crypto/encryption";

function encryptWithConversationKey(message: string, key: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(key), iv);
  const encrypted = Buffer.concat([cipher.update(message, "utf8"), cipher.final()]);
  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}

async function ensureConversationKeys(complaintId: string): Promise<string> {
  const existing = await pool.query(
    "SELECT encrypted_key_for_reporter FROM conversation_keys WHERE complaint_id = $1",
    [complaintId]
  );
  if (existing.rowCount) {
    return decrypt(existing.rows[0].encrypted_key_for_reporter as string);
  }
  const conversationKey = crypto.randomBytes(32).toString("hex");
  const encryptedForReporter = await encrypt(conversationKey);
  const encryptedForInvestigator = await encrypt(conversationKey);
  await pool.query(
    "INSERT INTO conversation_keys (complaint_id, encrypted_key_for_reporter, encrypted_key_for_investigator) VALUES ($1,$2,$3)",
    [complaintId, encryptedForReporter, encryptedForInvestigator]
  );
  return conversationKey;
}

export async function reporterLogin(complaintId: string, secret: string): Promise<boolean> {
  const row = await pool.query(
    "SELECT complaint_id, reporter_secret FROM reporter_sessions WHERE complaint_id = $1",
    [complaintId]
  );
  if (!row.rowCount) return false;
  const stored = row.rows[0].reporter_secret as string;
  return (await decrypt(stored)) === secret;
}

export async function createReporterSession(complaintId: string, secret: string): Promise<void> {
  await ensureConversationKeys(complaintId);
  const encryptedSecret = await encrypt(secret);
  await pool.query(
    "INSERT INTO reporter_sessions (complaint_id, reporter_secret) VALUES ($1,$2) ON CONFLICT (complaint_id) DO NOTHING",
    [complaintId, encryptedSecret]
  );
}

export async function addReporterMessage(input: {
  complaintId: string;
  senderType: "reporter" | "investigator";
  message: string;
}): Promise<string> {
  const id = uuidv4();
  const conversationKey = await ensureConversationKeys(input.complaintId);
  const encryptedMessage = encryptWithConversationKey(input.message, conversationKey);
  await pool.query(
    "INSERT INTO reporter_messages (id, complaint_id, sender_type, encrypted_message) VALUES ($1,$2,$3,$4)",
    [id, input.complaintId, input.senderType, encryptedMessage]
  );
  return id;
}

export async function getReporterMessages(complaintId: string) {
  const rows = await pool.query(
    "SELECT id, complaint_id, sender_type, encrypted_message, created_at FROM reporter_messages WHERE complaint_id = $1 ORDER BY created_at ASC",
    [complaintId]
  );
  return rows.rows;
}
