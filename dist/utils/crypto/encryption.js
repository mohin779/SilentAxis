"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encrypt = encrypt;
exports.decrypt = decrypt;
const crypto_1 = __importDefault(require("crypto"));
const keyring_service_1 = require("../../services/keyring.service");
const ivLength = 16;
async function encrypt(plain) {
    const keyVersion = (0, keyring_service_1.getActiveKeyVersion)();
    const keyMaterial = await (0, keyring_service_1.getKeyMaterial)(keyVersion);
    const iv = crypto_1.default.randomBytes(ivLength);
    const cipher = crypto_1.default.createCipheriv("aes-256-cbc", Buffer.from(keyMaterial), iv);
    const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
    const envelope = {
        keyVersion,
        ciphertext: `${iv.toString("hex")}:${encrypted.toString("hex")}`
    };
    return JSON.stringify(envelope);
}
async function decrypt(payload) {
    let keyVersion = (0, keyring_service_1.getActiveKeyVersion)();
    let ciphertext = payload;
    try {
        const parsed = JSON.parse(payload);
        if (parsed.keyVersion && parsed.ciphertext) {
            keyVersion = parsed.keyVersion;
            ciphertext = parsed.ciphertext;
        }
    }
    catch {
        // backward-compatible legacy payload format
    }
    const keyMaterial = await (0, keyring_service_1.getKeyMaterial)(keyVersion);
    const [ivHex, dataHex] = ciphertext.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const encryptedText = Buffer.from(dataHex, "hex");
    const decipher = crypto_1.default.createDecipheriv("aes-256-cbc", Buffer.from(keyMaterial), iv);
    const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
    return decrypted.toString("utf8");
}
