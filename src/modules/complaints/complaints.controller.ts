import { Response } from "express";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { pool } from "../../config/db";
import { AuthRequest } from "../../middleware/auth";
import { evidenceScanQueue } from "../../queues/evidenceScan.queue";
import { storeEncryptedEvidence } from "../../services/evidenceStorage.service";
import { encryptedPayloadSchema, validateEncryptedPayload } from "../../utils/encryptionPayload";
import { submitComplaint } from "./complaints.service";

const complaintSchema = encryptedPayloadSchema.extend({
  proof: z
    .object({
      pi_a: z.tuple([z.string(), z.string()]).or(z.tuple([z.string(), z.string(), z.string()])),
      pi_b: z
        .tuple([z.tuple([z.string(), z.string()]), z.tuple([z.string(), z.string()])])
        .or(
          z.tuple([
            z.tuple([z.string(), z.string()]),
            z.tuple([z.string(), z.string()]),
            z.tuple([z.string(), z.string()])
          ])
        ),
      pi_c: z.tuple([z.string(), z.string()]).or(z.tuple([z.string(), z.string(), z.string()])),
      protocol: z.string().optional(),
      curve: z.string().optional()
    })
    .optional(),
  category: z.enum(["fraud", "harassment", "safety", "corruption", "other"]).default("other"),
  nullifierHash: z.string().min(1).optional(),
  root: z.string().min(1).optional()
});

export async function createComplaint(req: AuthRequest, res: Response): Promise<void> {
  const parsed = complaintSchema.safeParse(req.body);
  if (!parsed.success || !req.authUser) {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }
  if (!validateEncryptedPayload(parsed.data)) {
    res.status(400).json({ error: "Malformed encrypted payload" });
    return;
  }
  try {
    const result = await submitComplaint({
      ...parsed.data,
      orgId: req.authUser.orgId
    });
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
}

const evidenceSchema = z.object({
  fileName: z.string().min(1),
  encryptedFileBase64: z.string().min(1),
  encryptedKey: z.string().min(1)
});

export async function uploadEvidence(req: AuthRequest, res: Response): Promise<void> {
  const parsed = evidenceSchema.safeParse(req.body);
  if (!parsed.success || !req.authUser) {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }

  const complaint = await pool.query("SELECT id, org_id FROM complaints WHERE id = $1", [req.params.id]);
  if (!complaint.rowCount || complaint.rows[0].org_id !== req.authUser.orgId) {
    res.status(404).json({ error: "Complaint not found" });
    return;
  }

  const filePath = await storeEncryptedEvidence(parsed.data.fileName, parsed.data.encryptedFileBase64);
  const evidenceId = uuidv4();
  await pool.query(
    "INSERT INTO complaint_evidence (id, complaint_id, file_path, encrypted_key, scan_status) VALUES ($1,$2,$3,$4,'PENDING')",
    [evidenceId, req.params.id, filePath, parsed.data.encryptedKey]
  );
  await evidenceScanQueue.add("scan-evidence", { evidenceId });
  res.status(201).json({ id: evidenceId, filePath });
}
