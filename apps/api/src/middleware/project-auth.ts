import type { NextFunction, Request, Response } from "express";

import { AppError } from "../errors/app-error.js";
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
    _res: Response,
    next: NextFunction,
  ) => {
    if (!req.user) {
      throw new AppError(
        401,
        "AUTHENTICATION_REQUIRED",
        "Authentication required",
      );
    }

    const projectId = req.params.id;

    if (typeof projectId !== "string" || !projectId) {
      throw new AppError(
        400,
        "INVALID_PROJECT_ID",
        "Invalid project ID",
      );
    }

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

      throw new AppError(
        403,
        "INSUFFICIENT_PROJECT_PERMISSIONS",
        "Insufficient project permissions",
      );
    }

    return next();
  };
}
