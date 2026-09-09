import type { NextFunction, Request, Response } from "express";

import { getUserFromSession } from "../auth/session.js";

export type AuthenticatedUser = {
  id: string;
  email: string;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      sessionId?: string;
    }
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const sessionToken = req.cookies.session;

  if (!sessionToken) {
    return res.status(401).json({
      status: "error",
      message: "Authentication required",
    });
  }

  try {
    const session = await getUserFromSession(sessionToken);

    if (!session) {
      return res.status(401).json({
        status: "error",
        message: "Invalid or expired session",
      });
    }

    req.user = {
      id: session.userId,
      email: session.email,
    };

    req.sessionId = session.sessionId;

    return next();
  } catch (error) {
    console.error("Authentication middleware failed:", error);

    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
}
