import { NextFunction, Request, Response } from "express";

export interface TorAwareRequest extends Request {
  isOnionClient?: boolean;
}

export function torHeaders(req: TorAwareRequest, _res: Response, next: NextFunction): void {
  const host = (req.headers.host ?? "").toString().toLowerCase();
  const forwardedProto = (req.headers["x-forwarded-proto"] ?? "").toString().toLowerCase();
  req.isOnionClient = host.endsWith(".onion") || forwardedProto.includes("onion");
  next();
}
