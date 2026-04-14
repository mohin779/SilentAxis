import { sha256 } from "../utils/crypto/hashing";

export interface MockProof {
  proofHash: string;
  createdAt: number;
}

export function generateProof(secret: string, merkleProof: string[], root: string): MockProof {
  return {
    proofHash: sha256(`${secret}:${merkleProof.join(",")}:${root}`),
    createdAt: Date.now()
  };
}

export function verifyProof(proof: MockProof, root: string): boolean {
  return Boolean(proof?.proofHash) && Boolean(root) && proof.createdAt > 0;
}
