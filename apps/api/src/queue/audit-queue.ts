import { Queue } from "bullmq";

import { redisConnection } from "./redis.js";

export const AUDIT_QUEUE_NAME = "audit-events";

export type AuditJobData = {
  requestId: string;
  userId: string | null;
  action:
    | "register"
    | "login_success"
    | "login_failure"
    | "logout"
    | "project_created"
    | "member_added"
    | "member_removed"
    | "role_changed"
    | "access_denied";
  resource: string | null;
  resourceId: string | null;
  success: boolean;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown> | null;
};

export const auditQueue = new Queue<AuditJobData>(
  AUDIT_QUEUE_NAME,
  {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 5,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
      removeOnComplete: {
        age: 24 * 60 * 60,
        count: 1000,
      },
      removeOnFail: false,
    },
  },
);

