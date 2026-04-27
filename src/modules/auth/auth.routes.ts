import { Router } from "express";
import { startEmployeeOtp, verifyEmployeeOtp } from "./employeeOtp.controller";

export const authRouter = Router();

authRouter.post("/verify-employee", startEmployeeOtp);
authRouter.post("/verify-otp", verifyEmployeeOtp);
