import crypto from "crypto";
import { getActiveKeyVersion, getKeyMaterial } from "../../services/keyring.service";

const ivLength = 16;

type EncryptedEnvelope = {
  keyVersion: string;
  ciphertext: string;
};

export async function encrypt(plain: string): Promise<string> {
  const keyVersion = getActiveKeyVersion();
  const keyMaterial = await getKeyMaterial(keyVersion);
  const iv = crypto.randomBytes(ivLength);
  const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(keyMaterial), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const envelope: EncryptedEnvelope = {
    keyVersion,
    ciphertext: `${iv.toString("hex")}:${encrypted.toString("hex")}`
  };
  return JSON.stringify(envelope);
}

export async function decrypt(payload: string): Promise<string> {
  let keyVersion = getActiveKeyVersion();
  let ciphertext = payload;
  try {
    const parsed = JSON.parse(payload) as EncryptedEnvelope;
    if (parsed.keyVersion && parsed.ciphertext) {
      keyVersion = parsed.keyVersion;
      ciphertext = parsed.ciphertext;
    }
  } catch {
    // backward-compatible legacy payload format
  }
  const keyMaterial = await getKeyMaterial(keyVersion);
  const [ivHex, dataHex] = ciphertext.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const encryptedText = Buffer.from(dataHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(keyMaterial), iv);
  const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
  return decrypted.toString("utf8");
}
