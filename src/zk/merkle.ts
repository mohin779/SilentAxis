import { buildPoseidon } from "circomlibjs";
import { pool } from "../config/db";

const TREE_LEVELS = 20;

type MerkleProof = {
  merklePath: string[];
  merkleIndices: number[];
  leafIndex: number;
  root: string;
};

class IncrementalMerkleTree {
  private leaves: string[];
  private poseidon: Awaited<ReturnType<typeof buildPoseidon>> | null;
  private zeros: string[] | null;

  constructor(leaves: string[] = []) {
    this.leaves = leaves;
    this.poseidon = null;
    this.zeros = null;
  }

  async append(commitment: string): Promise<number> {
    this.leaves.push(commitment);
    return this.leaves.length - 1;
  }

  async getRoot(): Promise<string> {
    const { root } = await this.buildLayers();
    return root;
  }

  async getProof(leafIndex: number): Promise<{ merklePath: string[]; merkleIndices: number[] }> {
    const { layers } = await this.buildLayers();
    const merklePath: string[] = [];
    const merkleIndices: number[] = [];
    let currentIndex = leafIndex;
    for (let level = 0; level < TREE_LEVELS; level++) {
      const sibling = currentIndex ^ 1;
      merklePath.push(layers[level][sibling]);
      merkleIndices.push(currentIndex % 2);
      currentIndex = Math.floor(currentIndex / 2);
    }
    return { merklePath, merkleIndices };
  }

  private async ensurePoseidon(): Promise<void> {
    if (this.poseidon && this.zeros) return;
    this.poseidon = await buildPoseidon();
    this.zeros = [];
    this.zeros[0] = "0";
    for (let i = 1; i <= TREE_LEVELS; i++) {
      this.zeros[i] = this.poseidon.F.toString(this.poseidon([BigInt(this.zeros[i - 1]), BigInt(this.zeros[i - 1])]));
    }
  }

  private async buildLayers(): Promise<{ layers: string[][]; root: string }> {
    await this.ensurePoseidon();
    const zeroLeaf = (this.zeros as string[])[0];
    const leavesByField = this.leaves.map((commitment) => normalizeCommitment(commitment));
    const layers: string[][] = [];
    layers[0] = Array.from({ length: 1 << TREE_LEVELS }, (_v, i) => leavesByField[i] ?? zeroLeaf);
    for (let level = 0; level < TREE_LEVELS; level++) {
      const next: string[] = [];
      for (let i = 0; i < layers[level].length; i += 2) {
        const left = layers[level][i];
        const right = layers[level][i + 1];
        next.push((this.poseidon as any).F.toString((this.poseidon as any)([BigInt(left), BigInt(right)])));
      }
      layers[level + 1] = next;
    }
    return { layers, root: layers[TREE_LEVELS][0] };
  }
}

const treeCache = new Map<string, IncrementalMerkleTree>();

export function normalizeCommitment(commitment: string): string {
  const c = commitment.trim().toLowerCase();
  if (/^[0-9]+$/.test(c)) return c;
  const hex = c.startsWith("0x") ? c.slice(2) : c;
  return BigInt(`0x${hex}`).toString();
}

async function getTree(orgId: string): Promise<IncrementalMerkleTree> {
  const cached = treeCache.get(orgId);
  if (cached) return cached;
  const rows = await pool.query(
    "SELECT commitment FROM identity_commitments WHERE org_id = $1 ORDER BY created_at ASC",
    [orgId]
  );
  const tree = new IncrementalMerkleTree(rows.rows.map((row: { commitment: string }) => row.commitment));
  treeCache.set(orgId, tree);
  return tree;
}

export async function insertCommitment(orgId: string, commitment: string): Promise<MerkleProof> {
  const tree = await getTree(orgId);
  const leafIndex = await tree.append(commitment);
  const root = await tree.getRoot();
  const proof = await tree.getProof(leafIndex);
  return { ...proof, leafIndex, root };
}

export async function getMerkleProof(orgId: string, commitment: string): Promise<MerkleProof> {
  const normalized = normalizeCommitment(commitment);
  const row = await pool.query(
    "SELECT leaf_index FROM identity_commitments WHERE org_id = $1 AND (commitment = $2 OR commitment = $3) LIMIT 1",
    [orgId, normalized, commitment]
  );
  if (!row.rowCount) {
    throw new Error("Commitment not registered");
  }
  const tree = await getTree(orgId);
  const leafIndex = Number(row.rows[0].leaf_index);
  const root = await tree.getRoot();
  const proof = await tree.getProof(leafIndex);
  return { ...proof, leafIndex, root };
}

export async function getRoot(orgId: string): Promise<string> {
  const tree = await getTree(orgId);
  return tree.getRoot();
}
