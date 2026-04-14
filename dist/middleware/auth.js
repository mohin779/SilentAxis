"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.requireRole = requireRole;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
function requireAuth(req, res, next) {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    try {
        req.authUser = jsonwebtoken_1.default.verify(token, env_1.env.jwtSecret);
        next();
    }
    catch {
        res.status(401).json({ error: "Invalid token" });
    }
}
function requireRole(roles) {
    return (req, res, next) => {
        if (!req.authUser || !roles.includes(req.authUser.role)) {
            res.status(403).json({ error: "Forbidden" });
            return;
        }
        next();
    };
}
