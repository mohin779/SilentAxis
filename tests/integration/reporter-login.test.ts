jest.mock("../../src/config/db", () => ({
  pool: {
    query: jest.fn()
  }
}));

import { pool } from "../../src/config/db";
import { encrypt } from "../../src/utils/crypto/encryption";
import { reporterLogin } from "../../src/modules/reporter/reporter.service";

describe("anonymous reporter login", () => {
  it("authenticates with valid complaint secret", async () => {
    const encryptedSecret = await encrypt("very-secret-pin");
    (pool.query as jest.Mock).mockResolvedValue({
      rowCount: 1,
      rows: [{ reporter_secret: encryptedSecret }]
    });
    const ok = await reporterLogin("11111111-1111-1111-1111-111111111111", "very-secret-pin");
    expect(ok).toBe(true);
  });
});
