import { Router } from "express";
import {
  createReporterAccess,
  listReporterMessages,
  loginReporter,
  postReporterMessage
} from "./reporter.controller";

export const reporterRouter = Router();

reporterRouter.post("/login", loginReporter);
reporterRouter.post("/session", createReporterAccess);
reporterRouter.post("/message", postReporterMessage);
reporterRouter.get("/messages/:complaintId", listReporterMessages);
