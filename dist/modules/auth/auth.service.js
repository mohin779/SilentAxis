"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginWithMockSso = loginWithMockSso;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const uuid_1 = require("uuid");
const env_1 = require("../../config/env");
const orgDomainMap = {
    "employee@acme.com": { orgId: "11111111-1111-1111-1111-111111111111", role: "EMPLOYEE" },
    "admin@acme.com": { orgId: "11111111-1111-1111-1111-111111111111", role: "ORG_ADMIN" },
    "staff@acme.com": { orgId: "11111111-1111-1111-1111-111111111111", role: "ORG_STAFF" }
};
function loginWithMockSso(email) {
    const entry = orgDomainMap[email.toLowerCase()];
    if (!entry) {
        throw new Error("User is not part of an allowed organization");
    }
    // Decoy enterprise portal model: login does not imply complaint intent.
    const sessionId = (0, uuid_1.v4)();
    const token = jsonwebtoken_1.default.sign({
        userId: (0, uuid_1.v4)(),
        email,
        orgId: entry.orgId,
        role: entry.role,
        sessionId
    }, env_1.env.jwtSecret, { expiresIn: "1h" });
    return { token };
}
