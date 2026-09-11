export type BmWorksheetRow = { name: string; requested: string; approved: string; collected: string; rejected: string; contacts: string };
export type BmWorksheet = {
  kpis?: BmKpi[];
  issues?: BmIssue[];
  periods?: BmPeriod[];
  mode: "manual" | "generated";
  staff: BmWorksheetRow[];
  accounts: { name: string; due: string; paid: string; dueAmount: string; paidAmount: string }[];
  notes: string;
  sourceReportIds: string[];
  sourceAccountReportIds: string[];
};
export const emptyBmStaffRow = (): BmWorksheetRow => ({ name: "", requested: "", approved: "", collected: "", rejected: "", contacts: "" });
export const emptyBmAccountRow = () => ({ name: "", due: "", paid: "", dueAmount: "", paidAmount: "" });
export const emptyBmWorksheet = (): BmWorksheet => ({ kpis: emptyBmKpis(), issues: [emptyBmIssue()], periods: emptyBmPeriods(), mode: "manual", staff: [emptyBmStaffRow()], accounts: [emptyBmAccountRow()], notes: "", sourceReportIds: [], sourceAccountReportIds: [] });
export function validBmWorksheet(value: unknown): value is BmWorksheet {
  if (!value || typeof value !== "object") return false;
  const data = value as BmWorksheet;
  const validRows = (rows: unknown, keys: string[]) => Array.isArray(rows) && rows.length <= 500 && rows.every((row) => row && typeof row === "object" && keys.every((key) => typeof row[key] === "string" && (key === "name" || row[key] === "" || (Number.isFinite(Number(row[key])) && Number(row[key]) >= 0))));
  const numeric = (value: unknown) => typeof value === "string" && (value === "" || (Number.isFinite(Number(value)) && Number(value) >= 0));
  if (data.kpis !== undefined && (!Array.isArray(data.kpis) || data.kpis.length !== BM_KPIS.length || !BM_KPIS.every(([id]) => data.kpis!.filter((row) => row?.id === id).length === 1) || !data.kpis.every((row) => [row.target, row.daily, row.monthly].every(numeric) && typeof row.note === "string"))) return false;
  if (data.issues !== undefined && (!Array.isArray(data.issues) || data.issues.length > 500 || !data.issues.every((row) => row && [row.issue, row.name, row.action, row.owner, row.deadline].every((value) => typeof value === "string") && numeric(row.principal) && (!row.deadline || /^\d{4}-\d{2}-\d{2}$/.test(row.deadline))))) return false;
  if (data.periods !== undefined && (!Array.isArray(data.periods) || data.periods.length !== 3 || !["daily", "monthly", "yearly"].every((period) => data.periods!.filter((row) => row?.period === period).length === 1) || !data.periods.every((row) => [row.lsReports, row.accountReports, row.requested, row.approved, row.approvedAmount, row.due, row.paid, row.collected].every(numeric)))) return false;
  return ["manual", "generated"].includes(data.mode) && typeof data.notes === "string" && validRows(data.staff, ["name", "requested", "approved", "collected", "rejected", "contacts"]) && validRows(data.accounts, ["name", "due", "paid", "dueAmount", "paidAmount"]) && Array.isArray(data.sourceReportIds) && data.sourceReportIds.every((id) => typeof id === "string") && Array.isArray(data.sourceAccountReportIds) && data.sourceAccountReportIds.every((id) => typeof id === "string");
}
export function hasBmWorksheetContent(data: BmWorksheet) {
  return Boolean(data.kpis?.some((row) => row.daily !== "" || row.monthly !== "" || row.note.trim()) || data.issues?.some((row) => row.issue.trim() || row.action.trim()) || data.periods?.some((row) => row.collected !== "" || row.approvedAmount !== "") || data.notes.trim() || [...data.staff, ...data.accounts].some((row) => row.name.trim()));
}

export const BM_KPIS = [
  ["disbursed", "ចំនួនទម្លាក់ឥណទានថ្មី ($)", "New loan disbursements ($)", false],
  ["customers", "ចំនួនអតិថិជនថ្មី (នាក់)", "New customers", false],
  ["collectionRate", "អត្រាប្រមូលប្រាក់ (%)", "Collection rate (%)", true],
  ["collected", "ចំនួនប្រាក់ប្រមូលបាន ($)", "Collected amount ($)", false],
  ["par1", "អត្រាឥណទានយឺតយ៉ាវ PAR > 1 day (%)", "PAR > 1 day (%)", true],
  ["par30", "អត្រាឥណទានយឺតយ៉ាវ PAR > 30 day (%)", "PAR > 30 days (%)", true],
  ["notice3", "ជូនដំណឹងទៅអតិថិជនមុន ៣ថ្ងៃ ដល់ថ្ងៃកំណត់ត្រូវបង់ (នាក់)", "Notified 3 days before due", false],
  ["notice1", "ជូនដំណឹងទៅអតិថិជនមុន ១ថ្ងៃ ដល់ថ្ងៃកំណត់ត្រូវបង់ (នាក់)", "Notified 1 day before due", false],
  ["noticeDue", "ជូនដំណឹងទៅអតិថិជន ដល់ថ្ងៃកំណត់ត្រូវបង់ (នាក់)", "Notified on due date", false],
] as const;
export type BmKpi = { id: string; target: string; daily: string; monthly: string; note: string };
export type BmIssue = { issue: string; name: string; principal: string; action: string; owner: string; deadline: string };
export type BmPeriod = { period: string; lsReports: string; accountReports: string; requested: string; approved: string; approvedAmount: string; due: string; paid: string; collected: string };
export const emptyBmKpis = (): BmKpi[] => BM_KPIS.map(([id]) => ({ id, target: "", daily: "", monthly: "", note: "" }));
export const emptyBmIssue = (): BmIssue => ({ issue: "", name: "", principal: "", action: "", owner: "", deadline: "" });
export const emptyBmPeriods = (): BmPeriod[] => ["daily", "monthly", "yearly"].map((period) => ({ period, lsReports: "", accountReports: "", requested: "", approved: "", approvedAmount: "", due: "", paid: "", collected: "" }));
export function bmKpiValues(rows: BmKpi[], row: BmKpi) {
  const collection = rows.find((entry) => entry.id === "collected");
  const rate = (value: string | undefined) => collection && Number(collection.target) > 0 && value !== "" && value !== undefined ? String(Number(value) / Number(collection.target) * 100) : "";
  const daily = row.id === "collectionRate" ? rate(collection?.daily) : row.daily;
  const monthly = row.id === "collectionRate" ? rate(collection?.monthly) : row.monthly;
  return { daily, monthly, achievement: monthly !== "" && Number(row.target) > 0 ? Number(monthly) / Number(row.target) : null };
}
