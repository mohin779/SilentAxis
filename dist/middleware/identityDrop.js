"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enforceIdentityDrop = enforceIdentityDrop;
/**
 * Security boundary:
 * Authentication is used only for access, not for attribution.
 * This middleware drops user-level identifiers before complaint logic executes.
 */
function enforceIdentityDrop(req, _res, next) {
    if (req.authUser) {
        req.authUser = {
            userId: "ANON_DROPPED",
            email: "ANON_DROPPED",
            orgId: req.authUser.orgId,
            role: req.authUser.role,
            sessionId: req.authUser.sessionId
        };
    }
    next();
}
