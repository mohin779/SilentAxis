import { Request, Response } from "express";
import { z } from "zod";
import { issueAnonymousToken, startOtpChallenge, verifyOtpChallenge } from "./employeeOtp.service";

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
    res.status(202).json({ challengeId: result.challengeId, status: "OTP_SENT" });
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
    const token = await issueAnonymousToken(parsed.data.challengeId);
    // One-way: client holds raw token; server stores only hash.
    res.json({ token, tokenType: "ANON_TOKEN", expiresInSeconds: 1800 });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
}

