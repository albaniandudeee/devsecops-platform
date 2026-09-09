import { errorHandler } from "./middleware/error-handler.js";
import { requestContext } from "./middleware/request-context.js";
import {
  securityHeaders,
  apiRateLimit,
} from "./middleware/security.js";
import express from "express";
import cookieParser from "cookie-parser";

import { db, pool } from "./db/index.js";
import { users } from "./db/schema.js";
import { env } from "./config/env.js";
import { authRouter } from "./auth/routes.js";
import { usersRouter } from "./users/routes.js";
import { projectsRouter } from "./projects/routes.js";

export const app = express();

app.use(requestContext);
app.use(securityHeaders);
app.use(apiRateLimit);

app.use(express.json());
app.use(cookieParser());

app.use("/auth", authRouter);
app.use("/users", usersRouter);
app.use("/projects", projectsRouter);

app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");

    res.json({
      status: "ok",
      api: "healthy",
      database: "healthy",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Database health check failed:", error);

    res.status(503).json({
      status: "error",
      api: "healthy",
      database: "unhealthy",
    });
  }
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
