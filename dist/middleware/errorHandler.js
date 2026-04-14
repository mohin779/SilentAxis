"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
function errorHandler(err, _req, res, _next) {
    res.status(500).json({
        error: "Internal server error",
        detail: process.env.NODE_ENV === "production" ? undefined : err.message
    });
}
