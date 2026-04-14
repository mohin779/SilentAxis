"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sqlInjectionGuard = sqlInjectionGuard;
const suspicious = /(\b(SELECT|UNION|INSERT|UPDATE|DELETE|DROP|ALTER)\b|--|;|'|"|\/\*|\*\/)/i;
function hasSuspiciousValue(value) {
    if (typeof value === "string")
        return suspicious.test(value);
    if (Array.isArray(value))
        return value.some((v) => hasSuspiciousValue(v));
    if (value && typeof value === "object") {
        return Object.values(value).some((v) => hasSuspiciousValue(v));
    }
    return false;
}
function sqlInjectionGuard(req, res, next) {
    if (hasSuspiciousValue(req.params) ||
        hasSuspiciousValue(req.query) ||
        hasSuspiciousValue(req.body)) {
        res.status(400).json({ error: "Potentially unsafe input" });
        return;
    }
    next();
}
