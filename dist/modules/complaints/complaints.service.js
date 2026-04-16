"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storeOnChain = storeOnChain;
exports.submitComplaint = submitComplaint;
const uuid_1 = require("uuid");
const db_1 = require("../../config/db");
const hashing_1 = require("../../utils/crypto/hashing");
const verifier_1 = require("../../zk/verifier");
async function storeOnChain(hash) {
    return `SIM_CHAIN_TX_${hash.slice(0, 16)}`;
}
async function submitComplaint(input) {
    let root = input.root;
    let nullifierHash = input.nullifierHash;
    const strictZkInput = Boolean(input.proof && input.root && input.nullifierHash);
    if (strictZkInput) {
        if (!(await verifier_1.zkVerifier.verifyProof(input.proof, input.root, input.nullifierHash))) {
            throw new Error("Invalid proof");
        }
        const knownRoot = await db_1.pool.query("SELECT 1 FROM merkle_roots WHERE root = $1 AND org_id = $2 AND created_at <= NOW() AND created_at >= NOW() - INTERVAL '180 days' ORDER BY created_at DESC LIMIT 1", [input.root, input.orgId]);
        if (!knownRoot.rowCount) {
            throw new Error("Unknown Merkle root");
        }
    }
    else {
        // Dev automation mode: generate root + nullifier automatically.
        // Keeps UX simple while preserving strict mode when proof is provided.
        const autoRoot = `AUTO_ROOT_${input.orgId}`;
        await db_1.pool.query("INSERT INTO merkle_roots (root, org_id) VALUES ($1,$2) ON CONFLICT (root) DO NOTHING", [
            autoRoot,
            input.orgId
        ]);
        root = autoRoot;
        nullifierHash = (0, hashing_1.sha256)(`${input.encryptedComplaint}:${Date.now()}:${Math.random()}`);
    }
    const existing = await db_1.pool.query("SELECT 1 FROM nullifiers WHERE nullifier_hash = $1", [nullifierHash]);
    if (existing.rowCount) {
        throw new Error("Duplicate nullifier");
    }
    const complaintId = (0, uuid_1.v4)();
    await db_1.pool.query("INSERT INTO nullifiers (nullifier_hash) VALUES ($1)", [nullifierHash]);
    await db_1.pool.query("INSERT INTO complaints (id, org_id, encrypted_data, encrypted_key, category, complaint_status) VALUES ($1,$2,$3,$4,$5,'SUBMITTED')", [
        complaintId,
        input.orgId,
        input.encryptedComplaint,
        input.encryptedKey ?? null,
        input.category
    ]);
    await db_1.pool.query("INSERT INTO complaint_updates (id, complaint_id, message) VALUES ($1,$2,$3)", [
        (0, uuid_1.v4)(),
        complaintId,
        "Complaint submitted"
    ]);
    const hash = (0, hashing_1.sha256)(input.encryptedComplaint);
    await db_1.pool.query("INSERT INTO complaint_hashes (complaint_id, hash) VALUES ($1,$2)", [complaintId, hash]);
    await storeOnChain(hash);
    return { complaintId, hash };
}
