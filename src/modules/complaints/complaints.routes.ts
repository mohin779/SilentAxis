import { Router } from "express";
import { createComplaint, getComplaintStatus } from "./complaints.controller";

export const complaintsRouter = Router();

complaintsRouter.post("/", createComplaint);
complaintsRouter.get("/status", getComplaintStatus);
