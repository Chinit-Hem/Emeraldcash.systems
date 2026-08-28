import { NextRequest, NextResponse } from "next/server";

import { auditEventFromRequest, recordAuditEvent } from "@/lib/audit-log";
import { getSession } from "@/lib/auth-helpers";
import { queryWithRetry, sql } from "@/lib/db-singleton";
import { getReportNotificationRecipients } from "@/systems/loan/api/reportRecipients";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AccountReportRow = {
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

export async function ensureAccountReportsTable() {
  if (tableReady) return;
  await queryWithRetry(async () => sql`
    CREATE TABLE IF NOT EXISTS account_reports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      report_date DATE NOT NULL,
      reporter_username VARCHAR(32) NOT NULL,
      reporter_name VARCHAR(100) NOT NULL DEFAULT '',
      reporter_position VARCHAR(100) NOT NULL DEFAULT '',
      department VARCHAR(100) NOT NULL DEFAULT '',
      branch VARCHAR(100) NOT NULL DEFAULT '',
      status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'reviewed', 'approved', 'returned')),
      report_data JSONB NOT NULL DEFAULT '{}'::jsonb,
      reviewed_by VARCHAR(32),
      reviewed_at TIMESTAMPTZ,
      review_comment TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (report_date, reporter_username)
    )
  `, "ensureAccountReportsTable");
  await queryWithRetry(async () => sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'account_reports_data_object_check'
          AND conrelid = 'account_reports'::regclass
      ) THEN
        ALTER TABLE account_reports ADD CONSTRAINT account_reports_data_object_check
          CHECK (jsonb_typeof(report_data) = 'object');
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'account_reports_branch_not_blank_check'
          AND conrelid = 'account_reports'::regclass
      ) THEN
        ALTER TABLE account_reports ADD CONSTRAINT account_reports_branch_not_blank_check
          CHECK (BTRIM(branch) <> '');
      END IF;
    END $$
  `, "accountReports-standard-constraints");
  await Promise.all([
    queryWithRetry(async () => sql`CREATE INDEX IF NOT EXISTS idx_account_reports_date ON account_reports(report_date DESC)`, "accountReports-date-index"),
    queryWithRetry(async () => sql`CREATE INDEX IF NOT EXISTS idx_account_reports_branch ON account_reports(branch, report_date DESC)`, "accountReports-branch-index"),
    queryWithRetry(async () => sql`CREATE INDEX IF NOT EXISTS idx_account_reports_reporter ON account_reports(reporter_username, report_date DESC)`, "accountReports-reporter-index"),
    queryWithRetry(async () => sql`CREATE INDEX IF NOT EXISTS idx_account_reports_workflow ON account_reports(LOWER(BTRIM(branch)), report_date DESC, status)`, "accountReports-workflow-index"),
  ]);
  tableReady = true;
}

function canManage(role: string) {
  return ["admin", "manager / approver", "branch manager", "bm", "credit manager", "executive viewer"].includes(role.trim().toLocaleLowerCase());
}

function hasCustomerActivity(data: Record<string, unknown>) {
  return ["dueRows", "paidRows", "dueNoticeRows", "promiseRows", "closedRows"].some((key) => Array.isArray(data[key]) && data[key].some((row) => row && typeof row === "object" && typeof (row as { customer?: unknown }).customer === "string" && (row as { customer: string }).customer.trim()));
}

function dateValue(value: string | Date) {
  if (!(value instanceof Date)) return String(value).slice(0, 10);
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Phnom_Penh", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(value);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return year && month && day ? `${year}-${month}-${day}` : value.toISOString().slice(0, 10);
}
function timestampValue(value: string | Date) { return value instanceof Date ? value.toISOString() : String(value); }

function mapReport(row: AccountReportRow) {
  let data = row.report_data;
  if (typeof data === "string") { try { data = JSON.parse(data) as Record<string, unknown>; } catch { data = {}; } }
  return { id: row.id, reportDate: dateValue(row.report_date), reporterUsername: row.reporter_username, reporterName: row.reporter_name, reporterPosition: row.reporter_position, department: row.department, branch: row.branch, status: row.status, data, reviewedBy: row.reviewed_by, reviewedAt: row.reviewed_at ? timestampValue(row.reviewed_at) : null, reviewComment: row.review_comment || "", createdAt: timestampValue(row.created_at), updatedAt: timestampValue(row.updated_at) };
}

export async function GET(request: NextRequest) {
  const session = getSession(request);
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized - Please log in" }, { status: 401 });
  try {
    await ensureAccountReportsTable();
    const { searchParams } = new URL(request.url);
    const requestedReporter = searchParams.get("reporter")?.trim() || "";
    const reporter = canManage(session.role) ? requestedReporter : session.username;
    const branch = searchParams.get("branch")?.trim() || "";
    const requestedLimit = Number.parseInt(searchParams.get("limit") || "200", 10);
    const limit = Math.min(500, Math.max(1, Number.isFinite(requestedLimit) ? requestedLimit : 200));
    const rows = await queryWithRetry(async () => sql<AccountReportRow>`
      SELECT * FROM account_reports
      WHERE (${reporter} = '' OR reporter_username = ${reporter})
        AND (${branch} = '' OR LOWER(BTRIM(branch)) = LOWER(BTRIM(${branch})))
      ORDER BY report_date DESC, updated_at DESC
      LIMIT ${limit}
    `, "listAccountReports");
    return NextResponse.json({ success: true, data: rows.map(mapReport) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Could not load account reports" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = getSession(request);
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized - Please log in" }, { status: 401 });
  try {
    await ensureAccountReportsTable();
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
    if (!branch) return NextResponse.json({ success: false, error: "A branch is required for an Account Report" }, { status: 400 });
    if (status === "submitted" && !hasCustomerActivity(reportData)) return NextResponse.json({ success: false, error: "Add at least one customer activity before submitting an Account Report" }, { status: 400 });
    const existing = await queryWithRetry(async () => sql<Pick<AccountReportRow, "status">>`SELECT status FROM account_reports WHERE report_date = ${reportDate}::date AND reporter_username = ${session.username} LIMIT 1`, "findAccountReportForSave");
    if (existing[0] && !["draft", "returned"].includes(existing[0].status)) return NextResponse.json({ success: false, error: "This report is locked for review" }, { status: 409 });
    const rows = await queryWithRetry(async () => sql<AccountReportRow>`
      INSERT INTO account_reports (report_date, reporter_username, reporter_name, reporter_position, department, branch, status, report_data)
      VALUES (${reportDate}::date, ${session.username}, ${reporterName}, ${reporterPosition}, ${department}, ${branch}, ${status}, ${serializedData}::jsonb)
      ON CONFLICT (report_date, reporter_username) DO UPDATE SET reporter_name = EXCLUDED.reporter_name, reporter_position = EXCLUDED.reporter_position, department = EXCLUDED.department, branch = EXCLUDED.branch, status = EXCLUDED.status, report_data = EXCLUDED.report_data, reviewed_by = NULL, reviewed_at = NULL, review_comment = '', updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, "saveAccountReport");
    const report = mapReport(rows[0]);
    const recipientUsernames = status === "submitted" ? await getReportNotificationRecipients(branch, "branch", session.username) : [];
    await recordAuditEvent(auditEventFromRequest(request, { action: status === "submitted" ? "account_report.submit" : "account_report.save_draft", actorUsername: session.username, actorRole: session.role, resourceType: "account_report", resourceId: report.id, status: "success", metadata: { reportDate, branch, reporterName, recipientUsernames } }));
    return NextResponse.json({ success: true, data: report });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Could not save account report" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = getSession(request);
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized - Please log in" }, { status: 401 });
  if (!canManage(session.role)) return NextResponse.json({ success: false, error: "Only managers can review Account Reports" }, { status: 403 });
  try {
    await ensureAccountReportsTable();
    const body = await request.json() as Record<string, unknown>;
    const id = String(body.id || "");
    const action = String(body.action || "");
    const comment = String(body.comment || "").trim().slice(0, 2000);
    if (!/^[0-9a-f-]{36}$/i.test(id) || !["reviewed", "approved", "returned"].includes(action)) return NextResponse.json({ success: false, error: "Invalid review request" }, { status: 400 });
    if (action === "returned" && !comment) return NextResponse.json({ success: false, error: "Add a correction comment" }, { status: 400 });
    const current = await queryWithRetry(async () => sql<Pick<AccountReportRow, "status" | "reporter_username">>`SELECT status, reporter_username FROM account_reports WHERE id = ${id}::uuid LIMIT 1`, "findAccountReportForReview");
    if (!current[0]) return NextResponse.json({ success: false, error: "Report not found" }, { status: 404 });
    if (current[0].reporter_username === session.username) return NextResponse.json({ success: false, error: "You cannot review your own report" }, { status: 409 });
    const allowed = action === "reviewed" ? current[0].status === "submitted" : action === "approved" ? current[0].status === "reviewed" : ["submitted", "reviewed"].includes(current[0].status);
    if (!allowed) return NextResponse.json({ success: false, error: "Invalid status transition" }, { status: 409 });
    const rows = await queryWithRetry(async () => sql<AccountReportRow>`UPDATE account_reports SET status = ${action}, reviewed_by = ${session.username}, reviewed_at = CURRENT_TIMESTAMP, review_comment = ${comment}, updated_at = CURRENT_TIMESTAMP WHERE id = ${id}::uuid RETURNING *`, "reviewAccountReport");
    return NextResponse.json({ success: true, data: mapReport(rows[0]) });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Could not review account report" }, { status: 500 });
  }
}
