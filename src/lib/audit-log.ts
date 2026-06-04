import type { NextRequest } from "next/server";

import { getClientIp, getClientUserAgent } from "@/lib/auth";
import { log } from "@/lib/logger";
import { queryWithRetry, sql } from "@/lib/db-singleton";

export type AuditSeverity = "info" | "warning" | "critical";

export type AuditEventInput = {
  action: string;
  actorUsername?: string | null;
  actorRole?: string | null;
  resourceType?: string | null;
  resourceId?: string | number | null;
  status?: "success" | "failure" | "denied";
  severity?: AuditSeverity;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
};

let ensureAuditLogsTablePromise: Promise<void> | null = null;

function sanitizeMetadata(metadata: Record<string, unknown> | null | undefined): Record<string, unknown> {
  if (!metadata) return {};

  const sensitiveKeyPattern = /(password|token|secret|cookie|authorization|api[_-]?key|session)/i;
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(metadata)) {
    sanitized[key] = sensitiveKeyPattern.test(key) ? "[REDACTED]" : value;
  }

  return sanitized;
}

export async function ensureAuditLogsTable(): Promise<void> {
  if (ensureAuditLogsTablePromise) return ensureAuditLogsTablePromise;

  ensureAuditLogsTablePromise = (async () => {
    await queryWithRetry(
      async () => sql`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id BIGSERIAL PRIMARY KEY,
          action VARCHAR(120) NOT NULL,
          actor_username VARCHAR(32),
          actor_role VARCHAR(32),
          resource_type VARCHAR(80),
          resource_id VARCHAR(120),
          status VARCHAR(20) NOT NULL DEFAULT 'success',
          severity VARCHAR(20) NOT NULL DEFAULT 'info',
          ip_address VARCHAR(64),
          user_agent TEXT,
          metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `,
      "ensureAuditLogsTable"
    );

    await queryWithRetry(
      async () => sql`
        CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC)
      `,
      "ensureAuditLogsTable-created-index"
    );

    await queryWithRetry(
      async () => sql`
        CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_username, created_at DESC)
      `,
      "ensureAuditLogsTable-actor-index"
    );

    await queryWithRetry(
      async () => sql`
        CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id)
      `,
      "ensureAuditLogsTable-resource-index"
    );
  })().finally(() => {
    ensureAuditLogsTablePromise = null;
  });

  return ensureAuditLogsTablePromise;
}

export async function recordAuditEvent(event: AuditEventInput): Promise<void> {
  const safeMetadata = sanitizeMetadata(event.metadata);

  try {
    await ensureAuditLogsTable();
    await queryWithRetry(
      async () => sql`
        INSERT INTO audit_logs (
          action,
          actor_username,
          actor_role,
          resource_type,
          resource_id,
          status,
          severity,
          ip_address,
          user_agent,
          metadata
        )
        VALUES (
          ${event.action},
          ${event.actorUsername || null},
          ${event.actorRole || null},
          ${event.resourceType || null},
          ${event.resourceId == null ? null : String(event.resourceId)},
          ${event.status || "success"},
          ${event.severity || "info"},
          ${event.ipAddress || null},
          ${event.userAgent || null},
          ${JSON.stringify(safeMetadata)}::jsonb
        )
      `,
      `recordAuditEvent:${event.action}`,
      1
    );
  } catch (error) {
    log("WARN", "Audit event could not be persisted", {
      action: event.action,
      actorUsername: event.actorUsername,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      status: event.status,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export function auditEventFromRequest(
  req: NextRequest,
  event: Omit<AuditEventInput, "ipAddress" | "userAgent">
): AuditEventInput {
  return {
    ...event,
    ipAddress: getClientIp(req.headers),
    userAgent: getClientUserAgent(req.headers),
  };
}

export async function logAuditEvent(
  req: NextRequest,
  session: { username?: string | null; role?: string | null },
  event: {
    action: string;
    entityType?: string | null;
    entityId?: string | number | null;
    metadata?: Record<string, unknown> | null;
    status?: "success" | "failure" | "denied";
    severity?: AuditSeverity;
  }
): Promise<void> {
  await recordAuditEvent(auditEventFromRequest(req, {
    action: event.action,
    actorUsername: session.username || null,
    actorRole: session.role || null,
    resourceType: event.entityType || null,
    resourceId: event.entityId ?? null,
    status: event.status || "success",
    severity: event.severity || "info",
    metadata: event.metadata || null,
  }));
}
