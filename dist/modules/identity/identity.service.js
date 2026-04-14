"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSecret = generateSecret;
exports.registerCommitment = registerCommitment;
exports.commitmentFromSecret = commitmentFromSecret;
const crypto_1 = __importDefault(require("crypto"));
const uuid_1 = require("uuid");
const db_1 = require("../../config/db");
const hashing_1 = require("../../utils/crypto/hashing");
const merkleTree_1 = require("../../zk/merkleTree");
function generateSecret() {
    return crypto_1.default.randomBytes(32).toString("hex");
}
async function registerCommitment(orgId, commitment) {
    const tree = await (0, merkleTree_1.appendCommitment)(orgId, commitment);
    await db_1.pool.query("INSERT INTO identity_commitments (id, org_id, commitment, leaf_index, merkle_root) VALUES ($1,$2,$3,$4,$5)", [(0, uuid_1.v4)(), orgId, commitment, tree.leafIndex, tree.root]);
    await db_1.pool.query("INSERT INTO merkle_roots (root, org_id) VALUES ($1,$2) ON CONFLICT (root) DO NOTHING", [
        tree.root,
        orgId
    ]);
    return { leafIndex: tree.leafIndex, root: tree.root, merkleProof: tree.merkleProof };
}
function commitmentFromSecret(secret) {
    return (0, hashing_1.sha256)(secret);
}
