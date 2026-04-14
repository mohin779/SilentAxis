"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = login;
const zod_1 = require("zod");
const auth_service_1 = require("./auth.service");
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email()
});
function login(req, res) {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
    }
    try {
        const result = (0, auth_service_1.loginWithMockSso)(parsed.data.email);
        res.json(result);
    }
    catch (error) {
        res.status(403).json({ error: error.message });
    }
}
