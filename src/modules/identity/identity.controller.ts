import { Response } from "express";
import { z } from "zod";
import { AuthRequest } from "../../middleware/auth";
import { commitmentFromSecret, generateSecret, registerCommitment } from "./identity.service";

const registerSchema = z.object({
  commitment: z.string().optional()
});

export async function registerIdentity(req: AuthRequest, res: Response): Promise<void> {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success || !req.authUser) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  const secret = generateSecret();
  const commitment = parsed.data.commitment ?? commitmentFromSecret(secret);
  const result = await registerCommitment(req.authUser.orgId, commitment);
  res.json({ secret, commitment, ...result });
}
