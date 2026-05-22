import type { NextRequest } from "next/server";
import type { SessionPayload } from "@/lib/auth";
import { dbManager } from "@/lib/db-singleton";
import { getClientIp, getClientUserAgent } from "@/lib/network";

type AuditEvent = {
  action: string;
  entityType?: string;
  entityId?: string | number | null;
  metadata?: Record<string, unknown>;
};

let auditTableReady: Promise<void> | null = null;

async function ensureAuditLogTable(): Promise<void> {
  if (!auditTableReady) {
    auditTableReady = (async () => {
      await dbManager.executeUnsafe(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id BIGSERIAL PRIMARY KEY,
          actor_username TEXT,
          actor_role TEXT,
          action TEXT NOT NULL,
          entity_type TEXT,
          entity_id TEXT,
          metadata JSONB DEFAULT '{}'::jsonb,
          ip_address TEXT,
          user_agent TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await dbManager.executeUnsafe(`
        CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_created
        ON audit_logs (actor_username, created_at DESC)
      `);

      await dbManager.executeUnsafe(`
        CREATE INDEX IF NOT EXISTS idx_audit_logs_action_created
        ON audit_logs (action, created_at DESC)
      `);

      await dbManager.executeUnsafe(`
        CREATE INDEX IF NOT EXISTS idx_audit_logs_entity
        ON audit_logs (entity_type, entity_id)
      `);
    })().catch((error) => {
      auditTableReady = null;
      throw error;
    });
  }

  await auditTableReady;
}

export async function logAuditEvent(
  request: NextRequest,
  session: SessionPayload | null,
  event: AuditEvent
): Promise<void> {
  try {
    await ensureAuditLogTable();

    await dbManager.executeUnsafe(
      `
        INSERT INTO audit_logs (
          actor_username,
          actor_role,
          action,
          entity_type,
          entity_id,
          metadata,
          ip_address,
          user_agent
        )
        VALUES ($1, $2, $3, $4, $5, COALESCE($6::jsonb, '{}'::jsonb), $7, $8)
      `,
      [
        session?.username ?? null,
        session?.role ?? null,
        event.action,
        event.entityType ?? null,
        event.entityId == null ? null : String(event.entityId),
        JSON.stringify(event.metadata ?? {}),
        getClientIp(request.headers),
        getClientUserAgent(request.headers),
      ]
    );
  } catch (error) {
    console.error("[audit-log] Failed to write audit event:", error);
  }
}
