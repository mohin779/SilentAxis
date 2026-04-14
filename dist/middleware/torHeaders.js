"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.torHeaders = torHeaders;
function torHeaders(req, _res, next) {
    const host = (req.headers.host ?? "").toString().toLowerCase();
    const forwardedProto = (req.headers["x-forwarded-proto"] ?? "").toString().toLowerCase();
    req.isOnionClient = host.endsWith(".onion") || forwardedProto.includes("onion");
    next();
}
