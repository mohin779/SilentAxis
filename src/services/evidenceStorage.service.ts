import { v4 as uuidv4 } from "uuid";
import { getStorageProvider } from "../storage/storageProvider";
import { encrypt } from "../utils/crypto/encryption";

export async function storeEncryptedEvidence(
  fileName: string,
  encryptedFileBase64: string
): Promise<string> {
  const safeName = `${uuidv4()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  // Extra-at-rest encryption layer for uploaded encrypted evidence blobs.
  const wrapped = await encrypt(encryptedFileBase64);
  return getStorageProvider().putObject(safeName, wrapped);
}
