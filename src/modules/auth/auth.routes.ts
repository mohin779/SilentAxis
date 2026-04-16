import { Router } from "express";
import { login } from "./auth.controller";
import { startEmployeeOtp, verifyEmployeeOtp } from "./employeeOtp.controller";

export const authRouter = Router();

authRouter.post("/login", login);
authRouter.post("/verify-employee", startEmployeeOtp);
authRouter.post("/verify-otp", verifyEmployeeOtp);
