import fs from "fs/promises";
import path from "path";
import { buildPoseidon } from "circomlibjs";

type InputPayload = {
  identitySecret: string;
  nullifier: string;
  merklePath: string[];
  merkleIndices: number[];
  merkleRoot: string;
};

async function main() {
  const snarkjs = require("snarkjs") as {
    groth16: {
      fullProve: (
        input: Record<string, unknown>,
        wasmPath: string,
        zkeyPath: string
      ) => Promise<{ proof: unknown; publicSignals: string[] }>;
    };
  };

  const raw = process.argv[2];
  if (!raw) {
    throw new Error("Pass input JSON string as first argument");
  }
  const input = JSON.parse(raw) as InputPayload;
  const wasmPath = path.join(process.cwd(), "zk", "build", "complaintProof_js", "complaintProof.wasm");
  const zkeyPath = path.join(process.cwd(), "zk", "build", "complaintProof.zkey");

  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    {
      identitySecret: input.identitySecret,
      nullifier: input.nullifier,
      merklePath: input.merklePath,
      merkleIndices: input.merkleIndices,
      merkleRoot: input.merkleRoot
    },
    wasmPath,
    zkeyPath
  );

  const poseidon = await buildPoseidon();
  const nullifierHash = poseidon.F.toString(
    poseidon([BigInt(input.identitySecret), BigInt(input.nullifier)])
  );

  const result = {
    root: input.merkleRoot,
    nullifierHash,
    proof,
    publicSignals
  };

  await fs.writeFile(path.join(process.cwd(), "zk", "build", "last-proof.json"), JSON.stringify(result, null, 2));
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
