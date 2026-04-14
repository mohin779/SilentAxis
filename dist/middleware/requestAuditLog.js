"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestAuditLog = requestAuditLog;
function requestAuditLog(req, res, next) {
    const startedAt = Date.now();
    res.on("finish", () => {
        const event = {
            timestamp: new Date(startedAt).toISOString(),
            route: req.originalUrl,
            status: res.statusCode,
            errorCode: res.statusCode >= 400 ? `HTTP_${res.statusCode}` : null
        };
        // Avoid metadata leakage: no IP, UA, headers, or device identifiers.
        // eslint-disable-next-line no-console
        console.log(JSON.stringify(event));
    });
    next();
}
