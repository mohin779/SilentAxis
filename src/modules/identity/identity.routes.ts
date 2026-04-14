import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { enforceDeviceBinding } from "../../middleware/deviceBinding";
import { enforceIdentityDrop } from "../../middleware/identityDrop";
import { registerIdentity } from "./identity.controller";

export const identityRouter = Router();

identityRouter.post("/register", requireAuth, enforceDeviceBinding, enforceIdentityDrop, registerIdentity);
