"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptedPayloadSchema = void 0;
exports.validateEncryptedPayload = validateEncryptedPayload;
const zod_1 = require("zod");
exports.encryptedPayloadSchema = zod_1.z.object({
    encryptedComplaint: zod_1.z.string().min(1),
    encryptedKey: zod_1.z.string().min(1).optional()
});
function validateEncryptedPayload(payload) {
    return exports.encryptedPayloadSchema.safeParse(payload).success;
}
