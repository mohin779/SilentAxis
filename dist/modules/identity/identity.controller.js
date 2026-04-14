"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerIdentity = registerIdentity;
const zod_1 = require("zod");
const identity_service_1 = require("./identity.service");
const registerSchema = zod_1.z.object({
    commitment: zod_1.z.string().optional()
});
async function registerIdentity(req, res) {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success || !req.authUser) {
        res.status(400).json({ error: "Invalid request" });
        return;
    }
    const secret = (0, identity_service_1.generateSecret)();
    const commitment = parsed.data.commitment ?? (0, identity_service_1.commitmentFromSecret)(secret);
    const result = await (0, identity_service_1.registerCommitment)(req.authUser.orgId, commitment);
    res.json({ secret, commitment, ...result });
}
