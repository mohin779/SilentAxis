import { Router } from "express";
import { requireComplaintAccess } from "../../middleware/complaintAccess";
import { enforceIdentityDrop } from "../../middleware/identityDrop";
import { createComplaint, uploadEvidence } from "./complaints.controller";

export const complaintsRouter = Router();

complaintsRouter.post("/", requireComplaintAccess, enforceIdentityDrop, createComplaint);
complaintsRouter.post("/:id/evidence", requireComplaintAccess, enforceIdentityDrop, uploadEvidence);
