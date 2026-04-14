jest.mock("../../src/modules/complaints/complaints.service", () => ({
  submitComplaint: jest.fn().mockResolvedValue({ complaintId: "cid", hash: "hash" })
}));
jest.mock("../../src/queues/evidenceScan.queue", () => ({
  evidenceScanQueue: { add: jest.fn() }
}));

import express from "express";
import request from "supertest";
import { createComplaint } from "../../src/modules/complaints/complaints.controller";

describe("complaint submission flow", () => {
  it("accepts encrypted complaint payload", async () => {
    const app = express();
    app.use(express.json());
    app.post("/complaints", (req, _res, next) => {
      (req as any).authUser = { orgId: "11111111-1111-1111-1111-111111111111" };
      next();
    }, createComplaint);

    const response = await request(app).post("/complaints").send({
      encryptedComplaint: "ciphertext",
      encryptedKey: "wrappedkey",
      category: "fraud",
      nullifierHash: "nf",
      root: "rt",
      proof: {
        pi_a: ["1", "2"],
        pi_b: [
          ["1", "2"],
          ["3", "4"]
        ],
        pi_c: ["5", "6"]
      }
    });

    expect(response.status).toBe(201);
    expect(response.body.complaintId).toBe("cid");
  });
});
