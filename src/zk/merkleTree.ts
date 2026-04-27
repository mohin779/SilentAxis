import { insertCommitment } from "./merkle";

export async function appendCommitment(orgId: string, commitment: string) {
  const result = await insertCommitment(orgId, commitment);
  return {
    leafIndex: result.leafIndex,
    root: result.root,
    merkleProof: result.merklePath,
    merkleIndices: result.merkleIndices
  };
}
