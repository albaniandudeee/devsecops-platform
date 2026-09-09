import { createServer } from "node:http";

import { Worker } from "bullmq";
import {
  Counter,
  Gauge,
  Histogram,
  register,
} from "@prometheus-io/client";

import { db, pool } from "./db/index.js";
import { auditLogs } from "./db/schema.js";
import {
  AUDIT_QUEUE_NAME,
  type AuditJobData,
} from "./queue/audit-queue.js";
import { redisConnection } from "./queue/redis.js";

const workerJobsCompleted = new Counter({
  name: "worker_jobs_completed_total",
  help: "Total number of audit jobs successfully completed by the worker",
});

const workerJobsFailed = new Counter({
  name: "worker_jobs_failed_total",
  help: "Total number of audit jobs that failed in the worker",
});

const workerJobsActive = new Gauge({
  name: "worker_jobs_active",
  help: "Number of audit jobs currently being processed by the worker",
});

const workerJobDurationSeconds = new Histogram({
  name: "worker_job_duration_seconds",
  help: "Audit worker job processing duration in seconds",
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

register.registerMetric(workerJobsCompleted);
register.registerMetric(workerJobsFailed);
register.registerMetric(workerJobsActive);
register.registerMetric(workerJobDurationSeconds);

const worker = new Worker<AuditJobData>(
  AUDIT_QUEUE_NAME,
  async (job) => {
    const start = process.hrtime.bigint();

    workerJobsActive.inc();

    try {
      await db.insert(auditLogs).values({
        requestId: job.data.requestId,
        action: job.data.action,
        userId: job.data.userId,
        resource: job.data.resource,
        resourceId: job.data.resourceId,
        success: job.data.success,
        ipAddress: job.data.ipAddress,
        userAgent: job.data.userAgent,
        metadata: job.data.metadata,
      });
    } finally {
      const durationSeconds =
        Number(process.hrtime.bigint() - start) / 1_000_000_000;

      workerJobDurationSeconds.observe(durationSeconds);
      workerJobsActive.dec();
    }
  },
  {
    connection: redisConnection,
    concurrency: 5,
  },
);

worker.on("completed", (job) => {
  workerJobsCompleted.inc();

  console.log(`Audit job completed: ${job.id}`);
});

worker.on("failed", (job, error) => {
  workerJobsFailed.inc();

  console.error(`Audit job failed: ${job?.id}`, error);
});

worker.on("error", (error) => {
  console.error("Audit worker error:", error);
});

const metricsServer = createServer(async (req, res) => {
  if (req.method !== "GET" || req.url !== "/metrics") {
    res.statusCode = 404;
    res.end("Not Found");
    return;
  }

  try {
    res.statusCode = 200;
    res.setHeader("Content-Type", register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    console.error("Worker metrics collection failed:", error);

    res.statusCode = 503;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        status: "error",
        message: "Metrics unavailable",
      }),
    );
  }
});

await new Promise<void>((resolve) => {
  metricsServer.listen(3001, "0.0.0.0", () => {
    console.log("Worker metrics running on http://localhost:3001");
    resolve();
  });
});

async function shutdown(signal: string): Promise<void> {
  console.log(`Received ${signal}. Shutting down audit worker...`);

  try {
    await worker.close();
    console.log("Audit worker closed");

    await new Promise<void>((resolve, reject) => {
      metricsServer.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });

    console.log("Worker metrics server closed");

    await redisConnection.quit();
    console.log("Redis connection closed");

    await pool.end();
    console.log("PostgreSQL pool closed");

    process.exit(0);
  } catch (error) {
    console.error("Graceful shutdown failed:", error);
    process.exit(1);
  }
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

console.log("Audit worker started");
