import { Router } from "express";
import { loginStaff, logoutStaff, whoami } from "./staffAuth.controller";

export const staffAuthRouter = Router();

staffAuthRouter.post("/login", loginStaff);
staffAuthRouter.post("/logout", logoutStaff);
staffAuthRouter.get("/me", whoami);

