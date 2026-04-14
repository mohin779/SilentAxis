import { pool } from "../config/db";
import { env } from "../config/env";

const cache = new Map<string, string>();

async function loadFromDb(version: string): Promise<string | null> {
  try {
    const row = await pool.query(
      "SELECT encrypted_key_material FROM encryption_keys WHERE key_version = $1 AND active = true LIMIT 1",
      [version]
    );
    if (!row.rowCount) return null;
    return row.rows[0].encrypted_key_material as string;
  } catch {
    return null;
  }
}

export async function getKeyMaterial(version: string): Promise<string> {
  const cached = cache.get(version);
  if (cached) return cached;
  const dbValue = await loadFromDb(version);
  if (dbValue) {
    cache.set(version, dbValue);
    return dbValue;
  }
  if (version === env.encryptionKeyVersion) {
    cache.set(version, env.encryptionKey);
    return env.encryptionKey;
  }
  throw new Error(`Unknown encryption key version: ${version}`);
}

export function getActiveKeyVersion(): string {
  return env.encryptionKeyVersion;
}
