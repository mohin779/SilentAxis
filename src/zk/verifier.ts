import fs from "fs/promises";
import path from "path";
import { Groth16Proof } from "../types/zk";

export interface ZkVerifier {
  initialize(): Promise<void>;
  verifyProof(proof: Groth16Proof, root: string, nullifierHash: string): Promise<boolean>;
}

type VerificationKey = Record<string, unknown>;

class SnarkJsVerifier implements ZkVerifier {
  private verificationKey: VerificationKey | null = null;
  private initPromise: Promise<void> | null = null;

  async initialize(): Promise<void> {
    if (this.verificationKey) return;
    if (this.initPromise) {
      await this.initPromise;
      return;
    }
    this.initPromise = (async () => {
      const keyPath = path.join(process.cwd(), "zk", "build", "verification_key.json");
      const raw = await fs.readFile(keyPath, "utf8");
      this.verificationKey = JSON.parse(raw) as VerificationKey;
    })();
    await this.initPromise;
  }

  async verifyProof(proof: Groth16Proof, root: string, nullifierHash: string): Promise<boolean> {
    if (!root || !nullifierHash || !proof) return false;
    try {
      await this.initialize();
      const snarkjs = require("snarkjs") as {
        groth16: {
          verify: (
            verificationKey: VerificationKey,
            publicSignals: string[],
            proof: Groth16Proof
          ) => Promise<boolean>;
        };
      };
      const publicSignals = [nullifierHash, root];
      return await snarkjs.groth16.verify(this.verificationKey as VerificationKey, publicSignals, proof);
    } catch {
      return false;
    }
  }
}

export const zkVerifier: ZkVerifier = new SnarkJsVerifier();
