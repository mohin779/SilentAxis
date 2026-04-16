"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const express_session_1 = __importDefault(require("express-session"));
const connect_redis_1 = require("connect-redis");
const env_1 = require("./config/env");
const auth_routes_1 = require("./modules/auth/auth.routes");
const identity_routes_1 = require("./modules/identity/identity.routes");
const complaints_routes_1 = require("./modules/complaints/complaints.routes");
const admin_routes_1 = require("./modules/admin/admin.routes");
const rateLimit_1 = require("./middleware/rateLimit");
const errorHandler_1 = require("./middleware/errorHandler");
const requestAuditLog_1 = require("./middleware/requestAuditLog");
const torHeaders_1 = require("./middleware/torHeaders");
const reporter_routes_1 = require("./modules/reporter/reporter.routes");
const redis_1 = require("./config/redis");
const staffAuth_routes_1 = require("./modules/staffAuth/staffAuth.routes");
exports.app = (0, express_1.default)();
exports.app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"]
        }
    }
}));
exports.app.use((0, cors_1.default)({
    origin: env_1.env.corsOrigin,
    methods: ["GET", "POST"],
    credentials: true
}));
exports.app.use(express_1.default.json({ limit: "5mb" }));
exports.app.use(rateLimit_1.apiRateLimit);
exports.app.use(torHeaders_1.torHeaders);
exports.app.use(requestAuditLog_1.requestAuditLog);
exports.app.use((0, express_session_1.default)({
    name: "silentaxis.sid",
    secret: env_1.env.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: false, // set true behind HTTPS
        maxAge: 1000 * 60 * 60 * 2
    },
    // Default to memory store for reliable local development.
    // Set SESSION_STORE=redis to explicitly use Redis-backed sessions.
    ...(process.env.SESSION_STORE === "redis" ? { store: new connect_redis_1.RedisStore({ client: redis_1.redis }) } : {})
}));
exports.app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
});
exports.app.use("/auth", auth_routes_1.authRouter);
exports.app.use("/staff-auth", staffAuth_routes_1.staffAuthRouter);
exports.app.use("/identity", identity_routes_1.identityRouter);
exports.app.use("/complaints", complaints_routes_1.complaintsRouter);
exports.app.use("/reporter", reporter_routes_1.reporterRouter);
exports.app.use("/", admin_routes_1.adminRouter);
exports.app.use(errorHandler_1.errorHandler);
