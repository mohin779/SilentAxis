import { Router } from "express";
import { requireStaffRole, requireStaffSession } from "../../middleware/staffSession";
import {
  addEmployee,
  addUpdate,
  createExportJob,
  getAdminStats,
  getTimeline,
  importEmployeesCsv,
  listEmployees,
  listComplaints
} from "./admin.controller";

export const adminRouter = Router();

adminRouter.get(
  "/org/:orgId/complaints",
  requireStaffSession,
  requireStaffRole(["ORG_ADMIN", "ORG_STAFF", "HR", "MANAGER", "REGIONAL_OFFICER"]),
  listComplaints
);
adminRouter.get(
  "/complaints/:id/timeline",
  requireStaffSession,
  requireStaffRole(["ORG_ADMIN", "ORG_STAFF", "HR", "MANAGER", "REGIONAL_OFFICER"]),
  getTimeline
);
adminRouter.post(
  "/complaints/:id/update",
  requireStaffSession,
  requireStaffRole(["ORG_ADMIN", "ORG_STAFF", "HR"]),
  addUpdate
);
adminRouter.post("/admin/export", requireStaffSession, requireStaffRole(["ORG_ADMIN"]), createExportJob);
adminRouter.get("/admin/employees", requireStaffSession, requireStaffRole(["ORG_ADMIN"]), listEmployees);
adminRouter.post("/admin/employees", requireStaffSession, requireStaffRole(["ORG_ADMIN"]), addEmployee);
adminRouter.post("/admin/employees/import", requireStaffSession, requireStaffRole(["ORG_ADMIN"]), importEmployeesCsv);
adminRouter.get(
  "/admin/stats",
  requireStaffSession,
  requireStaffRole(["ORG_ADMIN", "ORG_STAFF", "HR", "MANAGER", "REGIONAL_OFFICER"]),
  getAdminStats
);
