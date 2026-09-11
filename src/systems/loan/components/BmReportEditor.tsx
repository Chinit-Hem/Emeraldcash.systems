"use client";

import { AlertTriangle, CalendarRange, ChartNoAxesCombined, ChevronDown, Plus, Settings2, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { BM_KPIS, bmKpiValues, emptyBmAccountRow, emptyBmIssue, emptyBmKpis, emptyBmPeriods, emptyBmStaffRow, type BmPeriod, type BmWorksheet } from "../utils/bmWorksheet";

type Section = "overview" | "kpis" | "team" | "issues" | "periods";
type Props = { reportDate: string; branch: string; reporterName: string; value: BmWorksheet; onChange: (value: BmWorksheet) => void; readOnly: boolean; isKhmer: boolean };
const fieldClass = "mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 read-only:border-slate-200 read-only:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:read-only:bg-slate-900";

function NumberField({ label, value, onChange, readOnly }: { label: string; value: string; onChange: (value: string) => void; readOnly: boolean }) {
  return <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">{label}<input aria-label={label} type="number" min={0} step="any" value={value} readOnly={readOnly} onChange={(event) => onChange(event.target.value)} className={fieldClass} /></label>;
}

function TextField({ label, value, onChange, readOnly, type = "text" }: { label: string; value: string; onChange: (value: string) => void; readOnly: boolean; type?: "text" | "date" }) {
  return <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">{label}<input aria-label={label} type={type} value={value} readOnly={readOnly} onChange={(event) => onChange(event.target.value)} className={fieldClass} /></label>;
}

function Metric({ label, value, helper, color }: { label: string; value: string; helper: string; color: string }) {
  return <article className={`rounded-xl border p-4 ${color}`}><p className="text-xs font-semibold">{label}</p><p className="mt-2 text-2xl font-bold">{value || "0"}</p><p className="mt-1 text-xs opacity-70">{helper}</p></article>;
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-950/40"><p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{label}</p><p className="mt-0.5 text-lg font-bold tabular-nums">{value}</p></div>;
}

function EditToggle({ open, onClick, label, labelOpen }: { open: boolean; onClick: () => void; label: string; labelOpen: string }) {
  return <button type="button" onClick={onClick} className={`inline-flex min-h-10 items-center gap-1.5 rounded-lg border px-3 text-sm font-semibold ${open ? "border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/40" : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"}`}>{open ? <ChevronDown className="h-4 w-4" /> : <Settings2 className="h-4 w-4" />}{open ? labelOpen : label}</button>;
}

const numText = (value: string) => value.trim() === "" ? "0" : Number(value).toLocaleString();
const dash = (value: string) => value.trim() === "" ? "—" : Number(value).toLocaleString();
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

export default function BmReportEditor({ value, onChange, readOnly, isKhmer, reportDate, branch, reporterName }: Props) {
  const [section, setSection] = useState<Section>("overview");
  const [kpiOpen, setKpiOpen] = useState<Record<string, boolean>>({});
  const [staffOpen, setStaffOpen] = useState<Record<number, boolean>>({});
  const [accountOpen, setAccountOpen] = useState<Record<number, boolean>>({});
  const [issueOpen, setIssueOpen] = useState<Record<number, boolean>>({});
  const [periodOpen, setPeriodOpen] = useState<Record<number, boolean>>({});
  const text = (en: string, km: string) => isKhmer ? km : en;
  const kpis = value.kpis || emptyBmKpis();
  const issues = value.issues || [emptyBmIssue()];
  const periods = value.periods || emptyBmPeriods();
  const daily = periods.find((row) => row.period === "daily") || periods[0];
  const monthly = periods.find((row) => row.period === "monthly") || periods[1];
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
  // In review mode, empty optional sections add visual noise and can look like
  // broken source links. Keep every section available while the BM is editing.
  const showTeamSection = !readOnly || staffCount > 0;
  const showIssuesSection = !readOnly || openIssueCount > 0;
  const showPeriodsSection = !readOnly || periodsWithData > 0;
  const showNotes = !readOnly || Boolean(value.notes.trim());
  const tabs: Array<[Section, string, typeof Users, string?]> = [
    ["overview", text("Overview", "ទិដ្ឋភាពរួម"), ChartNoAxesCombined], ["kpis", "KPI", ChartNoAxesCombined, `${kpiCount}/${BM_KPIS.length}`],
    ["team", text("Team Performance", "លទ្ធផលក្រុម"), Users, String(staffCount)], ["issues", text("Issues", "បញ្ហា"), AlertTriangle, String(openIssueCount)], ["periods", text("Periods", "រយៈពេល"), CalendarRange, `${periodsWithData}/${periods.length}`],
  ];
  const visibleTabs = tabs.filter(([id]) => id !== "team" || showTeamSection).filter(([id]) => id !== "issues" || showIssuesSection).filter(([id]) => id !== "periods" || showPeriodsSection);

  return <section className="space-y-5 p-3 text-slate-900 dark:text-slate-100 sm:p-5">
    <header className="rounded-2xl bg-gradient-to-r from-emerald-700 to-teal-600 p-5 text-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-emerald-100">{value.mode === "generated" ? text("Generated report", "របាយការណ៍ស្វ័យប្រវត្តិ") : text("Manual report", "របាយការណ៍បញ្ចូលដោយដៃ")}</p><h2 className="mt-1 text-xl font-bold">{text("Branch Manager Report", "របាយការណ៍ប្រធានសាខា")}</h2></div>{readOnly ? <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">{text("View only", "មើលតែប៉ុណ្ណោះ")}</span> : null}</div>
      <div className="mt-4 grid gap-2 text-sm text-emerald-50 sm:grid-cols-3"><span>{reportDate}</span><span>{branch || "—"}</span><span>{reporterName || "—"}</span></div>
    </header>

    <nav aria-label={text("Report sections", "ផ្នែករបាយការណ៍")} className="sticky top-0 z-10 flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900 print:hidden">{visibleTabs.map(([id, label, Icon, count]) => <button key={id} type="button" aria-pressed={section === id} onClick={() => setSection(id)} className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-semibold ${section === id ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`}><Icon className="h-4 w-4" />{label}{count ? <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold ${section === id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300"}`}>{count}</span> : null}</button>)}</nav>

    <div className={section === "overview" ? "space-y-5" : "hidden print:block"}>
      <div className={`grid grid-cols-2 gap-3 ${isManualReport ? "lg:grid-cols-2" : "lg:grid-cols-4"}`}>
        {!isManualReport ? <><Metric label={text("LS reports", "របាយការណ៍ LS")} value={daily.lsReports} helper={text("Today", "ថ្ងៃនេះ")} color="border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200" />
        <Metric label={text("Account reports", "របាយការណ៍គណនេយ្យ")} value={daily.accountReports} helper={text("Today", "ថ្ងៃនេះ")} color="border-violet-200 bg-violet-50 text-violet-900 dark:border-violet-900 dark:bg-violet-950/30 dark:text-violet-200" /></> : null}
        <Metric label={text("Approved loans", "ឥណទានបានអនុម័ត")} value={daily.approved} helper={`$${Number(daily.approvedAmount || 0).toLocaleString()}`} color="border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200" />
        <Metric label={text("Collected", "ប្រាក់ប្រមូលបាន")} value={`$${Number(daily.collected || 0).toLocaleString()}`} helper={`${daily.paid || 0} ${text("payments", "ការបង់ប្រាក់")}`} color="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2"><article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"><h3 className="font-bold">{text("Monthly progress", "វឌ្ឍនភាពប្រចាំខែ")}</h3><div className="mt-4 grid grid-cols-2 gap-3"><Metric label={text("Requests", "សំណើ")} value={monthly.requested} helper={text("Month to date", "សរុបក្នុងខែ")} color="border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800" /><Metric label={text("Approvals", "ការអនុម័ត")} value={monthly.approved} helper={`$${Number(monthly.approvedAmount || 0).toLocaleString()}`} color="border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800" /></div></article><article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"><h3 className="font-bold">{isManualReport ? text("Manual report content", "ខ្លឹមសារដែលបញ្ចូលដោយដៃ") : text("Report readiness", "ភាពរួចរាល់")}</h3><div className="mt-4 space-y-3 text-sm">{isManualReport ? <p className="text-slate-500">{text("Figures in this report were entered by the Branch Manager. No LS or Account source links are required.", "លេខក្នុងរបាយការណ៍នេះបញ្ចូលដោយប្រធានសាខា ហើយមិនត្រូវការភ្ជាប់ប្រភព LS ឬ Account ទេ។")}</p> : <><p className="flex justify-between"><span className="text-slate-500">{text("Loan specialists", "អ្នកឯកទេសផ្ដល់កម្ចី")}</span><strong>{value.staff.filter((row) => row.name.trim()).length}</strong></p><p className="flex justify-between"><span className="text-slate-500">{text("Account sources", "ប្រភពគណនេយ្យ")}</span><strong>{value.accounts.filter((row) => row.name.trim()).length}</strong></p></>}<p className="flex justify-between"><span className="text-slate-500">{text("Open issues", "បញ្ហា")}</span><strong>{issues.filter((row) => row.issue.trim()).length}</strong></p></div></article></div>
      {showNotes ? <label className="block rounded-xl border border-slate-200 bg-white p-4 text-sm font-semibold dark:border-slate-700 dark:bg-slate-900">{text("Additional notes", "កំណត់សម្គាល់បន្ថែម")}<textarea rows={4} value={value.notes} readOnly={readOnly} onChange={(event) => onChange({ ...value, notes: event.target.value })} className={`${fieldClass} resize-y`} placeholder={text("Add a management note…", "បន្ថែមកំណត់សម្គាល់…")} /></label> : null}
    </div>

<div className={section === "kpis" ? "grid gap-4 lg:grid-cols-2" : "hidden print:grid print:gap-4"}>{BM_KPIS.map(([id, km, en, percent]) => { const row = kpis.find((item) => item.id === id) || { id, target: "", daily: "", monthly: "", note: "" }; const computed = bmKpiValues(kpis, row);
      const pct = computed.achievement === null ? null : computed.achievement * 100;
      const barClass = pct === null ? "bg-slate-200" : pct < 50 ? "bg-red-500" : pct < 90 ? "bg-amber-500" : "bg-emerald-500";
      const pillClass = pct === null ? "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400" : pct < 50 ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300" : pct < 90 ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";
      const update = (key: "target" | "daily" | "monthly" | "note", next: string) => onChange({ ...value, kpis: kpis.map((item) => item.id === id ? { ...item, [key]: next } : item) });
      const open = Boolean(kpiOpen[id]);
      const displayDaily = id === "collectionRate" ? computed.daily : row.daily;
      const displayMonthly = id === "collectionRate" ? computed.monthly : row.monthly;
      const displayValue = (value: string) => `${dash(value)}${percent ? "%" : ""}`;
      return <article key={id} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-3"><h3 className="min-w-0 font-bold">{isKhmer ? km : en}</h3><span className={`h-fit shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${pillClass}`}>{pct === null ? "—" : `${pct.toFixed(1)}%`}</span></div>
        <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-3"><SummaryStat label={text("Target", "គោលដៅ")} value={displayValue(row.target)} /><SummaryStat label={text("Today", "ថ្ងៃនេះ")} value={displayValue(displayDaily)} /><SummaryStat label={text("Month", "ខែ")} value={displayValue(displayMonthly)} /></div>
        {pct !== null ? <div className="mt-3"><div className="flex items-center justify-between text-xs text-slate-500"><span>{text("Achievement", "វឌ្ឍនភាពសម្រេច")}</span><strong className="tabular-nums">{pct.toFixed(1)}%</strong></div><div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" title={`${pct.toFixed(1)}%`}><div className={`h-full rounded-full ${barClass}`} style={{ width: `${Math.min(100, pct)}%` }} /></div></div> : null}
        {row.note.trim() ? <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:bg-slate-950/40 dark:text-slate-300"><span className="font-semibold">{text("Note", "កំណត់សម្គាល់")}: </span>{row.note}</p> : null}
        {readOnly ? null : <>
          <div className="mt-4"><EditToggle open={open} onClick={() => setKpiOpen((prev) => ({ ...prev, [id]: !prev[id] }))} label={text("Edit numbers", "កែលេខ")} labelOpen={text("Done", "រួចរាល់")} /></div>
          <div className={`mt-3 grid gap-3 sm:grid-cols-3 ${open ? "" : "hidden print:grid print:gap-3"}`}><NumberField label={text("Target", "គោលដៅ") + (percent ? " (%)" : "")} value={row.target} onChange={(next) => update("target", next)} readOnly={false} /><NumberField label={text("Today", "ថ្ងៃនេះ")} value={displayDaily} onChange={(next) => update("daily", next)} readOnly={id === "collectionRate"} /><NumberField label={text("This month", "ខែនេះ")} value={displayMonthly} onChange={(next) => update("monthly", next)} readOnly={id === "collectionRate"} /><div className="sm:col-span-3"><TextField label={text("Note", "កំណត់សម្គាល់")} value={row.note} onChange={(next) => update("note", next)} readOnly={false} /></div></div>
        </>}
      </article>; })}</div>

    <div className={section === "team" ? "space-y-6" : "hidden print:block"}>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label={text("Approved (team)", "អនុម័ត (ក្រុម)")} value={numText(String(staffApproved))} helper={`${staffCount} ${text("specialists", "មន្ត្រី")}`} color="border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200" />
        <Metric label={text("Collected (team)", "ប្រមូលបាន (ក្រុម)")} value={`$${numText(String(staffCollected))}`} helper={`${staffContacts} ${text("contacts", "ទំនាក់ទំនង")}`} color="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200" />
        <Metric label={text("Contacts (team)", "អតិថិជនដោះស្រាយ (ក្រុម)")} value={numText(String(staffContacts))} helper={text("All specialists", "គ្រប់មន្ត្រី")} color="border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200" />
        <Metric label={text("Account collected", "គណនេយ្យប្រមូល")} value={`$${numText(String(accountCollected))}`} helper={`${accountCount} ${text("contributors", "បុគ្គលិក")}`} color="border-violet-200 bg-violet-50 text-violet-900 dark:border-violet-900 dark:bg-violet-950/30 dark:text-violet-200" />
      </div>
      <div>
        <h3 className="mb-3 text-lg font-bold">{text("Loan Specialists", "អ្នកឯកទេសផ្ដល់កម្ចី")}</h3>
        <div className="space-y-4">{value.staff.map((row, index) => { const open = Boolean(staffOpen[index]); const approved = Number(row.approved) || 0; const collected = Number(row.collected) || 0; const rejected = Number(row.rejected) || 0; const contacts = Number(row.contacts) || 0; const rate = approved + rejected + collected > 0 ? (collected / (approved + rejected + collected)) * 100 : null; return <article key={index} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-3"><h4 className="min-w-0 truncate font-bold">{row.name || `${text("Loan specialist", "អ្នកឯកទេសផ្ដល់កម្ចី")} ${index + 1}`}</h4><div className="flex shrink-0 items-center gap-2">{!readOnly ? <EditToggle open={open} onClick={() => toggle(setStaffOpen, index)} label={text("Edit", "កែ")} labelOpen={text("Done", "រួចរាល់")} /> : null}{!readOnly ? <button type="button" aria-label={text("Remove", "លុប")} onClick={() => onChange({ ...value, staff: value.staff.filter((_, rowIndex) => rowIndex !== index) })} className="flex h-10 w-10 items-center justify-center rounded-lg text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button> : null}</div></div>
          <div className="mt-3 grid grid-cols-3 gap-3 sm:max-w-md"><SummaryStat label={text("Approved", "អនុម័ត")} value={numText(String(approved))} /><SummaryStat label={text("Collected", "ប្រមូលបាន")} value={`$${numText(String(collected))}`} /><SummaryStat label={text("Contacts", "ទំនាក់ទំនង")} value={numText(String(contacts))} /></div>
          {rate !== null ? <div className="mt-3"><div className="flex items-center justify-between text-xs text-slate-500"><span>{text("Collection rate", "អត្រាប្រមូល")}</span><strong className="tabular-nums">{rate.toFixed(1)}%</strong></div><div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className={`h-full rounded-full ${rate < 50 ? "bg-red-500" : rate < 90 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(100, rate)}%` }} /></div></div> : null}
          <div className={`mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 ${open || readOnly ? "" : "hidden print:grid print:gap-3"}`}><div className="sm:col-span-2 lg:col-span-3"><TextField label={text("Name", "ឈ្មោះ")} value={row.name} onChange={(next) => updateStaff(index, "name", next)} readOnly={readOnly} /></div>{(["requested", "approved", "rejected", "collected", "contacts"] as const).map((key) => <NumberField key={key} label={text(key[0].toUpperCase() + key.slice(1), ({ requested: "ស្នើសុំ", approved: "អនុម័ត", rejected: "បដិសេធ", collected: "ប្រមូលបាន", contacts: "អតិថិជនដោះស្រាយ" } as const)[key])} value={row[key]} onChange={(next) => updateStaff(index, key, next)} readOnly={readOnly} />)}</div>
        </article>; })}
        {!readOnly ? <button type="button" onClick={() => onChange({ ...value, staff: [...value.staff, emptyBmStaffRow()] })} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg border border-emerald-300 px-4 font-semibold text-emerald-700 hover:bg-emerald-50"><Plus className="h-4 w-4" />{text("Add staff", "បន្ថែមបុគ្គលិក")}</button> : null}
        </div>
      </div>
      <div>
        <h3 className="mb-3 text-lg font-bold">{text("Account Contributors", "បុគ្គលិកគណនេយ្យ")}</h3>
        <div className="space-y-4">{value.accounts.map((row, index) => { const open = Boolean(accountOpen[index]); return <article key={index} className="rounded-xl border border-violet-200 bg-violet-50/40 p-4 dark:border-violet-900 dark:bg-violet-950/20">
          <div className="flex items-center justify-between gap-3"><h4 className="min-w-0 truncate font-bold">{row.name || `${text("Account staff", "បុគ្គលិកគណនេយ្យ")} ${index + 1}`}</h4><div className="flex shrink-0 items-center gap-2">{!readOnly ? <EditToggle open={open} onClick={() => toggle(setAccountOpen, index)} label={text("Edit", "កែ")} labelOpen={text("Done", "រួចរាល់")} /> : null}{!readOnly ? <button type="button" aria-label={text("Remove", "លុប")} onClick={() => onChange({ ...value, accounts: value.accounts.filter((_, rowIndex) => rowIndex !== index) })} className="flex h-10 w-10 items-center justify-center rounded-lg text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button> : null}</div></div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:max-w-md"><SummaryStat label={text("Due customers", "អតិថិជនត្រូវបង់")} value={numText(row.due)} /><SummaryStat label={text("Paid customers", "អតិថិជនបានបង់")} value={numText(row.paid)} /><SummaryStat label={text("Due amount", "ប្រាក់ត្រូវបង់")} value={`$${numText(row.dueAmount)}`} /><SummaryStat label={text("Paid amount", "ប្រាក់បានបង់")} value={`$${numText(row.paidAmount)}`} /></div>
          <div className={`mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 ${open || readOnly ? "" : "hidden print:grid print:gap-3"}`}><div className="sm:col-span-2 lg:col-span-3"><TextField label={text("Name", "ឈ្មោះ")} value={row.name} onChange={(next) => updateAccount(index, "name", next)} readOnly={readOnly} /></div>{(["due", "paid", "dueAmount", "paidAmount"] as const).map((key) => <NumberField key={key} label={text(({ due: "Due customers", paid: "Paid customers", dueAmount: "Due amount", paidAmount: "Paid amount" } as const)[key], ({ due: "អតិថិជនត្រូវបង់", paid: "អតិថិជនបានបង់", dueAmount: "ប្រាក់ត្រូវបង់", paidAmount: "ប្រាក់បានបង់" } as const)[key])} value={row[key]} onChange={(next) => updateAccount(index, key, next)} readOnly={readOnly} />)}</div>
        </article>; })}
        {!readOnly ? <button type="button" onClick={() => onChange({ ...value, accounts: [...value.accounts, emptyBmAccountRow()] })} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg border border-violet-300 px-4 font-semibold text-violet-700 hover:bg-violet-50"><Plus className="h-4 w-4" />{text("Add account staff", "បន្ថែមបុគ្គលិកគណនេយ្យ")}</button> : null}
        </div>
      </div>
    </div>

    <div className={section === "issues" ? "space-y-4" : "hidden print:block"}>
      <div className="grid grid-cols-2 gap-3 sm:max-w-md">
        <Metric label={text("Open issues", "បញ្ហាបើក")} value={numText(String(openIssueCount))} helper={text("Reported", "បានកត់ត្រា")} color="border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900" />
        <Metric label={text("Overdue", "ហួសកំណត់")} value={numText(String(overdueIssueCount))} helper={text("Past deadline", "ហួសកាលកំណត់")} color="border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200" />
      </div>
      {issues.map((row, index) => { const isNew = !row.issue.trim(); const isOverdue = Boolean(row.deadline && !isNew && row.deadline < todayIso); const open = Boolean(issueOpen[index]); const dotClass = isOverdue ? "bg-red-500" : isNew ? "bg-slate-300 dark:bg-slate-600" : "bg-emerald-500"; return <article key={index} className={`rounded-xl border p-4 ${isOverdue ? "border-red-300 bg-red-50/60 dark:border-red-900 dark:bg-red-950/20" : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0"><div className="flex items-center gap-2"><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dotClass}`} /><h3 className="truncate font-bold">{row.issue || `${text("Issue", "បញ្ហា")} ${index + 1}`}</h3></div><p className="mt-1 truncate text-xs text-slate-500">{row.deadline ? friendlyDate(row.deadline) : text("No deadline set", "គ្មានកំណត់កាល")}{row.owner.trim() ? ` · ${row.owner}` : ""}{row.principal.trim() ? ` · $${numText(row.principal)}` : ""}</p></div>
          <div className="flex shrink-0 items-center gap-2">{isNew ? null : <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${isOverdue ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"}`}>{isOverdue ? text("Overdue", "ហួសកំណត់") : text("Open", "បើក")}</span>}{!readOnly ? <EditToggle open={open} onClick={() => toggle(setIssueOpen, index)} label={text("Edit", "កែ")} labelOpen={text("Done", "រួចរាល់")} /> : null}{!readOnly ? <button type="button" aria-label={text("Remove", "លុប")} onClick={() => onChange({ ...value, issues: issues.filter((_, rowIndex) => rowIndex !== index) })} className="flex h-10 w-10 items-center justify-center rounded-lg text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button> : null}</div>
        </div>
        <div className={`mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 ${open || readOnly ? "" : "hidden print:grid print:gap-3"}`}><TextField label={text("Issue / overdue case", "បញ្ហា / ករណីយឺតយ៉ាវ")} value={row.issue} onChange={(next) => updateIssue(index, "issue", next)} readOnly={readOnly} /><TextField label={text("Customer / staff", "អតិថិជន / បុគ្គលិក")} value={row.name} onChange={(next) => updateIssue(index, "name", next)} readOnly={readOnly} /><NumberField label={text("Principal", "ប្រាក់ដើម")} value={row.principal} onChange={(next) => updateIssue(index, "principal", next)} readOnly={readOnly} /><TextField label={text("Solution", "ដំណោះស្រាយ")} value={row.action} onChange={(next) => updateIssue(index, "action", next)} readOnly={readOnly} /><TextField label={text("Responsible person", "អ្នកទទួលខុសត្រូវ")} value={row.owner} onChange={(next) => updateIssue(index, "owner", next)} readOnly={readOnly} /><TextField label={text("Deadline", "ថ្ងៃកំណត់")} value={row.deadline} onChange={(next) => updateIssue(index, "deadline", next)} readOnly={readOnly} type="date" /></div>
      </article>; })}
      {!readOnly ? <button type="button" onClick={() => onChange({ ...value, issues: [...issues, emptyBmIssue()] })} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-emerald-300 px-4 font-semibold text-emerald-700 hover:bg-emerald-50"><Plus className="h-4 w-4" />{text("Add issue", "បន្ថែមបញ្ហា")}</button> : null}
    </div>

    <div className={section === "periods" ? "grid gap-4 lg:grid-cols-3" : "hidden print:grid print:gap-4"}>{periods.map((row, index) => { const open = Boolean(periodOpen[index]); return <article key={row.period} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-3"><h3 className="font-bold">{[text("Today", "ថ្ងៃនេះ"), text("This month", "ខែនេះ"), text("This year", "ឆ្នាំនេះ")][index]}</h3>{!readOnly ? <EditToggle open={open} onClick={() => toggle(setPeriodOpen, index)} label={text("Edit", "កែ")} labelOpen={text("Done", "រួចរាល់")} /> : null}</div>
      <p className="mt-1 text-xs text-slate-500">{reportDate.slice(0, [10, 7, 4][index])}</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Metric label={text("LS reports", "របាយការណ៍ LS")} value={numText(row.lsReports)} helper={text("Submitted", "បានដាក់")} color="border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200" />
        <Metric label={text("Account", "គណនេយ្យ")} value={numText(row.accountReports)} helper={text("reports", "របាយការណ៍")} color="border-violet-200 bg-violet-50 text-violet-900 dark:border-violet-900 dark:bg-violet-950/30 dark:text-violet-200" />
        <Metric label={text("Approved", "អនុម័ត")} value={numText(row.approved)} helper={`$${numText(row.approvedAmount)}`} color="border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200" />
        <Metric label={text("Collected", "ប្រមូលបាន")} value={`$${numText(row.collected)}`} helper={`${numText(row.paid)} ${text("payments", "ការបង់ប្រាក់")}`} color="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200" />
      </div>
      <div className={`mt-4 grid grid-cols-2 gap-3 ${open || readOnly ? "" : "hidden print:grid print:gap-3"}`}>{Object.keys(PERIOD_FIELDS).map((key) => { const [en, km] = PERIOD_FIELDS[key]; const current = row[key as keyof BmPeriod]; return <NumberField key={key} label={isKhmer ? km : en} value={current} onChange={(next) => onChange({ ...value, periods: periods.map((item) => item.period === row.period ? { ...item, [key]: next } : item) })} readOnly={readOnly} />; })}</div>
    </article>; })}</div>
  </section>;
}
