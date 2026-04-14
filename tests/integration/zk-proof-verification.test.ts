jest.mock("../../src/config/db", () => ({
  pool: {
    query: jest.fn()
  }
}));

jest.mock("../../src/zk/verifier", () => ({
  zkVerifier: {
    verifyProof: jest.fn(),
    initialize: jest.fn()
  }
}));

import { pool } from "../../src/config/db";
import { submitComplaint } from "../../src/modules/complaints/complaints.service";
import { zkVerifier } from "../../src/zk/verifier";

const baseInput = {
  orgId: "11111111-1111-1111-1111-111111111111",
  encryptedComplaint: "ciphertext",
  encryptedKey: "wrappedkey",
  category: "fraud" as const,
  root: "known-root",
  nullifierHash: "nf-hash",
  proof: {
    pi_a: ["1", "2"] as [string, string],
    pi_b: [
      ["1", "2"],
      ["3", "4"]
    ] as [[string, string], [string, string]],
    pi_c: ["5", "6"] as [string, string]
  }
};

describe("zk proof verification flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("accepts valid proof", async () => {
    (zkVerifier.verifyProof as jest.Mock).mockResolvedValue(true);
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValue({ rowCount: 1, rows: [] });
    const result = await submitComplaint(baseInput);
    expect(result.complaintId).toBeDefined();
  });

  it("rejects invalid proof", async () => {
    (zkVerifier.verifyProof as jest.Mock).mockResolvedValue(false);
    await expect(submitComplaint(baseInput)).rejects.toThrow("Invalid proof");
  });

  it("rejects reused nullifier", async () => {
    (zkVerifier.verifyProof as jest.Mock).mockResolvedValue(true);
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] });
    await expect(submitComplaint(baseInput)).rejects.toThrow("Duplicate nullifier");
  });

  it("rejects unknown root", async () => {
    (zkVerifier.verifyProof as jest.Mock).mockResolvedValue(true);
    (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0, rows: [] });
    await expect(submitComplaint(baseInput)).rejects.toThrow("Unknown Merkle root");
  });
});
