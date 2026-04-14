jest.mock("../../src/config/redis", () => ({
  redis: {
    get: jest.fn(),
    set: jest.fn(),
    expire: jest.fn()
  }
}));

import { redis } from "../../src/config/redis";
import { enforceDeviceBinding } from "../../src/middleware/deviceBinding";

describe("device binding middleware", () => {
  it("blocks mismatched fingerprint", async () => {
    (redis.get as jest.Mock).mockResolvedValue("fp-1");
    const req = {
      authUser: { sessionId: "session1" },
      header: jest.fn().mockReturnValue("fp-2")
    } as any;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
    const next = jest.fn();
    enforceDeviceBinding(req, res, next);
    await new Promise((r) => setTimeout(r, 0));
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
