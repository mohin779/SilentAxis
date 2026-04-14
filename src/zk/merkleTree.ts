import { pool } from "../config/db";
import { sha256 } from "../utils/crypto/hashing";

type Layer = string[];

class IncrementalMerkleTree {
  private layers: Layer[] = [];

  constructor(initialLeaves: string[] = []) {
    this.layers = [initialLeaves.length ? [...initialLeaves] : [sha256("EMPTY")]];
    if (initialLeaves.length) {
      this.recomputeParents();
    }
  }

  appendLeaf(commitment: string): number {
    if (this.layers[0].length === 1 && this.layers[0][0] === sha256("EMPTY")) {
      this.layers[0] = [];
    }
    this.layers[0].push(commitment);
    let index = this.layers[0].length - 1;
    let level = 0;

    while (true) {
      if (!this.layers[level + 1]) this.layers[level + 1] = [];
      const layer = this.layers[level];
      const parentIndex = Math.floor(index / 2);
      const left = layer[parentIndex * 2];
      const right = layer[parentIndex * 2 + 1] ?? left;
      this.layers[level + 1][parentIndex] = sha256(`${left}${right}`);
      index = parentIndex;
      level++;
      if (this.layers[level].length === 1) break;
    }

    return this.layers[0].length - 1;
  }

  getRoot(): string {
    const top = this.layers[this.layers.length - 1];
    return top[0];
  }

  generateProof(leafIndex: number): string[] {
    const proof: string[] = [];
    let currentIndex = leafIndex;
    for (let layer = 0; layer < this.layers.length - 1; layer++) {
      const sibling = currentIndex % 2 === 0 ? currentIndex + 1 : currentIndex - 1;
      proof.push(this.layers[layer][sibling] ?? this.layers[layer][currentIndex]);
      currentIndex = Math.floor(currentIndex / 2);
    }
    return proof;
  }

  private recomputeParents(): void {
    let level = 0;
    while (this.layers[level].length > 1) {
      const next: string[] = [];
      for (let i = 0; i < this.layers[level].length; i += 2) {
        const left = this.layers[level][i];
        const right = this.layers[level][i + 1] ?? left;
        next.push(sha256(`${left}${right}`));
      }
      this.layers[level + 1] = next;
      level++;
    }
  }
}

const treesByOrg = new Map<string, IncrementalMerkleTree>();

async function getTree(orgId: string): Promise<IncrementalMerkleTree> {
  const cached = treesByOrg.get(orgId);
  if (cached) return cached;
  const rows = await pool.query(
    "SELECT commitment FROM identity_commitments WHERE org_id = $1 ORDER BY created_at ASC",
    [orgId]
  );
  const tree = new IncrementalMerkleTree(rows.rows.map((r: { commitment: string }) => r.commitment));
  treesByOrg.set(orgId, tree);
  return tree;
}

export async function appendCommitment(orgId: string, commitment: string) {
  const tree = await getTree(orgId);
  const leafIndex = tree.appendLeaf(commitment);
  return { leafIndex, root: tree.getRoot(), merkleProof: tree.generateProof(leafIndex) };
}
