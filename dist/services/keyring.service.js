"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getKeyMaterial = getKeyMaterial;
exports.getActiveKeyVersion = getActiveKeyVersion;
const db_1 = require("../config/db");
const env_1 = require("../config/env");
const cache = new Map();
async function loadFromDb(version) {
    try {
        const row = await db_1.pool.query("SELECT encrypted_key_material FROM encryption_keys WHERE key_version = $1 AND active = true LIMIT 1", [version]);
        if (!row.rowCount)
            return null;
        return row.rows[0].encrypted_key_material;
    }
    catch {
        return null;
    }
}
async function getKeyMaterial(version) {
    const cached = cache.get(version);
    if (cached)
        return cached;
    const dbValue = await loadFromDb(version);
    if (dbValue) {
        cache.set(version, dbValue);
        return dbValue;
    }
    if (version === env_1.env.encryptionKeyVersion) {
        cache.set(version, env_1.env.encryptionKey);
        return env_1.env.encryptionKey;
    }
    throw new Error(`Unknown encryption key version: ${version}`);
}
function getActiveKeyVersion() {
    return env_1.env.encryptionKeyVersion;
}
