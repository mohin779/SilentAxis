import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env";
import { authRouter } from "./modules/auth/auth.routes";
import { identityRouter } from "./modules/identity/identity.routes";
import { complaintsRouter } from "./modules/complaints/complaints.routes";
import { adminRouter } from "./modules/admin/admin.routes";
import { apiRateLimit } from "./middleware/rateLimit";
import { errorHandler } from "./middleware/errorHandler";
import { requestAuditLog } from "./middleware/requestAuditLog";
import { torHeaders } from "./middleware/torHeaders";
import { reporterRouter } from "./modules/reporter/reporter.routes";

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
    credentials: false
  })
);
app.use(express.json({ limit: "5mb" }));
app.use(apiRateLimit);
app.use(torHeaders);
app.use(requestAuditLog);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRouter);
app.use("/identity", identityRouter);
app.use("/complaints", complaintsRouter);
app.use("/reporter", reporterRouter);
app.use("/", adminRouter);

app.use(errorHandler);
