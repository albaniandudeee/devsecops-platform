import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      clientIp: string;
      userAgent: string | null;
    }
  }
}

export function requestContext(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const incomingRequestId = req.header("X-Request-ID");

  const requestId =
    incomingRequestId &&
    incomingRequestId.length <= 128 &&
    /^[a-zA-Z0-9._:-]+$/.test(incomingRequestId)
      ? incomingRequestId
      : randomUUID();

  req.requestId = requestId;

  req.clientIp =
    req.ip ||
    req.socket.remoteAddress ||
    "unknown";

  req.userAgent = req.get("user-agent") ?? null;

  res.setHeader("X-Request-ID", requestId);

  next();
}
