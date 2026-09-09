import { db } from "../db/index.js";
import { auditLogs } from "../db/schema.js";
import type { InferInsertModel } from "drizzle-orm";
import type { Request } from "express";

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
  await db.insert(auditLogs).values({
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
