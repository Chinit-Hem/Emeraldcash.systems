function normalizeIdentityLabel(value: string | null | undefined) {
  return String(value || "").trim().toLocaleLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

const ADMIN_ROLES = new Set(["admin", "system administrator"]);
const BRANCH_MANAGER_LABELS = new Set(["manager / approver", "credit / approver", "branch manager", "bm", "credit manager"]);
const ACCOUNT_ROLE_LABELS = new Set(["accountant", "assistant accountant", "finance"]);
const ACCOUNT_POSITION_LABELS = new Set(["accounting intern", "assistant accountant", "accountant", "finance manager"]);
const LOAN_SPECIALIST_ROLE_LABELS = new Set(["loan specialist", "loan operations"]);
const LOAN_SPECIALIST_POSITION_LABELS = new Set(["loan specialist", "collection officer"]);
const HR_REVIEW_POSITION_LABELS = new Set(["human resources officer", "human resources supervisor", "human resources manager", "hr officer", "hr supervisor", "hr manager", "hr director", "head of human resources"]);
const DIRECTOR_ROLE_LABELS = new Set(["director", "executive viewer"]);
const DIRECTOR_POSITION_LABELS = new Set(["director", "managing director", "chief executive officer", "ceo"]);

export function isReportAdministrator(role: string | null | undefined) {
  return ADMIN_ROLES.has(normalizeIdentityLabel(role));
}

export function isBranchManagerReportActor(role: string | null | undefined, position?: string | null) {
  return BRANCH_MANAGER_LABELS.has(normalizeIdentityLabel(role)) || BRANCH_MANAGER_LABELS.has(normalizeIdentityLabel(position));
}

export function isHumanResourcesReportActor(role: string | null | undefined, position?: string | null) {
  const normalizedRole = normalizeIdentityLabel(role);
  const normalizedPosition = normalizeIdentityLabel(position);
  return ["human resources", "hr"].includes(normalizedRole) || ["human resources", "hr"].includes(normalizedPosition) || HR_REVIEW_POSITION_LABELS.has(normalizedPosition);
}

export function isDirectorReportActor(role: string | null | undefined, position?: string | null) {
  return isReportAdministrator(role)
    || DIRECTOR_ROLE_LABELS.has(normalizeIdentityLabel(role))
    || DIRECTOR_POSITION_LABELS.has(normalizeIdentityLabel(position));
}

export function canPrepareAccountReport(role: string | null | undefined, position?: string | null) {
  return isReportAdministrator(role)
    || ACCOUNT_ROLE_LABELS.has(normalizeIdentityLabel(role))
    || ACCOUNT_POSITION_LABELS.has(normalizeIdentityLabel(position));
}

export function canPrepareLoanSpecialistReport(role: string | null | undefined, position?: string | null) {
  return isReportAdministrator(role)
    || LOAN_SPECIALIST_ROLE_LABELS.has(normalizeIdentityLabel(role))
    || LOAN_SPECIALIST_POSITION_LABELS.has(normalizeIdentityLabel(position));
}

export type ReportWorkflowStatus = "draft" | "submitted" | "reviewed" | "approved" | "returned";
export type ReportWorkflowAction = "reviewed" | "approved" | "returned";

export function isReportWorkflowTransitionAllowed(
  report: "source" | "branchManager",
  actor: "branchManager" | "humanResources" | "director",
  status: ReportWorkflowStatus,
  action: ReportWorkflowAction,
) {
  if (actor === "humanResources") return false;
  if (report === "source") {
    return actor === "branchManager" && status === "submitted" && (action === "approved" || action === "returned");
  }
  return actor === "director" && ["submitted", "reviewed"].includes(status) && (action === "approved" || action === "returned");
}
