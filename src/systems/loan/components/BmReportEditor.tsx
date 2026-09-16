"use client";

import { AlertTriangle, CalendarRange, ChartNoAxesCombined, Check, ChevronDown, CircleDollarSign, Database, Download, FileText, List, Loader2, MapPin, MoreHorizontal, PieChart, Plus, Printer, Save, Settings2, Trash2, UserCheck, UserRound, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BM_KPIS, bmKpiValues, emptyBmAccountRow, emptyBmIssue, emptyBmKpis, emptyBmPeriods, emptyBmStaffRow, type BmPeriod, type BmWorksheet } from "../utils/bmWorksheet";
import { normalizeCompanyBranch } from "@/shared/utils/branchNames";
import { DateInput } from "@/shared/components/DateInput";

type Section = "overview" | "kpis" | "team" | "issues" | "periods" | "sources";
type Props = {
  reportDate: string;
  onReportDateChange: (value: string) => void;
  dateMarkers?: Record<string, "ready" | "pending">;
  branch: string;
  reporterName: string;
  statusLabel: string;
  value: BmWorksheet;
  onChange: (value: BmWorksheet) => void;
  readOnly: boolean;
  isKhmer: boolean;
  savingAction?: "draft" | "submitted" | null;
  generating?: boolean;
  generateLabel: string;
  canGenerate: boolean;
  onRecords: () => void;
  onSaveDraft: () => void;
  onSubmit: () => void;
  onGenerate: () => void;
  onExport: () => void;
  onPrint: () => void;
  validationFocusVersion?: number;
  invalidDailyField?: string;
};
const fieldClass = "mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 read-only:border-slate-200 read-only:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:read-only:bg-slate-900";

function NumberField({ label, value, onChange, readOnly, invalid = false }: { label: string; value: string; onChange: (value: string) => void; readOnly: boolean; invalid?: boolean }) {
  return <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">{label}<input aria-label={label} aria-invalid={invalid || undefined} type="number" min={0} step="any" value={value} readOnly={readOnly} onChange={(event) => onChange(event.target.value)} className={`${fieldClass} ${invalid ? "border-amber-500 bg-amber-50 focus:border-amber-600 focus:ring-amber-500/20 dark:border-amber-500 dark:bg-amber-950/25" : ""}`} /></label>;
}

function TextField({ label, value, onChange, readOnly, type = "text" }: { label: string; value: string; onChange: (value: string) => void; readOnly: boolean; type?: "text" | "date" }) {
  return <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">{label}<input aria-label={label} type={type} value={value} readOnly={readOnly} onChange={(event) => onChange(event.target.value)} className={fieldClass} /></label>;
}

function Metric({ label, value, helper, color, icon: Icon = ChartNoAxesCombined }: { label: string; value: string; helper: string; color: string; icon?: typeof Users }) {
  return <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"><div className="flex items-start gap-3"><span className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${color}`}><Icon className="h-5 w-5" /></span><div className="min-w-0"><p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</p><p className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">{value || "0"}</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{helper}</p></div></div></article>;
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-950/40"><p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{label}</p><p className="mt-0.5 text-lg font-bold tabular-nums">{value}</p></div>;
}

function EditToggle({ open, onClick, label, labelOpen }: { open: boolean; onClick: () => void; label: string; labelOpen: string }) {
  return <button type="button" onClick={onClick} className={`inline-flex min-h-10 items-center gap-1.5 rounded-lg border px-3 text-sm font-semibold ${open ? "border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/40" : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"}`}>{open ? <ChevronDown className="h-4 w-4" /> : <Settings2 className="h-4 w-4" />}{open ? labelOpen : label}</button>;
}

