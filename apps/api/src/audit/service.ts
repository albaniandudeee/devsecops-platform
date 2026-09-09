import type { Request } from "express";

import { auditQueue } from "../queue/audit-queue.js";
import type { InferInsertModel } from "drizzle-orm";
import { auditLogs } from "../db/schema.js";

type AuditLogInsert = InferInsertModel<typeof auditLogs>;

export type AuditEvent = {
  action: AuditLogInsert["action"];
  userId?: string | null;
  resource?: string | null;
  resourceId?: string | null;
  success?: boolean;
  metadata?: Record<string, unknown> | null;
};

export async function recordAuditEvent(
  req: Request,
  event: AuditEvent,
): Promise<void> {
  await auditQueue.add("audit-event", {
    requestId: req.requestId,
    action: event.action,
    userId: event.userId ?? null,
    resource: event.resource ?? null,
    resourceId: event.resourceId ?? null,
    success: event.success ?? true,
    ipAddress: req.clientIp,
    userAgent: req.userAgent,
    metadata: event.metadata ?? null,
  });
}
