import { NextRequest, NextResponse } from "next/server";

import { requirePermission } from "@/lib/auth-helpers";
import { ensureAuditLogsTable } from "@/lib/audit-log";
import { dbManager } from "@/lib/db-singleton";

type Row = Record<string, unknown>;

export async function GET(req: NextRequest) {
  try {
    const auth = requirePermission(req, "settings:manage");
    if (auth.response) return auth.response;
    await ensureAuditLogsTable();
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim() || "";
    const severity = searchParams.get("severity")?.trim() || "";
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || 100), 1), 200);
    const params: unknown[] = [];
    const clauses: string[] = [];
    if (query) {
      params.push(`%${query}%`);
      clauses.push(`(action ILIKE $${params.length} OR COALESCE(actor_username, '') ILIKE $${params.length} OR COALESCE(resource_type, '') ILIKE $${params.length})`);
    }
    if (["info", "warning", "critical"].includes(severity)) {
      params.push(severity);
      clauses.push(`severity = $${params.length}`);
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    params.push(limit);
    const rows = await dbManager.executeUnsafe<Row>(`SELECT id, action, actor_username, actor_role, resource_type, resource_id, status, severity, metadata, created_at FROM audit_logs ${where} ORDER BY created_at DESC LIMIT $${params.length}`, params, 10_000);
    return NextResponse.json({ success: true, data: rows.map((row) => ({ id: String(row.id), action: String(row.action), actorUsername: row.actor_username == null ? null : String(row.actor_username), actorRole: row.actor_role == null ? null : String(row.actor_role), resourceType: row.resource_type == null ? null : String(row.resource_type), resourceId: row.resource_id == null ? null : String(row.resource_id), status: String(row.status), severity: String(row.severity), metadata: row.metadata ?? {}, createdAt: String(row.created_at) })) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Could not load audit logs" }, { status: 500 });
  }
}
