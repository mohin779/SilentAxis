import { buildPoseidon } from "circomlibjs";

export type ZkIdentity = {
  identityNullifier: string;
  identityTrapdoor: string;
  commitment: string;
};

function dateToField(date: string): string {
  return BigInt(date.replaceAll("-", "")).toString();
}

export async function generateIdentity(input: {
  identityNullifier: string;
  identityTrapdoor: string;
  commitment: string;
}): Promise<ZkIdentity> {
  return {
    identityNullifier: input.identityNullifier,
    identityTrapdoor: input.identityTrapdoor,
    commitment: input.commitment
  };
}

export async function generateCommitment(identity: ZkIdentity): Promise<string> {
  return identity.commitment;
}

export async function generateProof(input: {
  identity: ZkIdentity;
  merklePath: string[];
  merkleIndices: number[];
  root: string;
  date: string;
}): Promise<{ proof: unknown; publicSignals: string[]; nullifierHash: string; root: string }> {
  const snarkjs = (await import("snarkjs")) as any;
  const poseidon = await buildPoseidon();
  const dateField = dateToField(input.date);
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    {
      identity_nullifier: input.identity.identityNullifier,
      identity_trapdoor: input.identity.identityTrapdoor,
      merkle_path: input.merklePath,
      merkle_indices: input.merkleIndices,
      root: input.root,
      date: dateField,
      merklePath: input.merklePath,
      merkleIndices: input.merkleIndices,
      merkleRoot: input.root
    },
    "/zk/build/complaint_js/complaint.wasm",
    "/zk/build/complaint.zkey"
  );

  const nullifierHash = poseidon.F.toString(poseidon([BigInt(input.identity.identityNullifier), BigInt(dateField)]));
  return { proof, publicSignals, nullifierHash, root: input.root };
}
