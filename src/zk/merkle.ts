import { sha256 } from "../utils/crypto/hashing";

export interface MerkleTreeResult {
  root: string;
  layers: string[][];
}

export function buildMerkleTree(leaves: string[]): MerkleTreeResult {
  if (leaves.length === 0) return { root: sha256("EMPTY"), layers: [[sha256("EMPTY")]] };
  const layers: string[][] = [leaves];
  while (layers[layers.length - 1].length > 1) {
    const prev = layers[layers.length - 1];
    const next: string[] = [];
    for (let i = 0; i < prev.length; i += 2) {
      const left = prev[i];
      const right = prev[i + 1] ?? prev[i];
      next.push(sha256(`${left}${right}`));
    }
    layers.push(next);
  }
  return { root: layers[layers.length - 1][0], layers };
}

export function getMerkleProof(layers: string[][], index: number): string[] {
  const proof: string[] = [];
  let currentIndex = index;
  for (let layer = 0; layer < layers.length - 1; layer++) {
    const sibling = currentIndex % 2 === 0 ? currentIndex + 1 : currentIndex - 1;
    proof.push(layers[layer][sibling] ?? layers[layer][currentIndex]);
    currentIndex = Math.floor(currentIndex / 2);
  }
  return proof;
}
