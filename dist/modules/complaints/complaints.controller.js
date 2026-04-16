"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createComplaint = createComplaint;
exports.uploadEvidence = uploadEvidence;
const zod_1 = require("zod");
const uuid_1 = require("uuid");
const db_1 = require("../../config/db");
const evidenceScan_queue_1 = require("../../queues/evidenceScan.queue");
const evidenceStorage_service_1 = require("../../services/evidenceStorage.service");
const encryptionPayload_1 = require("../../utils/encryptionPayload");
const complaints_service_1 = require("./complaints.service");
const complaintSchema = encryptionPayload_1.encryptedPayloadSchema.extend({
    proof: zod_1.z
        .object({
        pi_a: zod_1.z.tuple([zod_1.z.string(), zod_1.z.string()]).or(zod_1.z.tuple([zod_1.z.string(), zod_1.z.string(), zod_1.z.string()])),
        pi_b: zod_1.z
            .tuple([zod_1.z.tuple([zod_1.z.string(), zod_1.z.string()]), zod_1.z.tuple([zod_1.z.string(), zod_1.z.string()])])
            .or(zod_1.z.tuple([
            zod_1.z.tuple([zod_1.z.string(), zod_1.z.string()]),
            zod_1.z.tuple([zod_1.z.string(), zod_1.z.string()]),
            zod_1.z.tuple([zod_1.z.string(), zod_1.z.string()])
        ])),
        pi_c: zod_1.z.tuple([zod_1.z.string(), zod_1.z.string()]).or(zod_1.z.tuple([zod_1.z.string(), zod_1.z.string(), zod_1.z.string()])),
        protocol: zod_1.z.string().optional(),
        curve: zod_1.z.string().optional()
    })
        .optional(),
    category: zod_1.z.enum(["fraud", "harassment", "safety", "corruption", "other"]).default("other"),
    nullifierHash: zod_1.z.string().min(1).optional(),
    root: zod_1.z.string().min(1).optional()
});
async function createComplaint(req, res) {
    const parsed = complaintSchema.safeParse(req.body);
    if (!parsed.success || !req.authUser) {
        res.status(400).json({ error: "Invalid payload" });
        return;
    }
    if (!(0, encryptionPayload_1.validateEncryptedPayload)(parsed.data)) {
        res.status(400).json({ error: "Malformed encrypted payload" });
        return;
    }
    try {
        const result = await (0, complaints_service_1.submitComplaint)({
            ...parsed.data,
            orgId: req.authUser.orgId
        });
        res.status(201).json(result);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
}
const evidenceSchema = zod_1.z.object({
    fileName: zod_1.z.string().min(1),
    encryptedFileBase64: zod_1.z.string().min(1),
    encryptedKey: zod_1.z.string().min(1)
});
async function uploadEvidence(req, res) {
    const parsed = evidenceSchema.safeParse(req.body);
    if (!parsed.success || !req.authUser) {
        res.status(400).json({ error: "Invalid payload" });
        return;
    }
    const complaint = await db_1.pool.query("SELECT id, org_id FROM complaints WHERE id = $1", [req.params.id]);
    if (!complaint.rowCount || complaint.rows[0].org_id !== req.authUser.orgId) {
        res.status(404).json({ error: "Complaint not found" });
        return;
    }
    const filePath = await (0, evidenceStorage_service_1.storeEncryptedEvidence)(parsed.data.fileName, parsed.data.encryptedFileBase64);
    const evidenceId = (0, uuid_1.v4)();
    await db_1.pool.query("INSERT INTO complaint_evidence (id, complaint_id, file_path, encrypted_key, scan_status) VALUES ($1,$2,$3,$4,'PENDING')", [evidenceId, req.params.id, filePath, parsed.data.encryptedKey]);
    await evidenceScan_queue_1.evidenceScanQueue.add("scan-evidence", { evidenceId });
    res.status(201).json({ id: evidenceId, filePath });
}
