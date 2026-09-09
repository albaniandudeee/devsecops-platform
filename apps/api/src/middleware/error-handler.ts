import type { ErrorRequestHandler } from "express";

import { AppError } from "../errors/app-error.js";

export const errorHandler: ErrorRequestHandler = (
  error,
  req,
  res,
  _next,
) => {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      status: "error",
      code: error.code,
      message: error.message,
      ...(error.details !== undefined
        ? { details: error.details }
        : {}),
      requestId: req.requestId,
    });
  }

  console.error("Unhandled application error:", {
    requestId: req.requestId,
    error,
  });

  return res.status(500).json({
    status: "error",
    code: "INTERNAL_SERVER_ERROR",
    message: "Internal server error",
    requestId: req.requestId,
  });
};
