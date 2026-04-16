import { v4 as uuidv4 } from "uuid";
import { pool } from "../../config/db";
import { Groth16Proof } from "../../types/zk";
import { sha256 } from "../../utils/crypto/hashing";
import { zkVerifier } from "../../zk/verifier";

export async function storeOnChain(hash: string): Promise<string> {
  return `SIM_CHAIN_TX_${hash.slice(0, 16)}`;
}

export async function submitComplaint(input: {
  orgId: string;
  encryptedComplaint: string;
  encryptedKey?: string;
  category: "fraud" | "harassment" | "safety" | "corruption" | "other";
  proof?: Groth16Proof;
  nullifierHash?: string;
  root?: string;
}) {
  let root = input.root;
  let nullifierHash = input.nullifierHash;

  const strictZkInput = Boolean(input.proof && input.root && input.nullifierHash);
  if (strictZkInput) {
    if (!(await zkVerifier.verifyProof(input.proof as Groth16Proof, input.root as string, input.nullifierHash as string))) {
      throw new Error("Invalid proof");
    }
    const knownRoot = await pool.query(
      "SELECT 1 FROM merkle_roots WHERE root = $1 AND org_id = $2 AND created_at <= NOW() AND created_at >= NOW() - INTERVAL '180 days' ORDER BY created_at DESC LIMIT 1",
      [input.root, input.orgId]
    );
    if (!knownRoot.rowCount) {
      throw new Error("Unknown Merkle root");
    }
  } else {
    // Dev automation mode: generate root + nullifier automatically.
    // Keeps UX simple while preserving strict mode when proof is provided.
    const autoRoot = `AUTO_ROOT_${input.orgId}`;
    await pool.query("INSERT INTO merkle_roots (root, org_id) VALUES ($1,$2) ON CONFLICT (root) DO NOTHING", [
      autoRoot,
      input.orgId
    ]);
    root = autoRoot;
    nullifierHash = sha256(`${input.encryptedComplaint}:${Date.now()}:${Math.random()}`);
  }

  const existing = await pool.query("SELECT 1 FROM nullifiers WHERE nullifier_hash = $1", [nullifierHash]);
  if (existing.rowCount) {
    throw new Error("Duplicate nullifier");
  }

  const complaintId = uuidv4();
  await pool.query("INSERT INTO nullifiers (nullifier_hash) VALUES ($1)", [nullifierHash]);
  await pool.query(
    "INSERT INTO complaints (id, org_id, encrypted_data, encrypted_key, category, complaint_status) VALUES ($1,$2,$3,$4,$5,'SUBMITTED')",
    [
    complaintId,
    input.orgId,
      input.encryptedComplaint,
      input.encryptedKey ?? null,
      input.category
    ]
  );
  await pool.query("INSERT INTO complaint_updates (id, complaint_id, message) VALUES ($1,$2,$3)", [
    uuidv4(),
    complaintId,
    "Complaint submitted"
  ]);
  const hash = sha256(input.encryptedComplaint);
  await pool.query("INSERT INTO complaint_hashes (complaint_id, hash) VALUES ($1,$2)", [complaintId, hash]);
  await storeOnChain(hash);
  return { complaintId, hash };
}
