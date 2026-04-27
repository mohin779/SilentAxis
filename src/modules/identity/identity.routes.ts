import { Router } from "express";
import { getIdentityProof, registerIdentity } from "./identity.controller";

export const identityRouter = Router();

identityRouter.post("/register", registerIdentity);
identityRouter.get("/proof", getIdentityProof);
