"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enforceOrgIsolation = enforceOrgIsolation;
function enforceOrgIsolation(req, res, next) {
    if (!req.authUser) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    const routeOrgId = req.params.orgId;
    if (routeOrgId && routeOrgId !== req.authUser.orgId) {
        res.status(403).json({ error: "Forbidden: org isolation violation" });
        return;
    }
    next();
}
