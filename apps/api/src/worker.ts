import { Worker } from "bullmq";

import { db, pool } from "./db/index.js";
import { auditLogs } from "./db/schema.js";
import {
  AUDIT_QUEUE_NAME,
  type AuditJobData,
} from "./queue/audit-queue.js";
import { redisConnection } from "./queue/redis.js";

const worker = new Worker<AuditJobData>(
  AUDIT_QUEUE_NAME,
  async (job) => {
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

    console.log(`Processed audit job ${job.id}`);
  },
  {
    connection: redisConnection,
    concurrency: 5,
  },
);

worker.on("completed", (job) => {
  console.log(`Audit job completed: ${job.id}`);
});

worker.on("failed", (job, error) => {
  console.error(`Audit job failed: ${job?.id}`, error);
});

worker.on("error", (error) => {
  console.error("Audit worker error:", error);
});

async function shutdown(signal: string): Promise<void> {
  console.log(`Received ${signal}. Shutting down audit worker...`);

  try {
    await worker.close();
    console.log("Audit worker closed");

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
