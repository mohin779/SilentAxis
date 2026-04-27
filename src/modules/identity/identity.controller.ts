import { Response } from "express";
import { z } from "zod";
import { AuthRequest } from "../../middleware/auth";
import { consumeEligibilityReceipt } from "../auth/employeeOtp.service";
import { fetchCommitmentProof, registerCommitment } from "./identity.service";

const registerSchema = z.object({
  commitment: z.string().min(1),
  eligibilityReceipt: z.string().min(1)
});

export async function registerIdentity(req: AuthRequest, res: Response): Promise<void> {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  try {
    const eligibility = await consumeEligibilityReceipt(parsed.data.eligibilityReceipt);
    const result = await registerCommitment(eligibility.orgId, parsed.data.commitment);
    res.json({ commitment: parsed.data.commitment, ...result });
  } catch (error) {
    res.status(401).json({ error: (error as Error).message });
  }
}

const proofSchema = z.object({
  orgId: z.string().uuid(),
  commitment: z.string().min(1)
});

export async function getIdentityProof(req: AuthRequest, res: Response): Promise<void> {
  const parsed = proofSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  try {
    const result = await fetchCommitmentProof(parsed.data.orgId, parsed.data.commitment);
    res.json(result);
  } catch (error) {
    res.status(404).json({ error: (error as Error).message });
  }
}
