import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { pool } from "../../config/db";
import { sha256 } from "../../utils/crypto/hashing";
import { Groth16Proof } from "../../types/zk";
import { zkVerifier } from "../../zk/verifier";
import { encrypt } from "../../utils/crypto/encryption";

let complaintSchemaEnsured = false;

async function ensureComplaintSchema(): Promise<void> {
  if (complaintSchemaEnsured) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS nullifiers (
      nullifier_hash TEXT PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query("ALTER TABLE complaints ADD COLUMN IF NOT EXISTS nullifier_hash TEXT UNIQUE");
  await pool.query("ALTER TABLE complaints ADD COLUMN IF NOT EXISTS merkle_root TEXT");
  await pool.query("ALTER TABLE complaints ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()");
  await pool.query("ALTER TABLE complaints ADD COLUMN IF NOT EXISTS visibility_status TEXT NOT NULL DEFAULT 'PENDING_APPROVAL'");
  await pool.query("ALTER TABLE complaints ADD COLUMN IF NOT EXISTS complaint_status TEXT NOT NULL DEFAULT 'SUBMITTED'");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS complaint_approvals (
      id UUID PRIMARY KEY,
      complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
      authority_role TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      decided_at TIMESTAMPTZ
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS reporter_sessions (
      complaint_id UUID PRIMARY KEY REFERENCES complaints(id) ON DELETE CASCADE,
      reporter_secret TEXT NOT NULL
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS complaint_updates (
      id UUID PRIMARY KEY,
      complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
      message TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS complaint_hashes (
      complaint_id UUID PRIMARY KEY REFERENCES complaints(id) ON DELETE CASCADE,
      hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  // Avoid expensive backfill during live request handling.
  // Any historical nulls can be handled in an offline migration script.
  complaintSchemaEnsured = true;
}

export async function storeOnChain(hash: string): Promise<string> {
  return `SIM_CHAIN_TX_${hash.slice(0, 16)}`;
}

export async function submitComplaint(input: {
  orgId: string;
  encryptedComplaint: string;
  category: "fraud" | "harassment" | "safety" | "corruption" | "other";
  nullifierHash?: string;
  root?: string;
  proof?: Groth16Proof;
}) {
  await ensureComplaintSchema();
  const complaintId = uuidv4();
  const secretKey = cryptoRandomSecret();
  let resolvedRoot = input.root;
  let resolvedNullifier = input.nullifierHash;
  let resolvedOrgId = input.orgId;

  const strictInput = Boolean(input.proof && input.root && input.nullifierHash);
  if (strictInput) {
    const verified = await zkVerifier.verifyProof(input.proof as Groth16Proof, input.root as string, input.nullifierHash as string);
    if (!verified) {
      throw new Error("Invalid ZK proof");
    }
    const knownRoot = await pool.query("SELECT org_id FROM merkle_roots WHERE root = $1 LIMIT 1", [input.root]);
    if (!knownRoot.rowCount) {
      throw new Error("Unknown Merkle root");
    }
    resolvedOrgId = knownRoot.rows[0].org_id as string;
  } else {
    // Dev auto mode: accept encrypted complaint without client-side proof artifacts.
    resolvedRoot = `AUTO_ROOT_${input.orgId}`;
    resolvedNullifier = sha256(`${input.encryptedComplaint}:${Date.now()}:${Math.random()}`);
    await pool.query("INSERT INTO merkle_roots (root, org_id) VALUES ($1,$2) ON CONFLICT (root) DO NOTHING", [
      resolvedRoot,
      input.orgId
    ]);
  }

  const existingNullifier = await pool.query("SELECT 1 FROM complaints WHERE nullifier_hash = $1 LIMIT 1", [resolvedNullifier]);
  if (existingNullifier.rowCount) {
    throw new Error("Already submitted today");
  }

  await pool.query("INSERT INTO nullifiers (nullifier_hash) VALUES ($1)", [resolvedNullifier]);
  await pool.query(
    "INSERT INTO complaints (id, org_id, encrypted_data, category, complaint_status, visibility_status, nullifier_hash, merkle_root) VALUES ($1,$2,$3,$4,'SUBMITTED','PENDING_APPROVAL',$5,$6)",
    [
      complaintId,
      resolvedOrgId,
      input.encryptedComplaint,
      input.category,
      resolvedNullifier,
      resolvedRoot
    ]
  );
  await pool.query(
    "INSERT INTO complaint_approvals (id, complaint_id, authority_role, status) VALUES ($1,$2,'HR','PENDING'),($3,$2,'MANAGER','PENDING'),($4,$2,'REGIONAL_OFFICER','PENDING')",
    [uuidv4(), complaintId, uuidv4(), uuidv4()]
  );
  await pool.query("INSERT INTO reporter_sessions (complaint_id, reporter_secret) VALUES ($1,$2)", [
    complaintId,
    await encrypt(secretKey)
  ]);
  await pool.query("INSERT INTO complaint_updates (id, complaint_id, message) VALUES ($1,$2,$3)", [
    uuidv4(),
    complaintId,
    "Complaint submitted. Content locked until authority approval."
  ]);
  const hash = sha256(input.encryptedComplaint);
  await pool.query("INSERT INTO complaint_hashes (complaint_id, hash) VALUES ($1,$2)", [complaintId, hash]);
  await storeOnChain(hash);
  return { complaintId, hash, secretKey };
}

function cryptoRandomSecret(): string {
  return crypto.randomBytes(24).toString("hex");
}
