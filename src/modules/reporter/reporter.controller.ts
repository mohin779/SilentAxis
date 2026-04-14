import { Request, Response } from "express";
import { z } from "zod";
import {
  addReporterMessage,
  createReporterSession,
  getReporterMessages,
  reporterLogin
} from "./reporter.service";

const loginSchema = z.object({
  complaintId: z.string().uuid(),
  secret: z.string().min(8)
});

const messageSchema = z.object({
  complaintId: z.string().uuid(),
  senderType: z.enum(["reporter", "investigator"]),
  message: z.string().min(1)
});

export async function loginReporter(req: Request, res: Response): Promise<void> {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }
  const ok = await reporterLogin(parsed.data.complaintId, parsed.data.secret);
  if (!ok) {
    res.status(401).json({ error: "Invalid reporter credentials" });
    return;
  }
  res.json({ status: "ok" });
}

export async function createReporterAccess(req: Request, res: Response): Promise<void> {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }
  await createReporterSession(parsed.data.complaintId, parsed.data.secret);
  res.status(201).json({ status: "created" });
}

export async function postReporterMessage(req: Request, res: Response): Promise<void> {
  const parsed = messageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }
  const id = await addReporterMessage(parsed.data);
  res.status(201).json({ id });
}

export async function listReporterMessages(req: Request, res: Response): Promise<void> {
  const complaintId = z.string().uuid().safeParse(req.params.complaintId);
  if (!complaintId.success) {
    res.status(400).json({ error: "Invalid complaint id" });
    return;
  }
  const messages = await getReporterMessages(complaintId.data);
  res.json(messages);
}
