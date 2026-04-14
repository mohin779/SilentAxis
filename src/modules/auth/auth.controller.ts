import { Request, Response } from "express";
import { z } from "zod";
import { loginWithMockSso } from "./auth.service";

const loginSchema = z.object({
  email: z.string().email()
});

export function login(req: Request, res: Response): void {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const result = loginWithMockSso(parsed.data.email);
    res.json(result);
  } catch (error) {
    res.status(403).json({ error: (error as Error).message });
  }
}
