import { NextFunction, Request, Response } from "express";

const suspicious = /(\b(SELECT|UNION|INSERT|UPDATE|DELETE|DROP|ALTER)\b|--|;|'|"|\/\*|\*\/)/i;

function hasSuspiciousValue(value: unknown): boolean {
  if (typeof value === "string") return suspicious.test(value);
  if (Array.isArray(value)) return value.some((v) => hasSuspiciousValue(v));
  if (value && typeof value === "object") {
    return Object.values(value).some((v) => hasSuspiciousValue(v));
  }
  return false;
}

export function sqlInjectionGuard(req: Request, res: Response, next: NextFunction): void {
  if (
    hasSuspiciousValue(req.params) ||
    hasSuspiciousValue(req.query) ||
    hasSuspiciousValue(req.body)
  ) {
    res.status(400).json({ error: "Potentially unsafe input" });
    return;
  }
  next();
}
