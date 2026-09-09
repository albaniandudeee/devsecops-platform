import type { NextFunction, Request, Response } from "express";
import { recordAuditEvent } from "../audit/service.js";

import {
  hasProjectRole,
  type ProjectRole,
} from "../projects/authorization.js";

export function requireProjectRole(
  minimumRole: ProjectRole,
) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    if (!req.user) {
      return res.status(401).json({
        status: "error",
        message: "Authentication required",
      });
    }

const projectId = req.params.id;

   if (typeof projectId !== "string") {
      return res.status(400).json({
        status: "error",
        message: "Invalid project ID",
      });
    }

    if (!projectId) {
      return res.status(400).json({
        status: "error",
        message: "Project ID is required",
      });
    }

    try {
      const allowed = await hasProjectRole(
        projectId,
        req.user.id,
        minimumRole,
      );

      if (!allowed) {
        await recordAuditEvent(req, {
          action: "access_denied",
          userId: req.user.id,
          resource: "project",
          resourceId: projectId,
          success: false,
          metadata: {
            requiredRole: minimumRole,
          },
        });

        return res.status(403).json({
          status: "error",
          message: "Insufficient project permissions",
        });
      }

      return next();
    } catch (error) {
      console.error("Project authorization failed:", error);

      return res.status(500).json({
        status: "error",
        message: "Internal server error",
      });
    }
  };
}
