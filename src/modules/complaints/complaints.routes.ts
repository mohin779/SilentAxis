import { Router } from "express";
import { createComplaint, getComplaintStatus, submitReporterProof } from "./complaints.controller";

export const complaintsRouter = Router();

complaintsRouter.post("/", createComplaint);
complaintsRouter.get("/status", getComplaintStatus);
complaintsRouter.post("/status/proof", submitReporterProof);
