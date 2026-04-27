import { Router } from "express";
import { requireStaffRole, requireStaffSession } from "../../middleware/staffSession";
import {
  addEmployee,
  addUpdate,
  createExportJob,
  decideApproval,
  getAdminStats,
  getComplaintDetail,
  getTimeline,
  importEmployeesCsv,
  listEmployees,
  listComplaints,
  requestProofFromReporter
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
adminRouter.get(
  "/complaints/:id",
  requireStaffSession,
  requireStaffRole(["ORG_ADMIN", "ORG_STAFF", "HR", "MANAGER", "REGIONAL_OFFICER"]),
  getComplaintDetail
);
adminRouter.post(
  "/complaints/:id/approval",
  requireStaffSession,
  requireStaffRole(["HR", "MANAGER", "REGIONAL_OFFICER"]),
  decideApproval
);
adminRouter.post(
  "/complaints/:id/request-proof",
  requireStaffSession,
  requireStaffRole(["HR", "MANAGER", "REGIONAL_OFFICER"]),
  requestProofFromReporter
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
