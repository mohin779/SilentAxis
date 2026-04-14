import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import { enforceOrgIsolation } from "../../middleware/orgIsolation";
import {
  addUpdate,
  createExportJob,
  getAdminStats,
  getTimeline,
  listComplaints
} from "./admin.controller";

export const adminRouter = Router();

adminRouter.get(
  "/org/:orgId/complaints",
  requireAuth,
  enforceOrgIsolation,
  requireRole(["ORG_ADMIN", "ORG_STAFF"]),
  listComplaints
);
adminRouter.get("/complaints/:id/timeline", requireAuth, requireRole(["ORG_ADMIN", "ORG_STAFF"]), getTimeline);
adminRouter.post("/complaints/:id/update", requireAuth, requireRole(["ORG_ADMIN", "ORG_STAFF"]), addUpdate);
adminRouter.post("/admin/export", requireAuth, requireRole(["ORG_ADMIN"]), createExportJob);
adminRouter.get("/admin/stats", requireAuth, requireRole(["ORG_ADMIN", "ORG_STAFF"]), getAdminStats);
