import { errorHandler } from "./middleware/error-handler.js";
import { requestContext } from "./middleware/request-context.js";
import {
  securityHeaders,
  apiRateLimit,
} from "./middleware/security.js";
import express from "express";
import cookieParser from "cookie-parser";

import { checkRedis } from "./queue/redis.js";
import { db, pool } from "./db/index.js";
import { users } from "./db/schema.js";
import { env } from "./config/env.js";
import { authRouter } from "./auth/routes.js";
import { usersRouter } from "./users/routes.js";
import { projectsRouter } from "./projects/routes.js";
import { metricsMiddleware } from "./middleware/metrics.js";
import {
  register,
  updateAuditQueueMetrics,
} from "./metrics/index.js";

export const app = express();

app.set("trust proxy", 1);

app.use(requestContext);
app.use(metricsMiddleware);
app.use(securityHeaders);
app.use(apiRateLimit);

app.use(express.json());
app.use(cookieParser());

app.use("/auth", authRouter);
app.use("/users", usersRouter);
app.use("/projects", projectsRouter);

app.get("/metrics", async (_req, res) => {
  try {
    await updateAuditQueueMetrics();

    res.setHeader("Content-Type", register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    console.error("Metrics collection failed:", error);

    res.status(503).json({
      status: "error",
      message: "Metrics unavailable",
    });
  }
});

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    api: "healthy",
    timestamp: new Date().toISOString(),
  });
});

app.get("/health/live", (_req, res) => {
  res.status(200).json({
    status: "ok",
    live: true,
    timestamp: new Date().toISOString(),
  });
});

app.get("/health/ready", async (_req, res) => {
  const checks = {
    database: "unknown",
    redis: "unknown",
  };

  const results = await Promise.allSettled([
    pool.query("SELECT 1"),
    checkRedis(),
  ]);

  checks.database = results[0].status === "fulfilled"
    ? "healthy"
    : "unhealthy";

  checks.redis = results[1].status === "fulfilled"
    ? "healthy"
    : "unhealthy";

  const ready = results.every((result) => result.status === "fulfilled");

  if (!ready) {
    console.error("Readiness check failed:", results);

    res.status(503).json({
      status: "not_ready",
      checks,
      timestamp: new Date().toISOString(),
    });

    return;
  }

  res.status(200).json({
    status: "ready",
    checks,
    timestamp: new Date().toISOString(),
  });
});

app.get("/health/db", async (_req, res) => {
  try {
    const result = await db
      .select({ id: users.id })
      .from(users)
      .limit(1);

    res.json({
      status: "ok",
      database: "healthy",
      query: "drizzle",
      usersTableAccessible: true,
      rowsFound: result.length,
    });
  } catch (error) {
    console.error("Drizzle database check failed:", error);

    res.status(503).json({
      status: "error",
      database: "unhealthy",
      query: "drizzle",
    });
  }
});

app.use(errorHandler);