const numText = (value: string) => value.trim() === "" ? "0" : Number(value).toLocaleString();
const dash = (value: string) => value.trim() === "" ? "—" : Number(value).toLocaleString();
// Keep large monetary values compact so metric cards remain readable on phones.
const moneyText = (value: string) => {
  if (value.trim() === "") return "0";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return value;
  if (Math.abs(amount) >= 1_000_000) return `${(amount / 1_000_000).toFixed(amount % 1_000_000 === 0 ? 0 : 1)}M`;
  if (Math.abs(amount) >= 1_000) return `${(amount / 1_000).toFixed(amount % 1_000 === 0 ? 0 : 1)}K`;
  return amount.toLocaleString();
};
const friendlyDate = (value: string) => { const [year, month, day] = value.split("-").map(Number); if (!year || !month || !day) return value; return new Date(year, month - 1, day).toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" }); };
const PERIOD_FIELDS: Record<string, [string, string]> = {
  requested: ["Requests", "សំណើ"],
  approved: ["Approvals", "អនុម័ត"],
  approvedAmount: ["Approved amount", "ប្រាក់អនុម័ត"],
  collected: ["Collected", "ប្រមូលបាន"],
  due: ["Due", "ត្រូវបង់"],
  paid: ["Paid", "បានបង់"],
  lsReports: ["LS reports", "របាយការណ៍ LS"],
  accountReports: ["Account reports", "គណនេយ្យ"],
};

export default function BmReportEditor({ value, onChange, readOnly, isKhmer, reportDate, onReportDateChange, dateMarkers, branch, reporterName, statusLabel, savingAction, generating = false, generateLabel, canGenerate, onRecords, onSaveDraft, onSubmit, onGenerate, onExport, onPrint, validationFocusVersion = 0, invalidDailyField }: Props) {
  const [section, setSection] = useState<Section>("overview");
  const [overviewEditing, setOverviewEditing] = useState(false);
  const [issueOpen, setIssueOpen] = useState<Record<number, boolean>>({});
  const [periodOpen, setPeriodOpen] = useState<Record<number, boolean>>({});
  const moreActionsRef = useRef<HTMLDetailsElement>(null);
  const closeMoreActions = () => { if (moreActionsRef.current) moreActionsRef.current.open = false; };
  const text = (en: string, km: string) => isKhmer ? km : en;
  const isSenSok = normalizeCompanyBranch(branch) === "sen-sok";
  const kpis = value.kpis || emptyBmKpis();
  const issues = value.issues || [emptyBmIssue()];
  const periods = value.periods || emptyBmPeriods();
  const daily = periods.find((row) => row.period === "daily") || periods[0];
  const monthly = periods.find((row) => row.period === "monthly") || periods[1];
  const yearly = periods.find((row) => row.period === "yearly") || periods[2];
  const updateStaff = (index: number, key: keyof BmWorksheet["staff"][number], next: string) => onChange({ ...value, staff: value.staff.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: next } : row) });
  const updateAccount = (index: number, key: keyof BmWorksheet["accounts"][number], next: string) => onChange({ ...value, accounts: value.accounts.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: next } : row) });
  const updateIssue = (index: number, key: keyof NonNullable<BmWorksheet["issues"]>[number], next: string) => onChange({ ...value, issues: issues.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: next } : row) });
  const toggle = (setter: (next: Record<number, boolean> | ((prev: Record<number, boolean>) => Record<number, boolean>)) => void, index: number) => setter((prev) => ({ ...prev, [index]: !prev[index] }));
  const staffCount = value.staff.filter((row) => row.name.trim()).length;
  const accountCount = value.accounts.filter((row) => row.name.trim()).length;
  const staffApproved = value.staff.reduce((sum, row) => sum + (Number(row.approved) || 0), 0);
  const staffCollected = value.staff.reduce((sum, row) => sum + (Number(row.collected) || 0), 0);
  const staffContacts = value.staff.reduce((sum, row) => sum + (Number(row.contacts) || 0), 0);
  const accountCollected = value.accounts.reduce((sum, row) => sum + (Number(row.paidAmount) || 0), 0);
  const todayIso = new Date().toISOString().slice(0, 10);
  const openIssueCount = issues.filter((row) => row.issue.trim()).length;
  const overdueIssueCount = issues.filter((row) => row.issue.trim() && row.deadline && row.deadline < todayIso).length;
  const kpiCount = kpis.filter((row) => row.target.trim() || row.daily.trim() || row.monthly.trim()).length;
  const periodsWithData = periods.filter((row) => Object.entries(row).some(([key, item]) => key !== "period" && item.trim())).length;
  const isManualReport = value.mode === "manual";
  // Generate creates a BM-owned snapshot from reviewed LS and Account reports.
  // A Branch Manager may correct or extend that snapshot while it is a draft;
  // the linked source reports themselves are never changed from this editor.
  const generatedSourceReadOnly = readOnly;
  // Manual reports may be completed in Team or KPI before the Periods section.
  // Overview must summarize that entered data instead of misleadingly showing 0.
  const manualOverview = isManualReport;
  const manualCollectedKpi = kpis.find((row) => row.id === "collected")?.daily || "";
  const manualDisbursedKpi = kpis.find((row) => row.id === "disbursed")?.daily || "";
  const overviewLsReports = daily.lsReports || (manualOverview ? String(staffCount) : "");
  const overviewAccountReports = daily.accountReports || (manualOverview ? String(accountCount) : "");
  const overviewApproved = daily.approved || (manualOverview ? String(staffApproved) : "");
  const overviewCollected = daily.collected || (manualOverview ? String(accountCollected || staffCollected || Number(manualCollectedKpi) || 0) : "");
  const overviewPaid = daily.paid || (manualOverview ? String(value.accounts.reduce((sum, row) => sum + (Number(row.paid) || 0), 0)) : "");
  const overviewApprovedAmount = daily.approvedAmount || (manualOverview ? manualDisbursedKpi : "0");
  // Reviewers need the complete submitted form, including empty sections, to
  // assess exactly what the BM did and did not report.
  const tabs: Array<[Section, string, typeof Users, string?]> = [
    ["overview", text("Overview", "ទិដ្ឋភាពរួម"), ChartNoAxesCombined], ["kpis", text("Branch KPI", "KPI សាខា"), ChartNoAxesCombined, `${kpiCount}/${BM_KPIS.length}`],
    ["team", text("Team Performance", "លទ្ធផលក្រុម"), Users, String(staffCount)], ["issues", text("Issues & Action Plan", "បញ្ហា និងផែនការ"), AlertTriangle, String(openIssueCount)], ["periods", text("Daily / Month / Year", "ថ្ងៃ / ខែ / ឆ្នាំ"), CalendarRange, `${periodsWithData}/${periods.length}`],
    ["sources", text("Source Reports", "ប្រភពរបាយការណ៍"), Database, `${value.sourceReportIds.length + value.sourceAccountReportIds.length}`],
  ];
  const visibleTabs = tabs;

  useEffect(() => {
    if (!validationFocusVersion) return;
    setSection("periods");
    setPeriodOpen((current) => ({ ...current, 0: true }));
    window.setTimeout(() => document.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus({ preventScroll: false }), 0);
  }, [validationFocusVersion]);

  useEffect(() => {
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (moreActionsRef.current?.open && !moreActionsRef.current.contains(event.target as Node)) closeMoreActions();
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, []);

  useEffect(() => {
    if (savingAction === "submitted" || readOnly) closeMoreActions();
  }, [savingAction, readOnly]);

  return <section className="space-y-5 pb-3 pt-0 text-slate-900 dark:text-slate-100 sm:pb-5">
    <header className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:px-5">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0"><div className="flex flex-wrap items-center gap-3"><h2 className="text-2xl font-bold">BM Report</h2><span className={`rounded-full px-3 py-1 text-xs font-semibold ${readOnly ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"}`}>{statusLabel}</span></div><div className="mt-4 flex flex-wrap items-end gap-x-7 gap-y-3 text-sm"><label className="block w-60"><span className="font-semibold text-slate-700 dark:text-slate-200">{text("Report date", "កាលបរិច្ឆេទ")}</span><DateInput title={text("BM report date", "កាលបរិច្ឆេទរបាយការណ៍ BM")} value={reportDate} onChange={onReportDateChange} dateMarkers={dateMarkers} className="mt-1 min-h-10 rounded-none border-0 border-b border-slate-300 bg-transparent px-2 font-bold text-slate-900 shadow-none focus:border-emerald-500 focus:ring-0 dark:border-slate-700 dark:text-white" /><span className="mt-2 flex items-center gap-3 text-xs font-medium text-slate-500"><span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-emerald-500" />{text("Data ready", "ទិន្នន័យរួចរាល់")}</span><span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-amber-500" />{text("Pending review", "រង់ចាំពិនិត្យ")}</span></span></label><span className="inline-flex min-h-16 items-center gap-2"><MapPin className="h-5 w-5 text-slate-500" /><span><strong className="block">{branch || "—"}</strong><small className="text-slate-500">{text("Branch", "សាខា")}</small></span></span><span className="inline-flex min-h-16 items-center gap-2"><UserRound className="h-5 w-5 text-slate-500" /><span><strong className="block">{reporterName || "—"}</strong><small className="text-slate-500">{text("Reported by", "អ្នករាយការណ៍")}</small></span></span><span className="hidden h-8 w-px bg-slate-200 sm:block dark:bg-slate-700" /><span className="inline-flex min-h-16 items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-emerald-500" />LS {value.sourceReportIds.length} {text("ready", "រួចរាល់")}</span><span className="inline-flex min-h-16 items-center gap-2"><i className={`h-2.5 w-2.5 rounded-full ${value.sourceAccountReportIds.length ? "bg-emerald-500" : "bg-amber-500"}`} />Account {value.sourceAccountReportIds.length ? `${value.sourceAccountReportIds.length} ${text("ready", "រួចរាល់")}` : text("pending", "មិនទាន់មាន")}</span></div></div>
        <div className="flex flex-wrap items-center gap-2 print:hidden"><button type="button" onClick={onRecords} className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"><List className="h-5 w-5" />{text("My History", "ប្រវត្តិរបស់ខ្ញុំ")}</button><button type="button" disabled={readOnly || Boolean(savingAction)} onClick={onSaveDraft} className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">{savingAction === "draft" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}{text("Save draft", "រក្សាទុកព្រាង")}</button>{canGenerate ? <button type="button" disabled={generating || Boolean(savingAction)} onClick={onGenerate} className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-emerald-600 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50">{generating ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileText className="h-5 w-5" />}{generateLabel}</button> : !readOnly ? <button type="button" disabled={Boolean(savingAction)} onClick={() => { closeMoreActions(); onSubmit(); }} className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-emerald-600 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50">{savingAction === "submitted" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}{text("Submit", "ដាក់ស្នើ")}</button> : null}<details ref={moreActionsRef} className="relative" onKeyDown={(event) => { if (event.key === "Escape") { closeMoreActions(); moreActionsRef.current?.querySelector("summary")?.focus(); } }}><summary aria-label={text("More actions", "សកម្មភាពបន្ថែម")} className="flex min-h-12 min-w-12 cursor-pointer list-none items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"><MoreHorizontal className="h-5 w-5" /></summary><div className="absolute right-0 top-full z-20 mt-2 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg dark:border-slate-700 dark:bg-slate-900">{!readOnly && canGenerate ? <button type="button" disabled={Boolean(savingAction)} onClick={() => { closeMoreActions(); onSubmit(); }} className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm font-semibold hover:bg-slate-50 disabled:opacity-50 dark:hover:bg-slate-800"><Check className="h-4 w-4" />{text("Submit to Director", "ដាក់ស្នើទៅនាយក")}</button> : null}<button type="button" onClick={() => { closeMoreActions(); onExport(); }} className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800"><Download className="h-4 w-4" />{text("Export Excel", "នាំចេញ Excel")}</button><button type="button" onClick={() => { closeMoreActions(); onPrint(); }} className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800"><Printer className="h-4 w-4" />{text("Print", "បោះពុម្ព")}</button></div></details></div>
      </div>
    </header>
    {value.incompleteSourceReason?.trim() ? <section className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100"><p className="font-bold">{text("LS / Account data exception", "ទិន្នន័យ LS / Acc មិនទាន់គ្រប់")}</p><p className="text-amber-900/80 dark:text-amber-100/80">{value.incompleteSourceReason}</p></section> : null}

    <nav aria-label={text("Report sections", "ផ្នែករបាយការណ៍")} className="sticky top-0 z-10 flex gap-6 overflow-x-auto border-b border-slate-200 bg-slate-50/95 px-1 backdrop-blur-md dark:border-slate-700 dark:bg-slate-950/95 print:hidden">{visibleTabs.map(([id, label]) => <button key={id} type="button" aria-pressed={section === id} onClick={() => setSection(id)} className={`relative min-h-12 shrink-0 border-b-2 px-1 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${section === id ? isSenSok ? "border-[#cfa66d] text-[#172b55] dark:text-[#e7c998]" : "border-emerald-600 text-emerald-700 dark:text-emerald-300" : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"}`}>{label}</button>)}</nav>

    <div className={section === "overview" ? "space-y-5" : "hidden print:block"}>
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"><h3 className="text-lg font-bold">{text("Key figures", "សូចនាករសំខាន់")}</h3><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={CircleDollarSign} label={text("Collected", "ប្រាក់ប្រមូលបាន")} value={`$${moneyText(overviewCollected)}`} helper={text("Today", "ថ្ងៃនេះ")} color="bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300" />
        <Metric icon={Users} label={text("Due customers", "អតិថិជនត្រូវបង់")} value={numText(daily.due)} helper={text("Today", "ថ្ងៃនេះ")} color="bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-300" />
        <Metric icon={UserCheck} label={text("Paid customers", "អតិថិជនបានបង់")} value={numText(overviewPaid)} helper={text("Today", "ថ្ងៃនេះ")} color="bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300" />
        <Metric icon={PieChart} label={text("Collection rate", "អត្រាប្រមូល")} value={`${Number(daily.due) ? ((Number(overviewPaid) / Number(daily.due)) * 100).toFixed(1) : "0.0"}%`} helper={text("Paid ÷ due", "បានបង់ ÷ ត្រូវបង់")} color="bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300" />
      </div></section>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"><div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"><div><h3 className="text-lg font-bold">{text("Report details", "ព័ត៌មានលម្អិតរបាយការណ៍")}</h3><p className="mt-1 text-sm text-slate-500">{text("Daily, month-to-date, and year-to-date figures.", "ទិន្នន័យថ្ងៃនេះ ខែនេះ និងឆ្នាំនេះ។")}</p></div>{!readOnly ? <button type="button" onClick={() => setOverviewEditing((current) => !current)} className={`inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-sm font-semibold shadow-sm transition ${overviewEditing ? "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"}`}><Settings2 className="h-4 w-4" />{overviewEditing ? text("Done", "រួចរាល់") : text("Edit", "កែសម្រួល")}</button> : null}</div><div className="overflow-x-auto px-5 pb-5"><table className="min-w-[680px] w-full text-sm"><thead className="bg-slate-50 text-left text-slate-600 dark:bg-slate-950 dark:text-slate-300"><tr><th className="rounded-l-lg px-4 py-3 font-semibold">{text("Metric", "សូចនាករ")}</th><th className="px-4 py-3 text-right font-semibold">{text("Today", "ថ្ងៃនេះ")}</th><th className="px-4 py-3 text-right font-semibold">{text("MTD", "ខែនេះ")}</th><th className="rounded-r-lg px-4 py-3 text-right font-semibold">{text("YTD", "ឆ្នាំនេះ")}</th></tr></thead><tbody>{([['collected', text("Collected amount (USD)", "ប្រាក់ប្រមូលបាន ($)")], ['approvedAmount', text("Approved amount (USD)", "ប្រាក់អនុម័ត ($)")], ['requested', text("Loan requests", "ចំនួនសំណើ")], ['approved', text("Approved loans", "ចំនួនអនុម័ត")], ['due', text("Due customers", "អតិថិជនត្រូវបង់")], ['paid', text("Paid customers", "អតិថិជនបានបង់")], ['lsReports', text("LS reports", "របាយការណ៍ LS")], ['accountReports', text("Account reports", "របាយការណ៍គណនេយ្យ")]] as Array<[keyof BmPeriod, string]>).map(([field, label]) => <tr key={field} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70 dark:border-slate-800 dark:hover:bg-slate-800/30"><td className="px-4 py-3.5 font-medium">{label}</td>{[daily, monthly, yearly].map((period) => <td key={period.period} className="px-4 py-2 text-right">{overviewEditing && !readOnly ? <input aria-label={`${label} ${period.period}`} type="number" min={0} value={period[field]} onChange={(event) => onChange({ ...value, periods: periods.map((item) => item.period === period.period ? { ...item, [field]: event.target.value } : item) })} className="ml-auto min-h-10 w-full max-w-48 appearance-none rounded-lg border border-slate-300 bg-white px-3 text-right tabular-nums text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" /> : <span className="inline-flex min-h-10 min-w-20 items-center justify-end rounded-lg px-3 font-semibold tabular-nums text-slate-800 dark:text-slate-100">{dash(period[field])}</span>}</td>)}</tr>)}</tbody></table></div></section>
      <label className="block rounded-xl border border-slate-200 bg-white p-4 text-sm font-semibold dark:border-slate-700 dark:bg-slate-900">{text("Additional notes", "កំណត់សម្គាល់បន្ថែម")}<textarea rows={3} value={value.notes} readOnly={readOnly} onChange={(event) => onChange({ ...value, notes: event.target.value })} className={`${fieldClass} resize-y`} placeholder={text("Add a management note…", "បន្ថែមកំណត់សម្គាល់…")} /></label>
    </div>

<div className={section === "kpis" ? "grid gap-4 xl:grid-cols-2" : "hidden print:grid print:gap-4"}>{BM_KPIS.map(([id, km, en, percent]) => { const row = kpis.find((item) => item.id === id) || { id, target: "", daily: "", monthly: "", note: "" }; const computed = bmKpiValues(kpis, row);
      const pct = computed.achievement === null ? null : computed.achievement * 100;
      const barClass = pct === null ? "bg-slate-200" : pct < 50 ? "bg-red-500" : pct < 90 ? "bg-amber-500" : "bg-emerald-500";
      const pillClass = pct === null ? "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400" : pct < 50 ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300" : pct < 90 ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";
      const update = (key: "target" | "daily" | "monthly" | "note", next: string) => onChange({ ...value, kpis: kpis.map((item) => item.id === id ? { ...item, [key]: next } : item) });
      const displayDaily = id === "collectionRate" ? computed.daily : row.daily;
      const displayMonthly = id === "collectionRate" ? computed.monthly : row.monthly;
      const displayValue = (value: string) => `${dash(value)}${percent ? "%" : ""}`;
      return <article key={id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-5">
        <div className="flex min-h-10 items-start justify-between gap-4"><h3 className="min-w-0 text-base font-bold leading-7 text-slate-900 dark:text-white">{isKhmer ? km : en}</h3><span className={`h-fit shrink-0 rounded-full px-3 py-1 text-xs font-bold ${pillClass}`}>{pct === null ? text("Not set", "មិនទាន់កំណត់") : `${pct.toFixed(1)}%`}</span></div>
        {readOnly ? <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3"><SummaryStat label={text("Target", "គោលដៅ")} value={displayValue(row.target)} /><SummaryStat label={text("Today", "ថ្ងៃនេះ")} value={displayValue(displayDaily)} /><SummaryStat label={text("Month", "ខែនេះ")} value={displayValue(displayMonthly)} /></div> : <div className="mt-4 grid gap-4 sm:grid-cols-3"><NumberField label={text("Target", "គោលដៅ") + (percent ? " (%)" : "")} value={row.target} onChange={(next) => update("target", next)} readOnly={false} /><NumberField label={text("Today", "ថ្ងៃនេះ") + (percent ? " (%)" : "")} value={displayDaily} onChange={(next) => update("daily", next)} readOnly={false} /><NumberField label={text("This month", "ខែនេះ") + (percent ? " (%)" : "")} value={displayMonthly} onChange={(next) => update("monthly", next)} readOnly={false} /><div className="sm:col-span-3"><TextField label={text("Note", "កំណត់សម្គាល់")} value={row.note} onChange={(next) => update("note", next)} readOnly={false} /></div></div>}
        {pct !== null ? <div className="mt-3"><div className="flex items-center justify-between text-xs text-slate-500"><span>{text("Achievement", "វឌ្ឍនភាពសម្រេច")}</span><strong className="tabular-nums">{pct.toFixed(1)}%</strong></div><div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" title={`${pct.toFixed(1)}%`}><div className={`h-full rounded-full ${barClass}`} style={{ width: `${Math.min(100, pct)}%` }} /></div></div> : null}
        {readOnly && row.note.trim() ? <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:bg-slate-950/40 dark:text-slate-300"><span className="font-semibold">{text("Note", "កំណត់សម្គាល់")}: </span>{row.note}</p> : null}
      </article>; })}</div>

    <div className={section === "team" ? "space-y-6" : "hidden print:block"}>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label={text("Approved (team)", "អនុម័ត (ក្រុម)")} value={numText(String(staffApproved))} helper={`${staffCount} ${text("specialists", "មន្ត្រី")}`} color="border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200" />
        <Metric label={text("Collected (team)", "ប្រមូលបាន (ក្រុម)")} value={`$${moneyText(String(staffCollected))}`} helper={`${staffContacts} ${text("contacts", "ទំនាក់ទំនង")}`} color="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200" />
        <Metric label={text("Contacts (team)", "អតិថិជនដោះស្រាយ (ក្រុម)")} value={numText(String(staffContacts))} helper={text("All specialists", "គ្រប់មន្ត្រី")} color="border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200" />
        <Metric label={text("Account collected", "គណនេយ្យប្រមូល")} value={`$${moneyText(String(accountCollected))}`} helper={`${accountCount} ${text("contributors", "បុគ្គលិក")}`} color="border-violet-200 bg-violet-50 text-violet-900 dark:border-violet-900 dark:bg-violet-950/30 dark:text-violet-200" />
      </div>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5 dark:border-slate-800">
          <div><h3 className="font-bold text-slate-950 dark:text-white">{text("Loan Specialists", "អ្នកឯកទេសផ្ដល់កម្ចី")}</h3><p className="mt-0.5 text-sm text-slate-500">{text("Enter each specialist's daily results.", "បញ្ចូលលទ្ធផលប្រចាំថ្ងៃរបស់មន្ត្រីនីមួយៗ។")}</p></div>
          {!generatedSourceReadOnly ? <button type="button" onClick={() => onChange({ ...value, staff: [...value.staff, emptyBmStaffRow()] })} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-emerald-600 px-3.5 text-sm font-semibold text-white hover:bg-emerald-700"><Plus className="h-4 w-4" />{text("Add staff", "បន្ថែមបុគ្គលិក")}</button> : null}
        </div>
        <div className="grid gap-3 p-3 sm:grid-cols-2 sm:p-4 xl:grid-cols-3">{value.staff.map((row, index) => <article key={index} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-950/40 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3"><p className="font-semibold text-slate-800 dark:text-slate-100">{text("Loan specialist", "មន្ត្រីឥណទាន")} {index + 1}</p>{!generatedSourceReadOnly ? <button type="button" aria-label={text("Remove", "លុប")} onClick={() => onChange({ ...value, staff: value.staff.filter((_, rowIndex) => rowIndex !== index) })} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"><Trash2 className="h-4 w-4" /></button> : null}</div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><div className="sm:col-span-2 lg:col-span-3"><TextField label={text("Name", "ឈ្មោះ")} value={row.name} onChange={(next) => updateStaff(index, "name", next)} readOnly={generatedSourceReadOnly} /></div>{(["requested", "approved", "rejected", "collected", "contacts"] as const).map((key) => <NumberField key={key} label={text(key[0].toUpperCase() + key.slice(1), ({ requested: "ស្នើសុំ", approved: "អនុម័ត", rejected: "បដិសេធ", collected: "ប្រមូលបាន", contacts: "អតិថិជនដោះស្រាយ" } as const)[key])} value={row[key]} onChange={(next) => updateStaff(index, key, next)} readOnly={generatedSourceReadOnly} />)}</div>
        </article>)}</div>
      </section>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5 dark:border-slate-800">
          <div><h3 className="font-bold text-slate-950 dark:text-white">{text("Account Contributors", "បុគ្គលិកគណនេយ្យ")}</h3><p className="mt-0.5 text-sm text-slate-500">{text("Enter each accountant's daily results.", "បញ្ចូលលទ្ធផលប្រចាំថ្ងៃរបស់គណនេយ្យករនីមួយៗ។")}</p></div>
          {!generatedSourceReadOnly ? <button type="button" onClick={() => onChange({ ...value, accounts: [...value.accounts, emptyBmAccountRow()] })} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-emerald-600 px-3.5 text-sm font-semibold text-white hover:bg-emerald-700"><Plus className="h-4 w-4" />{text("Add staff", "បន្ថែមបុគ្គលិក")}</button> : null}
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">{value.accounts.map((row, index) => <div key={index} className="p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3"><p className="font-semibold text-slate-800 dark:text-slate-100">{text("Account staff", "បុគ្គលិកគណនេយ្យ")} {index + 1}</p>{!generatedSourceReadOnly ? <button type="button" aria-label={text("Remove", "លុប")} onClick={() => onChange({ ...value, accounts: value.accounts.filter((_, rowIndex) => rowIndex !== index) })} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"><Trash2 className="h-4 w-4" /></button> : null}</div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div className="sm:col-span-2 lg:col-span-4"><TextField label={text("Name", "ឈ្មោះ")} value={row.name} onChange={(next) => updateAccount(index, "name", next)} readOnly={generatedSourceReadOnly} /></div>{(["due", "paid", "dueAmount", "paidAmount"] as const).map((key) => <NumberField key={key} label={text(({ due: "Due customers", paid: "Paid customers", dueAmount: "Due amount", paidAmount: "Paid amount" } as const)[key], ({ due: "អតិថិជនត្រូវបង់", paid: "អតិថិជនបានបង់", dueAmount: "ប្រាក់ត្រូវបង់", paidAmount: "ប្រាក់បានបង់" } as const)[key])} value={row[key]} onChange={(next) => updateAccount(index, key, next)} readOnly={generatedSourceReadOnly} />)}</div>
        </div>)}</div>
      </section>
    </div>

    <div className={section === "issues" ? "space-y-4" : "hidden print:block"}>
      <div className="grid grid-cols-2 gap-3 sm:max-w-md">
        <Metric label={text("Open issues", "បញ្ហាបើក")} value={numText(String(openIssueCount))} helper={text("Reported", "បានកត់ត្រា")} color="border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900" />
        <Metric label={text("Overdue", "ហួសកំណត់")} value={numText(String(overdueIssueCount))} helper={text("Past deadline", "ហួសកាលកំណត់")} color="border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200" />
      </div>
      {issues.map((row, index) => { const isNew = !row.issue.trim(); const isOverdue = Boolean(row.deadline && !isNew && row.deadline < todayIso); const open = Boolean(issueOpen[index]); const dotClass = isOverdue ? "bg-red-500" : isNew ? "bg-slate-300 dark:bg-slate-600" : "bg-emerald-500"; return <article key={index} className={`rounded-xl border p-4 ${isOverdue ? "border-red-300 bg-red-50/60 dark:border-red-900 dark:bg-red-950/20" : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0"><div className="flex items-center gap-2"><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dotClass}`} /><h3 className="truncate font-bold">{row.issue || `${text("Issue", "បញ្ហា")} ${index + 1}`}</h3></div><p className="mt-1 truncate text-xs text-slate-500">{row.deadline ? friendlyDate(row.deadline) : text("No deadline set", "គ្មានកំណត់កាល")}{row.owner.trim() ? ` · ${row.owner}` : ""}{row.principal.trim() ? ` · $${moneyText(row.principal)}` : ""}</p></div>
          <div className="flex shrink-0 items-center gap-2">{isNew ? null : <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${isOverdue ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"}`}>{isOverdue ? text("Overdue", "ហួសកំណត់") : text("Open", "បើក")}</span>}{!readOnly ? <EditToggle open={open} onClick={() => toggle(setIssueOpen, index)} label={text("Edit", "កែ")} labelOpen={text("Done", "រួចរាល់")} /> : null}{!readOnly ? <button type="button" aria-label={text("Remove", "លុប")} onClick={() => onChange({ ...value, issues: issues.filter((_, rowIndex) => rowIndex !== index) })} className="flex h-10 w-10 items-center justify-center rounded-lg text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button> : null}</div>
        </div>
        <div className={`mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 ${open || readOnly ? "" : "hidden print:grid print:gap-3"}`}><TextField label={text("Issue / overdue case", "បញ្ហា / ករណីយឺតយ៉ាវ")} value={row.issue} onChange={(next) => updateIssue(index, "issue", next)} readOnly={readOnly} /><TextField label={text("Customer / staff", "អតិថិជន / បុគ្គលិក")} value={row.name} onChange={(next) => updateIssue(index, "name", next)} readOnly={readOnly} /><NumberField label={text("Principal", "ប្រាក់ដើម")} value={row.principal} onChange={(next) => updateIssue(index, "principal", next)} readOnly={readOnly} /><TextField label={text("Solution", "ដំណោះស្រាយ")} value={row.action} onChange={(next) => updateIssue(index, "action", next)} readOnly={readOnly} /><TextField label={text("Responsible person", "អ្នកទទួលខុសត្រូវ")} value={row.owner} onChange={(next) => updateIssue(index, "owner", next)} readOnly={readOnly} /><TextField label={text("Deadline", "ថ្ងៃកំណត់")} value={row.deadline} onChange={(next) => updateIssue(index, "deadline", next)} readOnly={readOnly} type="date" /></div>
      </article>; })}
      {!readOnly ? <button type="button" onClick={() => onChange({ ...value, issues: [...issues, emptyBmIssue()] })} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-emerald-300 px-4 font-semibold text-emerald-700 hover:bg-emerald-50"><Plus className="h-4 w-4" />{text("Add issue", "បន្ថែមបញ្ហា")}</button> : null}
    </div>

    <div className={section === "periods" ? "grid gap-4 lg:grid-cols-3" : "hidden print:grid print:gap-4 lg:print:grid-cols-3"}>
      {periods.map((row, index) => { const open = Boolean(periodOpen[index]); return <article key={row.period} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-5">
      <div className="flex items-center justify-between gap-3"><h3 className="font-bold">{[text("Today", "ថ្ងៃនេះ"), text("This month", "ខែនេះ"), text("This year", "ឆ្នាំនេះ")][index]}</h3>{!generatedSourceReadOnly ? <EditToggle open={open} onClick={() => toggle(setPeriodOpen, index)} label={text("Edit", "កែ")} labelOpen={text("Done", "រួចរាល់")} /> : null}</div>
      <p className="mt-1 text-xs text-slate-500">{reportDate.slice(0, [10, 7, 4][index])}</p>
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label={text("LS reports", "របាយការណ៍ LS")} value={numText(row.lsReports)} helper={text("Submitted", "បានដាក់")} color="border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200" />
        <Metric label={text("Account", "គណនេយ្យ")} value={numText(row.accountReports)} helper={text("reports", "របាយការណ៍")} color="border-violet-200 bg-violet-50 text-violet-900 dark:border-violet-900 dark:bg-violet-950/30 dark:text-violet-200" />
        <Metric label={text("Approved", "អនុម័ត")} value={numText(row.approved)} helper={`$${moneyText(row.approvedAmount)}`} color="border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200" />
        <Metric label={text("Collected", "ប្រមូលបាន")} value={`$${moneyText(row.collected)}`} helper={`${numText(row.paid)} ${text("payments", "ការបង់ប្រាក់")}`} color="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200" />
      </div>
      <div className={`mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 ${open || generatedSourceReadOnly ? "" : "hidden print:grid print:gap-3"}`}>{Object.keys(PERIOD_FIELDS).map((key) => { const [en, km] = PERIOD_FIELDS[key]; const current = row[key as keyof BmPeriod]; return <NumberField key={key} label={isKhmer ? km : en} value={current} onChange={(next) => onChange({ ...value, periods: periods.map((item) => item.period === row.period ? { ...item, [key]: next } : item) })} readOnly={generatedSourceReadOnly} invalid={isManualReport && row.period === "daily" && invalidDailyField === key && current.trim() === ""} />; })}</div>
    </article>; })}</div>

    <div className={section === "sources" ? "space-y-4" : "hidden print:block"}>
      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900"><div className="flex items-start gap-3"><span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"><Database className="h-5 w-5" /></span><div><h3 className="font-bold">{text("Where this report data came from", "ប្រភពទិន្នន័យរបាយការណ៍នេះ")}</h3><p className="mt-1 text-sm text-slate-500">{value.mode === "generated" ? text("Figures were copied from linked, reviewed source reports. You can correct or add figures in this BM draft; your changes do not modify the original LS or Account reports.", "លេខត្រូវបានចម្លងពីរបាយការណ៍ប្រភពដែលបានភ្ជាប់ និងពិនិត្យរួច។ អ្នកអាចកែ ឬបន្ថែមលេខក្នុងព្រាង BM នេះបាន ដោយមិនប្ដូររបាយការណ៍ LS ឬ Account ដើមទេ។") : text("This is a manual BM report; it has no LS or Account source links.", "នេះជារបាយការណ៍ BM បញ្ចូលដោយដៃ ដូច្នេះមិនមានប្រភព LS ឬ Account ភ្ជាប់ទេ។")}</p></div></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><Metric label={text("Reviewed LS reports", "LS បានពិនិត្យរួច")} value={String(value.sourceReportIds.length)} helper={text("Linked to this report", "បានភ្ជាប់ក្នុងរបាយការណ៍នេះ")} color="border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200" /><Metric label={text("Reviewed Account reports", "Acc បានពិនិត្យរួច")} value={String(value.sourceAccountReportIds.length)} helper={text("Linked to this report", "បានភ្ជាប់ក្នុងរបាយការណ៍នេះ")} color="border-violet-200 bg-violet-50 text-violet-900 dark:border-violet-900 dark:bg-violet-950/30 dark:text-violet-200" /></div></section>
      <section className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm dark:border-slate-700 dark:bg-slate-900"><h3 className="font-bold">{text("How to read the KPI screen", "របៀបមើល KPI")}</h3><ul className="mt-3 space-y-2 text-slate-600 dark:text-slate-300"><li>{text("Auto data: collections, approvals, and report counts are calculated from linked reports.", "ទិន្នន័យស្វ័យប្រវត្តិ៖ ការប្រមូលប្រាក់ ការអនុម័ត និងចំនួនរបាយការណ៍ គណនាពីប្រភពដែលបានភ្ជាប់។")}</li><li>{text("BM confirmation: targets, notes, risk KPIs, and action plans need management input or a Loan System source.", "BM ត្រូវបញ្ជាក់៖ target, note, risk KPI និងផែនការ ត្រូវការទិន្នន័យពីអ្នកគ្រប់គ្រង ឬ Loan System។")}</li></ul></section>
    </div>
  </section>;
}
