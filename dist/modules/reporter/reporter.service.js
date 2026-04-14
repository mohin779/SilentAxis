"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reporterLogin = reporterLogin;
exports.createReporterSession = createReporterSession;
exports.addReporterMessage = addReporterMessage;
exports.getReporterMessages = getReporterMessages;
const uuid_1 = require("uuid");
const crypto_1 = __importDefault(require("crypto"));
const db_1 = require("../../config/db");
const encryption_1 = require("../../utils/crypto/encryption");
function encryptWithConversationKey(message, key) {
    const iv = crypto_1.default.randomBytes(16);
    const cipher = crypto_1.default.createCipheriv("aes-256-cbc", Buffer.from(key), iv);
    const encrypted = Buffer.concat([cipher.update(message, "utf8"), cipher.final()]);
    return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}
async function ensureConversationKeys(complaintId) {
    const existing = await db_1.pool.query("SELECT encrypted_key_for_reporter FROM conversation_keys WHERE complaint_id = $1", [complaintId]);
    if (existing.rowCount) {
        return (0, encryption_1.decrypt)(existing.rows[0].encrypted_key_for_reporter);
    }
    const conversationKey = crypto_1.default.randomBytes(32).toString("hex");
    const encryptedForReporter = await (0, encryption_1.encrypt)(conversationKey);
    const encryptedForInvestigator = await (0, encryption_1.encrypt)(conversationKey);
    await db_1.pool.query("INSERT INTO conversation_keys (complaint_id, encrypted_key_for_reporter, encrypted_key_for_investigator) VALUES ($1,$2,$3)", [complaintId, encryptedForReporter, encryptedForInvestigator]);
    return conversationKey;
}
async function reporterLogin(complaintId, secret) {
    const row = await db_1.pool.query("SELECT complaint_id, reporter_secret FROM reporter_sessions WHERE complaint_id = $1", [complaintId]);
    if (!row.rowCount)
        return false;
    const stored = row.rows[0].reporter_secret;
    return (await (0, encryption_1.decrypt)(stored)) === secret;
}
async function createReporterSession(complaintId, secret) {
    await ensureConversationKeys(complaintId);
    const encryptedSecret = await (0, encryption_1.encrypt)(secret);
    await db_1.pool.query("INSERT INTO reporter_sessions (complaint_id, reporter_secret) VALUES ($1,$2) ON CONFLICT (complaint_id) DO NOTHING", [complaintId, encryptedSecret]);
}
async function addReporterMessage(input) {
    const id = (0, uuid_1.v4)();
    const conversationKey = await ensureConversationKeys(input.complaintId);
    const encryptedMessage = encryptWithConversationKey(input.message, conversationKey);
    await db_1.pool.query("INSERT INTO reporter_messages (id, complaint_id, sender_type, encrypted_message) VALUES ($1,$2,$3,$4)", [id, input.complaintId, input.senderType, encryptedMessage]);
    return id;
}
async function getReporterMessages(complaintId) {
    const rows = await db_1.pool.query("SELECT id, complaint_id, sender_type, encrypted_message, created_at FROM reporter_messages WHERE complaint_id = $1 ORDER BY created_at ASC", [complaintId]);
    return rows.rows;
}
