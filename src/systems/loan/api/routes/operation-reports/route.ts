import { NextRequest, NextResponse } from "next/server";

import { auditEventFromRequest, recordAuditEvent } from "@/lib/audit-log";
import { getSession } from "@/lib/auth-helpers";
import { queryWithRetry, sql } from "@/lib/db-singleton";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ReportRow = {
  id: string;
  report_date: string | Date;
  reporter_username: string;
  reporter_name: string;
  reporter_position: string;
  department: string;
  branch: string;
  status: "draft" | "submitted" | "reviewed" | "approved" | "returned";
  report_data: Record<string, unknown> | string;
  reviewed_by: string | null;
  reviewed_at: string | Date | null;
  review_comment: string;
  created_at: string | Date;
  updated_at: string | Date;
};

let tableReady = false;

async function ensureOperationReportsTable() {
  if (tableReady) return;
  await queryWithRetry(async () => sql`
    CREATE TABLE IF NOT EXISTS operation_reports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      report_date DATE NOT NULL,
      reporter_username VARCHAR(32) NOT NULL,
      reporter_name VARCHAR(100) NOT NULL DEFAULT '',
      reporter_position VARCHAR(100) NOT NULL DEFAULT '',
      department VARCHAR(100) NOT NULL DEFAULT '',
      branch VARCHAR(100) NOT NULL DEFAULT '',
      status VARCHAR(20) NOT NULL DEFAULT 'draft',
      report_data JSONB NOT NULL DEFAULT '{}'::jsonb,
      reviewed_by VARCHAR(32),
      reviewed_at TIMESTAMPTZ,
      review_comment TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (report_date, reporter_username)
    )
  `, "ensureOperationReportsTable");
  await queryWithRetry(async () => sql`
    ALTER TABLE operation_reports
      ADD COLUMN IF NOT EXISTS reviewed_by VARCHAR(32),
      ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS review_comment TEXT NOT NULL DEFAULT ''
  `, "operationReports-review-columns");
  await queryWithRetry(async () => sql`
    ALTER TABLE operation_reports DROP CONSTRAINT IF EXISTS operation_reports_status_check
  `, "operationReports-drop-status-check");
  await queryWithRetry(async () => sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'operation_reports_workflow_status_check'
          AND conrelid = 'operation_reports'::regclass
      ) THEN
        ALTER TABLE operation_reports ADD CONSTRAINT operation_reports_workflow_status_check
          CHECK (status IN ('draft', 'submitted', 'reviewed', 'approved', 'returned'));
      END IF;
    END $$
  `, "operationReports-status-check");
  await Promise.all([
    queryWithRetry(async () => sql`CREATE INDEX IF NOT EXISTS idx_operation_reports_date ON operation_reports(report_date DESC)`, "operationReports-date-index"),
    queryWithRetry(async () => sql`CREATE INDEX IF NOT EXISTS idx_operation_reports_reporter ON operation_reports(reporter_username, report_date DESC)`, "operationReports-reporter-index"),
  ]);
  tableReady = true;
}

function dateValue(value: string | Date) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
}

function timestampValue(value: string | Date) {
  return value instanceof Date ? value.toISOString() : String(value);
}

function canManageOperationReports(role: string) {
  const normalized = role.trim().toLocaleLowerCase();
  return ["admin", "manager / approver", "branch manager", "bm", "credit manager"].includes(normalized);
}

function mapReport(row: ReportRow) {
  let data = row.report_data;
  if (typeof data === "string") {
    try { data = JSON.parse(data) as Record<string, unknown>; } catch { data = {}; }
  }
  return {
    id: row.id,
    reportDate: dateValue(row.report_date),
    reporterUsername: row.reporter_username,
    reporterName: row.reporter_name,
    reporterPosition: row.reporter_position,
    department: row.department,
    branch: row.branch,
    status: row.status,
    data,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at ? timestampValue(row.reviewed_at) : null,
    reviewComment: row.review_comment || "",
    createdAt: timestampValue(row.created_at),
    updatedAt: timestampValue(row.updated_at),
  };
}

export async function GET(request: NextRequest) {
  const session = getSession(request);
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized - Please log in" }, { status: 401 });

  try {
    await ensureOperationReportsTable();
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from") || "1900-01-01";
    const to = searchParams.get("to") || "2999-12-31";
    const requestedReporter = searchParams.get("reporter")?.trim() || "";
    const reporter = canManageOperationReports(session.role) ? requestedReporter : session.username;
    const branch = searchParams.get("branch")?.trim() || "";
    const requestedLimit = Number.parseInt(searchParams.get("limit") || "200", 10);
    const limit = Math.min(500, Math.max(1, Number.isFinite(requestedLimit) ? requestedLimit : 200));
    const rows = await queryWithRetry(async () => sql<ReportRow>`
      SELECT * FROM operation_reports
      WHERE report_date BETWEEN ${from}::date AND ${to}::date
        AND (${reporter} = '' OR reporter_username = ${reporter})
        AND (${branch} = '' OR branch = ${branch})
      ORDER BY report_date DESC, updated_at DESC
      LIMIT ${limit}
    `, "listOperationReports");
    return NextResponse.json({ success: true, data: rows.map(mapReport) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Could not load operation reports" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = getSession(request);
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized - Please log in" }, { status: 401 });

  try {
    await ensureOperationReportsTable();
    const body = await request.json() as Record<string, unknown>;
    const reportDate = String(body.reportDate || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(reportDate)) return NextResponse.json({ success: false, error: "Choose a valid report date" }, { status: 400 });
    const status = body.status === "submitted" ? "submitted" : "draft";
    const reportData = body.data && typeof body.data === "object" && !Array.isArray(body.data) ? body.data as Record<string, unknown> : {};
    const serializedData = JSON.stringify(reportData);
    if (serializedData.length > 2_000_000) return NextResponse.json({ success: false, error: "Report data is too large" }, { status: 413 });

    const reporterName = String(body.reporterName || session.username).trim().slice(0, 100);
    const reporterPosition = String(body.reporterPosition || session.role).trim().slice(0, 100);
    const department = String(body.department || "").trim().slice(0, 100);
    const branch = String(body.branch || "").trim().slice(0, 100);
    const existing = await queryWithRetry(async () => sql<Pick<ReportRow, "status">>`
      SELECT status FROM operation_reports
      WHERE report_date = ${reportDate}::date AND reporter_username = ${session.username}
      LIMIT 1
    `, "findOperationReportForSave");
    if (existing[0] && !["draft", "returned"].includes(existing[0].status)) {
      return NextResponse.json({ success: false, error: "This report is locked for review. A manager must return it before it can be edited." }, { status: 409 });
    }
    const rows = await queryWithRetry(async () => sql<ReportRow>`
      INSERT INTO operation_reports (report_date, reporter_username, reporter_name, reporter_position, department, branch, status, report_data)
      VALUES (${reportDate}::date, ${session.username}, ${reporterName}, ${reporterPosition}, ${department}, ${branch}, ${status}, ${serializedData}::jsonb)
      ON CONFLICT (report_date, reporter_username) DO UPDATE SET
        reporter_name = EXCLUDED.reporter_name,
        reporter_position = EXCLUDED.reporter_position,
        department = EXCLUDED.department,
        branch = EXCLUDED.branch,
        status = EXCLUDED.status,
        report_data = EXCLUDED.report_data,
        reviewed_by = NULL,
        reviewed_at = NULL,
        review_comment = '',
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, "saveOperationReport");
    const report = mapReport(rows[0]);
    await recordAuditEvent(auditEventFromRequest(request, {
      action: status === "submitted" ? "operation_report.submit" : "operation_report.save_draft",
      actorUsername: session.username,
      actorRole: session.role,
      resourceType: "operation_report",
      resourceId: report.id,
      status: "success",
      metadata: { reportDate, branch },
    }));
    return NextResponse.json({ success: true, data: report });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Could not save operation report" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = getSession(request);
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized - Please log in" }, { status: 401 });
  if (!canManageOperationReports(session.role)) return NextResponse.json({ success: false, error: "Only Admin or Manager / Approver can review Operation Reports" }, { status: 403 });

  try {
    await ensureOperationReportsTable();
    const body = await request.json() as Record<string, unknown>;
    const id = String(body.id || "");
    const action = String(body.action || "");
    const comment = String(body.comment || "").trim().slice(0, 2000);
    if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ success: false, error: "Invalid report" }, { status: 400 });
    if (!["reviewed", "approved", "returned"].includes(action)) return NextResponse.json({ success: false, error: "Invalid review action" }, { status: 400 });
    if (action === "returned" && !comment) return NextResponse.json({ success: false, error: "Add a correction comment before returning the report" }, { status: 400 });

    const current = await queryWithRetry(async () => sql<Pick<ReportRow, "status" | "reporter_username">>`
      SELECT status, reporter_username FROM operation_reports WHERE id = ${id}::uuid LIMIT 1
    `, "findOperationReportForReview");
    if (!current[0]) return NextResponse.json({ success: false, error: "Report not found" }, { status: 404 });
    if (current[0].reporter_username === session.username) return NextResponse.json({ success: false, error: "You cannot review your own report" }, { status: 409 });
    const allowed = action === "reviewed" ? current[0].status === "submitted" : action === "approved" ? current[0].status === "reviewed" : ["submitted", "reviewed"].includes(current[0].status);
    if (!allowed) return NextResponse.json({ success: false, error: `This report cannot be marked ${action} from its current status` }, { status: 409 });

    const rows = await queryWithRetry(async () => sql<ReportRow>`
      UPDATE operation_reports SET
        status = ${action},
        reviewed_by = ${session.username},
        reviewed_at = CURRENT_TIMESTAMP,
        review_comment = ${comment},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}::uuid
      RETURNING *
    `, "reviewOperationReport");
    const report = mapReport(rows[0]);
    await recordAuditEvent(auditEventFromRequest(request, {
      action: `operation_report.${action}`,
      actorUsername: session.username,
      actorRole: session.role,
      resourceType: "operation_report",
      resourceId: report.id,
      status: "success",
      metadata: { reporterUsername: report.reporterUsername, reportDate: report.reportDate, comment },
    }));
    return NextResponse.json({ success: true, data: report });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Could not review operation report" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = getSession(request);
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized - Please log in" }, { status: 401 });

  try {
    await ensureOperationReportsTable();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id") || "";
    if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ success: false, error: "Invalid report" }, { status: 400 });

    const current = await queryWithRetry(async () => sql<Pick<ReportRow, "status" | "reporter_username" | "report_date">>`
      SELECT status, reporter_username, report_date FROM operation_reports WHERE id = ${id}::uuid LIMIT 1
    `, "findOperationReportForDelete");
    if (!current[0]) return NextResponse.json({ success: false, error: "Report not found" }, { status: 404 });

    const ownsReport = current[0].reporter_username === session.username;
    if (!ownsReport && !canManageOperationReports(session.role)) {
      return NextResponse.json({ success: false, error: "You can only delete your own report" }, { status: 403 });
    }

    await queryWithRetry(async () => sql`
      DELETE FROM operation_reports WHERE id = ${id}::uuid
    `, "deleteOperationReport");
    await recordAuditEvent(auditEventFromRequest(request, {
      action: "operation_report.delete",
      actorUsername: session.username,
      actorRole: session.role,
      resourceType: "operation_report",
      resourceId: id,
      status: "success",
      metadata: { reporterUsername: current[0].reporter_username, reportDate: dateValue(current[0].report_date) },
    }));
    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Could not delete operation report" }, { status: 500 });
  }
}
