jest.mock("../../src/config/db", () => ({
  pool: {
    query: jest.fn()
  }
}));

jest.mock("../../src/zk/verifier", () => ({
  zkVerifier: { verifyProof: jest.fn().mockResolvedValue(true) }
}));

import { pool } from "../../src/config/db";
import { submitComplaint } from "../../src/modules/complaints/complaints.service";

describe("nullifier reuse prevention", () => {
  it("rejects duplicate nullifier", async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] });
    await expect(
      submitComplaint({
        orgId: "11111111-1111-1111-1111-111111111111",
        encryptedComplaint: "ciphertext",
        encryptedKey: "wrappedkey",
        category: "fraud",
        nullifierHash: "dup-nullifier",
        root: "root",
        proof: {
          pi_a: ["1", "2"],
          pi_b: [
            ["1", "2"],
            ["3", "4"]
          ],
          pi_c: ["5", "6"]
        }
      })
    ).rejects.toThrow("Duplicate nullifier");
  });
});
