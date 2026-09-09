import {
  collectDefaultMetrics,
  Counter,
  Gauge,
  Histogram,
  register,
} from "@prometheus-io/client";

import { getDatabasePoolMetrics } from "../db/index.js";
import { auditQueue } from "../queue/audit-queue.js";

collectDefaultMetrics();

export const httpRequestsTotal = new Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"],
});

export const databasePoolTotalConnections = new Gauge({
  name: "database_pool_total_connections",
  help: "Total number of PostgreSQL connections currently managed by the pool",
});

export const databasePoolIdleConnections = new Gauge({
  name: "database_pool_idle_connections",
  help: "Number of idle PostgreSQL connections currently available in the pool",
});

export const databasePoolWaitingRequests = new Gauge({
  name: "database_pool_waiting_requests",
  help: "Number of requests currently waiting for a PostgreSQL connection",
});

export const httpRequestDurationSeconds = new Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

export const httpRequestsInFlight = new Gauge({
  name: "http_requests_in_flight",
  help: "Number of HTTP requests currently being processed",
});

export const auditQueueWaiting = new Gauge({
  name: "audit_queue_waiting",
  help: "Number of audit jobs waiting to be processed",
});

export const auditQueueActive = new Gauge({
  name: "audit_queue_active",
  help: "Number of audit jobs currently being processed",
});

export const auditQueueCompleted = new Gauge({
  name: "audit_queue_completed",
  help: "Number of completed audit jobs retained by BullMQ",
});

export const auditQueueFailed = new Gauge({
  name: "audit_queue_failed",
  help: "Number of failed audit jobs retained by BullMQ",
});

export const auditQueueDelayed = new Gauge({
  name: "audit_queue_delayed",
  help: "Number of delayed audit jobs waiting for their scheduled execution time",
});

register.registerMetric(httpRequestsTotal);
register.registerMetric(httpRequestDurationSeconds);
register.registerMetric(httpRequestsInFlight);
register.registerMetric(auditQueueWaiting);
register.registerMetric(auditQueueActive);
register.registerMetric(auditQueueCompleted);
register.registerMetric(auditQueueFailed);
register.registerMetric(auditQueueDelayed);
register.registerMetric(databasePoolTotalConnections);
register.registerMetric(databasePoolIdleConnections);
register.registerMetric(databasePoolWaitingRequests);

export async function updateAuditQueueMetrics(): Promise<void> {
  const counts = await auditQueue.getJobCounts(
    "waiting",
    "active",
    "completed",
    "failed",
    "delayed",
  );

  auditQueueWaiting.set(counts.waiting ?? 0);
  auditQueueActive.set(counts.active ?? 0);
  auditQueueCompleted.set(counts.completed ?? 0);
  auditQueueFailed.set(counts.failed ?? 0);
  auditQueueDelayed.set(counts.delayed ?? 0);

  const databasePool = getDatabasePoolMetrics();

  databasePoolTotalConnections.set(databasePool.totalConnections);
  databasePoolIdleConnections.set(databasePool.idleConnections);
  databasePoolWaitingRequests.set(databasePool.waitingRequests);
}

export { register };
