import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { pool } from "../../config/db";
import { sha256 } from "../../utils/crypto/hashing";
import { appendCommitment } from "../../zk/merkleTree";

export function generateSecret(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function registerCommitment(orgId: string, commitment: string) {
  const tree = await appendCommitment(orgId, commitment);

  await pool.query(
    "INSERT INTO identity_commitments (id, org_id, commitment, leaf_index, merkle_root) VALUES ($1,$2,$3,$4,$5)",
    [uuidv4(), orgId, commitment, tree.leafIndex, tree.root]
  );
  await pool.query("INSERT INTO merkle_roots (root, org_id) VALUES ($1,$2) ON CONFLICT (root) DO NOTHING", [
    tree.root,
    orgId
  ]);

  return { leafIndex: tree.leafIndex, root: tree.root, merkleProof: tree.merkleProof };
}

export function commitmentFromSecret(secret: string): string {
  return sha256(secret);
}
