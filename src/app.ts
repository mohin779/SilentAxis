import cors from "cors";
import express from "express";
import helmet from "helmet";
import session from "express-session";
import { RedisStore } from "connect-redis";
import { env } from "./config/env";
import { authRouter } from "./modules/auth/auth.routes";
import { identityRouter } from "./modules/identity/identity.routes";
import { complaintsRouter } from "./modules/complaints/complaints.routes";
import { adminRouter } from "./modules/admin/admin.routes";
import { apiRateLimit } from "./middleware/rateLimit";
import { errorHandler } from "./middleware/errorHandler";
import { requestAuditLog } from "./middleware/requestAuditLog";
import { torHeaders } from "./middleware/torHeaders";
import { redisQueue } from "./config/redis";
import { staffAuthRouter } from "./modules/staffAuth/staffAuth.routes";

export const app = express();

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"]
      }
    }
  })
);
app.use(
  cors({
    origin: env.corsOrigin,
    methods: ["GET", "POST"],
    credentials: true
  })
);
app.use(express.json({ limit: "5mb" }));
app.use(apiRateLimit);
app.use(torHeaders);
app.use(requestAuditLog);

app.use(
  session({
    name: "silentaxis.sid",
    secret: env.sessionSecret,
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
    ...(process.env.SESSION_STORE === "redis" ? { store: new RedisStore({ client: redisQueue as any }) } : {})
  })
);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRouter);
app.use("/identity", identityRouter);
app.use("/staff-auth", staffAuthRouter);
app.use("/complaints", complaintsRouter);
app.use("/", adminRouter);

app.use(errorHandler);
