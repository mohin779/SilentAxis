import { Request, Response } from "express";
import { z } from "zod";
import { staffLogin } from "./staffAuth.service";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128)
});

export async function loginStaff(req: Request, res: Response): Promise<void> {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }
  try {
    const staff = await staffLogin(parsed.data.email, parsed.data.password);
    (req as any).session.staff = staff;
    res.json({ status: "ok" });
  } catch (e) {
    res.status(401).json({ error: (e as Error).message });
  }
}

export async function logoutStaff(req: Request, res: Response): Promise<void> {
  (req as any).session.destroy(() => {
    res.json({ status: "ok" });
  });
}

export async function whoami(req: Request, res: Response): Promise<void> {
  if (!(req as any).session.staff) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  res.json((req as any).session.staff);
}

