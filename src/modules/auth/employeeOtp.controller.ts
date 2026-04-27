import { Request, Response } from "express";
import { z } from "zod";
import {
  createCommitment,
  deriveDeterministicIdentity,
  generateIdentityTrapdoor,
  getChallengeOfficialEmail,
  issueEligibilityReceipt,
  startOtpChallenge,
  verifyOtpChallenge
} from "./employeeOtp.service";

const startSchema = z.object({
  orgId: z.string().uuid(),
  employeeIdentifier: z.string().min(3).max(320)
});

export async function startEmployeeOtp(req: Request, res: Response): Promise<void> {
  const parsed = startSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }
  try {
    const result = await startOtpChallenge(parsed.data);
    // Intentionally do NOT return official email.
    res.status(202).json({ challengeId: result.challengeId, status: "OTP_SENT", devOtp: result.devOtp });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
}

const verifySchema = z.object({
  challengeId: z.string().uuid(),
  otp: z.string().regex(/^[0-9]{6}$/)
});

export async function verifyEmployeeOtp(req: Request, res: Response): Promise<void> {
  const parsed = verifySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }
  try {
    const verified = await verifyOtpChallenge(parsed.data.challengeId, parsed.data.otp);
    if (!verified) {
      res.status(401).json({ error: "Invalid OTP" });
      return;
    }
    const officialEmail = await getChallengeOfficialEmail(parsed.data.challengeId);
    const identityNullifier = deriveDeterministicIdentity(officialEmail);
    const identityTrapdoor = generateIdentityTrapdoor();
    const commitment = createCommitment(identityNullifier, identityTrapdoor);
    const receipt = await issueEligibilityReceipt(parsed.data.challengeId);
    (req as any).session.anonymousComplaint = {
      orgId: receipt.orgId,
      verifiedAt: Date.now()
    };
    await new Promise<void>((resolve, reject) => {
      (req as any).session.save((err: unknown) => {
        if (err) reject(err);
        else resolve();
      });
    });
    res.json({
      verified: true,
      eligibilityReceipt: receipt.receipt,
      orgId: receipt.orgId,
      anonymousIdentity: {
        identityNullifier,
        identityTrapdoor,
        commitment
      }
    });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
}

