import { buildPoseidon } from "circomlibjs";

export async function generateComplaintProofExample(input: {
  identityNullifier: string;
  identityTrapdoor: string;
  merklePath: string[];
  merkleIndices: number[];
  root: string;
  date: string; // YYYY-MM-DD
}) {
  const snarkjs = (await import("snarkjs")) as any;
  const poseidon = await buildPoseidon();
  const dateField = BigInt(input.date.replaceAll("-", "")).toString();

  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    {
      identity_nullifier: input.identityNullifier,
      identity_trapdoor: input.identityTrapdoor,
      merkle_path: input.merklePath,
      merkle_indices: input.merkleIndices,
      root: input.root,
      date: dateField
    },
    "/zk/build/complaint_js/complaint.wasm",
    "/zk/build/complaint.zkey"
  );

  const nullifierHash = poseidon.F.toString(poseidon([BigInt(input.identityNullifier), BigInt(dateField)]));

  return {
    proof,
    publicSignals,
    payload: {
      publicSignals: {
        root: input.root,
        nullifierHash
      }
    }
  };
}
