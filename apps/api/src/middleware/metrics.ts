import type { NextFunction, Request, Response } from "express";

import {
  httpRequestDurationSeconds,
  httpRequestsInFlight,
  httpRequestsTotal,
} from "../metrics/index.js";

export function metricsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (req.path === "/metrics") {
    next();
    return;
  }

  const start = process.hrtime.bigint();

  httpRequestsInFlight.inc();

  res.on("finish", () => {
    const durationSeconds =
      Number(process.hrtime.bigint() - start) / 1_000_000_000;

    const route =
      req.route?.path
        ? req.baseUrl + req.route.path
        : req.path;

    const statusCode = String(res.statusCode);

    httpRequestsTotal.inc({
      method: req.method,
      route,
      status_code: statusCode,
    });

    httpRequestDurationSeconds.observe(
      {
        method: req.method,
        route,
        status_code: statusCode,
      },
      durationSeconds,
    );

    httpRequestsInFlight.dec();
  });

  next();
}
