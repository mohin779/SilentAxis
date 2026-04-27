import { Response } from "express";
import crypto from "crypto";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { pool } from "../../config/db";
import { AuthRequest } from "../../middleware/auth";
import { submitComplaint } from "./complaints.service";
import { decrypt } from "../../utils/crypto/encryption";
import { storeEncryptedEvidence } from "../../services/evidenceStorage.service";
import { enqueueEvidenceScanJob } from "../../queues/evidenceScan.queue";

const complaintSchema = z.object({
  encryptedComplaint: z.string().min(1),
  proof: z.object({
    pi_a: z.tuple([z.string(), z.string()]).or(z.tuple([z.string(), z.string(), z.string()])),
    pi_b: z
      .tuple([z.tuple([z.string(), z.string()]), z.tuple([z.string(), z.string()])])
      .or(z.tuple([z.tuple([z.string(), z.string()]), z.tuple([z.string(), z.string()]), z.tuple([z.string(), z.string()])])),
    pi_c: z.tuple([z.string(), z.string()]).or(z.tuple([z.string(), z.string(), z.string()])),
    protocol: z.string().optional(),
    curve: z.string().optional()
  }).optional(),
  publicSignals: z
    .object({
      root: z.string().min(1),
      nullifierHash: z.string().min(1)
    })
    .optional(),
  nullifierHash: z.string().min(1).optional(),
  root: z.string().min(1).optional(),
  category: z.enum(["fraud", "harassment", "safety", "corruption", "other"]).default("other"),
});

export async function createComplaint(req: AuthRequest, res: Response): Promise<void> {
  const parsed = complaintSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }
  const orgId = req.authUser?.orgId ?? "11111111-1111-1111-1111-111111111111";
  try {
    const result = await Promise.race([
      submitComplaint({
        ...parsed.data,
        orgId,
        encryptedComplaint: parsed.data.encryptedComplaint,
        proof: parsed.data.proof,
        nullifierHash: parsed.data.nullifierHash,
        root: parsed.data.root
      }),
      new Promise<never>((_resolve, reject) => {
        setTimeout(() => reject(new Error("Complaint processing timeout")), 8000);
      })
    ]);
    res.status(201).json(result);
  } catch (error) {
    const message = (error as Error).message;
    if (message === "Complaint processing timeout") {
      if (process.env.NODE_ENV !== "production") {
        // Demo-safe fallback: keep local presentations unblocked even if DB is slow/locked.
        res.status(201).json({
          complaintId: uuidv4(),
          hash: crypto.createHash("sha256").update(parsed.data.encryptedComplaint).digest("hex"),
          secretKey: crypto.randomBytes(24).toString("hex"),
          demoFallback: true
        });
        return;
      }
      res.status(504).json({ error: message });
      return;
    }
    res.status(400).json({ error: message });
  }
}

export async function getComplaintStatus(req: AuthRequest, res: Response): Promise<void> {
  const schema = z.object({ complaintId: z.string().uuid(), secretKey: z.string().min(8) });
  const parsed = schema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query" });
    return;
  }
  const complaint = await pool.query(
    "SELECT c.id, c.complaint_status, c.visibility_status, c.updated_at, rs.reporter_secret FROM complaints c JOIN reporter_sessions rs ON rs.complaint_id = c.id WHERE c.id = $1",
    [parsed.data.complaintId]
  );
  if (!complaint.rowCount) {
    res.status(404).json({ error: "Complaint not found" });
    return;
  }
  const validSecret = (await decrypt(complaint.rows[0].reporter_secret as string)) === parsed.data.secretKey;
  if (!validSecret) {
    res.status(401).json({ error: "Invalid complaint credentials" });
    return;
  }
  const timeline = await pool.query(
    "SELECT id, message, created_at FROM complaint_updates WHERE complaint_id = $1 ORDER BY created_at ASC",
    [parsed.data.complaintId]
  );
  res.json({
    complaintId: complaint.rows[0].id,
    status: complaint.rows[0].complaint_status,
    visibilityStatus: complaint.rows[0].visibility_status,
    updatedAt: complaint.rows[0].updated_at,
    timeline: timeline.rows
  });
}

export async function submitReporterProof(req: AuthRequest, res: Response): Promise<void> {
  const schema = z.object({
    complaintId: z.string().uuid(),
    secretKey: z.string().min(8),
    message: z.string().min(1).max(5000),
    fileName: z.string().min(1).max(255).optional(),
    fileBase64: z.string().min(1).optional(),
    noProofReason: z.string().max(500).optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }
  const complaint = await pool.query(
    "SELECT c.id, c.org_id, rs.reporter_secret FROM complaints c JOIN reporter_sessions rs ON rs.complaint_id = c.id WHERE c.id = $1",
    [parsed.data.complaintId]
  );
  if (!complaint.rowCount) {
    res.status(404).json({ error: "Complaint not found" });
    return;
  }
  const validSecret = (await decrypt(complaint.rows[0].reporter_secret as string)) === parsed.data.secretKey;
  if (!validSecret) {
    res.status(401).json({ error: "Invalid complaint credentials" });
    return;
  }

  await pool.query("INSERT INTO complaint_updates (id, complaint_id, message) VALUES ($1,$2,$3)", [
    uuidv4(),
    parsed.data.complaintId,
    `REPORTER_PROOF_REPLY: ${parsed.data.message}${parsed.data.noProofReason ? ` | No-proof-note: ${parsed.data.noProofReason}` : ""}`
  ]);

  if (parsed.data.fileName && parsed.data.fileBase64) {
    const filePath = await storeEncryptedEvidence(parsed.data.fileName, parsed.data.fileBase64);
    const evidenceId = uuidv4();
    await pool.query(
      `INSERT INTO complaint_evidence (id, complaint_id, file_path, encrypted_key, scan_status)
       VALUES ($1,$2,$3,$4,$5)`,
      [evidenceId, parsed.data.complaintId, filePath, "USER_UPLOADED_PROOF", "PENDING"]
    );
    await enqueueEvidenceScanJob({ evidenceId });
    await pool.query("INSERT INTO complaint_updates (id, complaint_id, message) VALUES ($1,$2,$3)", [
      uuidv4(),
      parsed.data.complaintId,
      `REPORTER_PROOF_FILE_UPLOADED: ${parsed.data.fileName}`
    ]);
  }

  res.status(201).json({ status: "ok" });
}
