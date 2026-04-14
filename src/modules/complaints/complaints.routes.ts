import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { enforceDeviceBinding } from "../../middleware/deviceBinding";
import { enforceIdentityDrop } from "../../middleware/identityDrop";
import { createComplaint, uploadEvidence } from "./complaints.controller";

export const complaintsRouter = Router();

complaintsRouter.post("/", requireAuth, enforceDeviceBinding, enforceIdentityDrop, createComplaint);
complaintsRouter.post("/:id/evidence", requireAuth, enforceDeviceBinding, enforceIdentityDrop, uploadEvidence);
