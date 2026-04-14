"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginReporter = loginReporter;
exports.createReporterAccess = createReporterAccess;
exports.postReporterMessage = postReporterMessage;
exports.listReporterMessages = listReporterMessages;
const zod_1 = require("zod");
const reporter_service_1 = require("./reporter.service");
const loginSchema = zod_1.z.object({
    complaintId: zod_1.z.string().uuid(),
    secret: zod_1.z.string().min(8)
});
const messageSchema = zod_1.z.object({
    complaintId: zod_1.z.string().uuid(),
    senderType: zod_1.z.enum(["reporter", "investigator"]),
    message: zod_1.z.string().min(1)
});
async function loginReporter(req, res) {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: "Invalid payload" });
        return;
    }
    const ok = await (0, reporter_service_1.reporterLogin)(parsed.data.complaintId, parsed.data.secret);
    if (!ok) {
        res.status(401).json({ error: "Invalid reporter credentials" });
        return;
    }
    res.json({ status: "ok" });
}
async function createReporterAccess(req, res) {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: "Invalid payload" });
        return;
    }
    await (0, reporter_service_1.createReporterSession)(parsed.data.complaintId, parsed.data.secret);
    res.status(201).json({ status: "created" });
}
async function postReporterMessage(req, res) {
    const parsed = messageSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: "Invalid payload" });
        return;
    }
    const id = await (0, reporter_service_1.addReporterMessage)(parsed.data);
    res.status(201).json({ id });
}
async function listReporterMessages(req, res) {
    const complaintId = zod_1.z.string().uuid().safeParse(req.params.complaintId);
    if (!complaintId.success) {
        res.status(400).json({ error: "Invalid complaint id" });
        return;
    }
    const messages = await (0, reporter_service_1.getReporterMessages)(complaintId.data);
    res.json(messages);
}
