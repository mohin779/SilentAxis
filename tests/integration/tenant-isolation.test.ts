import { enforceOrgIsolation } from "../../src/middleware/orgIsolation";

describe("tenant isolation middleware", () => {
  it("rejects org mismatch", () => {
    const req = {
      params: { orgId: "org-b" },
      authUser: { orgId: "org-a" }
    } as any;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    } as any;
    const next = jest.fn();
    enforceOrgIsolation(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
