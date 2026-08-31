"use client";

import type { ChangeEvent, FormEvent, KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
import { Fragment, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DateInput } from "@/shared/components/DateInput";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Camera,
  Check,
  ChevronDown,
  CircleDollarSign,
  Clock,
  CreditCard,
  Download,
  Eye,
  FilePlus2,
  Filter,
  FolderOpen,
  HandCoins,
  LayoutGrid,
  List,
  Loader2,
  MessageCircle,
  MoreVertical,
  Paperclip,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  SquarePlus,
  Trash2,
  TrendingUp,
  Upload,
  UserRound,
  Users,
  X,
  XCircle,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { endOfDay, endOfMonth, endOfQuarter, endOfWeek, endOfYear, startOfDay, startOfMonth, startOfQuarter, startOfWeek, startOfYear, subDays, subMonths, subQuarters, subYears } from "date-fns";

import type { CreateLoanActivityInput, CreateLoanInput, CustomerProfile, LoanActivity, LoanActivityFeed, LoanBankingAccount, LoanBorrower, LoanChartAccount, LoanContactInput, LoanContactsInformation, LoanDashboardData, LoanDetail, LoanEntity, LoanInformation, LoanJournalItem, LoanRelatedContact, LoanTypeDefinition } from "@/systems/loan/services/LoanService";
import { useToast } from "@/shared/components/ui/glass/GlassToast";
import { useAuthUser } from "@/shared/hooks/AuthContext";
import { useLanguage } from "@/shared/hooks/LanguageContext";
import { hasAppPermission } from "@/shared/utils/permissions";
import type { Language } from "@/shared/utils/i18n";
import EmeraldCashLogo from "@/shared/components/EmeraldCashLogo";
import dynamic from "next/dynamic";

const LoanRevenueChart = dynamic(() => import("./charts/LoanRevenueChart").then((m) => m.default), { ssr: false });

type ApiResponse<T> = { success: boolean; data?: T; error?: string };
type RememberedReportFields = Record<string, string[]>;

function normalizeReportBranchLabel(value: string) {
  const normalized = value.normalize("NFKC").toLocaleLowerCase().replace(/[\s\u200B-\u200D\uFEFF_-]+/gu, "");
  if (normalized.includes("sensok") || normalized.includes("សែនសុខ")) return "sen-sok";
  if (normalized.includes("boeungkengkang") || normalized.includes("bkk") || normalized.includes("បឹងកេងកង")) return "bkk";
  return normalized;
}

function useRememberedReportFields(storageKey: string) {
  const [fields, setFields] = useState<RememberedReportFields>({});

  useEffect(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(storageKey) || "{}") as unknown;
      if (!stored || typeof stored !== "object" || Array.isArray(stored)) return;
      const normalized = Object.fromEntries(Object.entries(stored as Record<string, unknown>).map(([field, values]) => [
        field,
        Array.isArray(values) ? values.map(String).map((value) => value.trim()).filter(Boolean).slice(0, 100) : [],
      ]));
      setFields(normalized);
    } catch { /* Browser storage may be unavailable or contain an older format. */ }
  }, [storageKey]);

  const remember = useCallback((field: string, rawValue: string) => {
    const value = rawValue.trim();
    if (!value) return;
    setFields((current) => {
      const next = { ...current, [field]: Array.from(new Set([...(current[field] || []), value])).sort((left, right) => left.localeCompare(right)).slice(0, 100) };
      try { window.localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* Browser storage may be unavailable. */ }
      return next;
    });
  }, [storageKey]);

  const forget = useCallback((field: string, value: string) => {
    setFields((current) => {
      const next = { ...current, [field]: (current[field] || []).filter((item) => item !== value) };
      try { window.localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* Browser storage may be unavailable. */ }
      return next;
    });
  }, [storageKey]);

  return { fields, remember, forget };
}

function RememberedReportValuesManager({ fields, onRemove, onClose }: { fields: RememberedReportFields; onRemove: (field: string, value: string) => void; onClose: () => void }) {
  const groups = Object.entries(fields).filter(([, values]) => values.length);
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 print:hidden">
      <div className="flex items-center justify-between gap-3"><div><h3 className="font-bold text-slate-900 dark:text-white">Saved report values</h3><p className="text-sm text-slate-500">Remove values you no longer want to see in field suggestions.</p></div><button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close saved values"><X className="h-4 w-4" /></button></div>
      {groups.length ? <div className="mt-4 space-y-3">{groups.map(([field, values]) => <div key={field}><p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{field.replace(/([A-Z])/g, " $1")}</p><div className="flex flex-wrap gap-2">{values.map((value) => <span key={value} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 py-1 pl-3 pr-1 text-sm dark:border-slate-700 dark:bg-slate-800">{value}<button type="button" onClick={() => onRemove(field, value)} className="rounded-full p-1 text-slate-400 hover:bg-red-100 hover:text-red-700" aria-label={`Remove ${value}`}><X className="h-3.5 w-3.5" /></button></span>)}</div></div>)}</div> : <p className="mt-4 text-sm text-slate-500">No saved values yet.</p>}
    </section>
  );
}

type EnhancedLoanFormState = {
  borrowerId: string;
  fullName: string;
  phone: string;
  email: string;
  nationalId: string;
  address: string;
  customerProfile: CustomerProfile;
  transactionNo: string;
  loanType: string;
  principal: string;
  loanAmountKHR: string;
  firstAmountCTR: string;
  formula: string;
  interestRate: string;
  ratePeriod: "Annually" | "Monthly" | "Weekly" | "Daily";
  rateKHR: string;
  termMonths: string;
  termUnit: "Days" | "Weeks" | "Months" | "Years";
  payback: "Daily" | "Weekly" | "Bi-Weekly" | "Half Monthly" | "Monthly" | "Quarterly" | "Semi Yearly" | "Yearly";
  startDate: string;
  contractDate: string;
  contractDateLunar: string;
  contractEndDate: string;
  firstPaymentDate: string;
  purpose: string;
  notes: string;
  loanInformation: Record<keyof LoanInformation, string>;
  loanContacts: LoanContactsInformation;
};

type LoanFormSuggestions = {
  borrowers: LoanBorrower[];
  loanTypes: string[];
};

type LoanTypeEditorState = Omit<LoanTypeDefinition, "id">;
type CustomerCompanyPresetFilter = "individuals" | "companies" | "customers" | "vendors" | "archived";
type LoanDashboardView = "summary" | "loans" | "borrowers" | "contacts" | "accounting" | "operationReport" | "journalItems";
type LoanTypeAccountField = "incomeAccount" | "penaltyAccount" | "feeAccount" | "badDebtAccount";
type LoanChartAccountEditorState = Omit<LoanChartAccount, "id">;
type LoanTypeUserOption = {
  username: string;
  full_name?: string | null;
  role?: string | null;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  profile_picture?: string | null;
};
type LoanTeamMemberDraft = Required<Pick<LoanTypeUserOption, "username">> & {
  full_name: string;
  email: string;
  phone: string;
  mobile: string;
  profile_picture: string;
};
type RelatedContactEditorTab = "general" | "contacts" | "sales" | "invoicing" | "map" | "notes";
type ContactAddressRow = { name: string; phone: string; email: string; address: string };
type ContactBankRow = { bank: string; accountNumber: string };
type CustomerContactRow = { type?: string; name?: string; nameKhmer?: string; imageUrl?: string; title?: string; titleAbbreviation?: string; jobPosition?: string; address1: string; address2: string; country: string; email: string; phone: string; mobile: string; notes: string };
type CustomerEditorTab = "general" | "contacts" | "sales" | "invoicing" | "map" | "notes" | "compliance";
type LoanListDateFilter = "" | "today" | "week" | "month" | "year";
type LoanListGroupBy = "none" | "loanType" | "customer" | "creditOfficer" | "repaymentFrequency" | "repaymentStatus" | "term" | "createdBy" | "startMonth" | "amountBand";
type LoanListCustomField = "loanNumber" | "customer" | "loanType" | "repaymentStatus" | "principal" | "termMonths";
type LoanListCustomOperator = "contains" | "equals" | "greaterThan" | "lessThan";
type LoanListCustomFilter = { field: LoanListCustomField; operator: LoanListCustomOperator; value: string };

function toggleCustomerVendorRelationship(current: string | undefined, target: "customer" | "vendor", checked: boolean) {
  let customer = current === "customer" || current === "customer_vendor";
  let vendor = current === "vendor" || current === "customer_vendor";
  if (target === "customer") customer = checked;
  else vendor = checked;
  if (customer && vendor) return "customer_vendor";
  if (customer) return "customer";
  if (vendor) return "vendor";
  return "";
}

type CountryOption = { name: string; nameKm: string; code: string };
type CustomerCategoryOption = { name: string; active: boolean; parent: string };

// ISO 3166-1 countries and territories, plus Kosovo (XK), matching the 250-row
// country selector used by the reference system.
const COUNTRY_CODES = "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW XK".split(" ");
const countryDisplayNames = new Intl.DisplayNames(["en"], { type: "region" });
const countryDisplayNamesKm = new Intl.DisplayNames(["km"], { type: "region" });
const COUNTRY_OPTIONS: CountryOption[] = COUNTRY_CODES
  .map((code) => ({ code, name: countryDisplayNames.of(code) || code, nameKm: countryDisplayNamesKm.of(code) || code }))
  .sort((left, right) => left.name.localeCompare(right.name, "en"));
const NATIONALITY_CODES = new Set("AD AE AF AG AL AM AO AR AT AU AZ BA BB BD BE BF BG BH BI BJ BN BO BR BS BT BW BY BZ CA CD CF CG CH CI CL CM CN CO CR CU CV CY CZ DE DJ DK DM DO DZ EC EE EG ER ES ET FI FJ FR GA GB GD GE GH GM GN GQ GR GT GW GY HN HR HT HU ID IE IL IN IQ IR IS IT JM JO JP KE KG KH KM KP KR KW KZ LA LB LC LK LR LS LT LU LV LY MA MD ME MG MK ML MM MN MR MT MU MV MW MX MY MZ NA NE NG NI NL NO NP NU NZ OM PA PE PG PH PK PL PS PT PY QA RO RS RU RW SA SB SC SD SE SG SI SK SL SN SO SR SS SV SY SZ TD TG TH TJ TL TM TN TO TR TT TW TZ UA UG US UY UZ VC VE VN VU WS YE ZA ZM ZW".split(" "));
const NATIONALITY_OPTIONS = COUNTRY_OPTIONS.filter((country) => NATIONALITY_CODES.has(country.code));

function profileRows<T>(value: string | undefined): T[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed as T[] : [];
  } catch {
    return [];
  }
}

function emptyCustomerContactRow(): CustomerContactRow {
  return { type: "Contact", name: "", nameKhmer: "", imageUrl: "", title: "", titleAbbreviation: "", jobPosition: "", address1: "", address2: "", country: "", email: "", phone: "", mobile: "", notes: "" };
}

function emptyLoanTypeEditor(name = ""): LoanTypeEditorState {
  return { name, nameKhmer: "", approvers: [], amountOffer: 0, minOffer: 0, maxOffer: 0, approverRequired: false, contractTerms: "", currency: "USD", sequenceCode: "", incomeAccount: "402100 Admin fee income", penaltyAccount: "403100 Penalty income", feeAccount: "402100 Admin fee income", badDebtAccount: "604400 Written-off Bad Debts Expenses" };
}

function emptyLoanChartAccount(): LoanChartAccountEditorState {
  return { code: "", name: "", type: "Current Assets", defaultTaxes: "", tags: "", accountGroup: "", accountCurrency: "", allowReconciliation: false, inactive: false };
}

function loanChartAccountLabel(account: Pick<LoanChartAccount, "code" | "name">): string {
  return `${account.code} ${account.name}`.trim();
}

function loanTypeEditorFromDefaults(name: string): LoanTypeEditorState {
  const catalogItem = DEFAULT_LOAN_TYPE_CATALOG.find((item) => item.name.toLowerCase() === name.trim().toLowerCase());
  const amount = (value?: string) => Number((value || "0").replace(/[^\d.-]/g, "")) || 0;
  return {
    ...emptyLoanTypeEditor(name),
    minOffer: amount(catalogItem?.minOffer),
    maxOffer: amount(catalogItem?.maxOffer),
    approverRequired: Boolean(catalogItem),
    contractTerms: catalogItem?.contractTerms || "",
    currency: catalogItem?.currency || "USD",
    sequenceCode: "LOAN",
    incomeAccount: "401100 Interest Income",
  };
}

// These are the established loan products from the previous system. Additional
// products used by the organisation are appended from the database.
const DEFAULT_LOAN_TYPES = ["Car LOAN", "Motor LOAN", "Titles LOAN", "Electronic LOAN", "Real Estate", "STANDARD", "PAWN"];
const DEFAULT_LOAN_TYPE_CATALOG = [
  { name: "Car LOAN", minOffer: "$100.00", maxOffer: "$60,000.00", contractTerms: "PAWN", currency: "USD" },
  { name: "Motor LOAN", minOffer: "$100.00", maxOffer: "$2,000.00", contractTerms: "PAWN", currency: "USD" },
  { name: "Titles LOAN", minOffer: "$0.00", maxOffer: "$0.00", contractTerms: "PAWN", currency: "USD" },
  { name: "Electronic LOAN", minOffer: "$100.00", maxOffer: "$500.00", contractTerms: "PAWN", currency: "USD" },
  { name: "Real Estate", minOffer: "$5,000.00", maxOffer: "$50,000.00", contractTerms: "PAWN", currency: "USD" },
  { name: "STANDARD", minOffer: "$0.00", maxOffer: "$0.00", contractTerms: "DEFAULT TERMS", currency: "USD" },
  { name: "PAWN", minOffer: "$0.00", maxOffer: "$0.00", contractTerms: "PAWN", currency: "USD" },
];
const FORMULA_OPTIONS = ["Interest Only", "Fixed", "Balloon Pawn", "Balloon Day Count", "Balloon Day Count Skip Holiday", "Straight", "Flat"];
const PAYBACK_OPTIONS = ["Daily", "Weekly", "Bi-Weekly", "Half Monthly", "Monthly", "Quarterly", "Semi Yearly", "Yearly"] as const;

function interestModelForFormula(formula: string): CreateLoanInput["interestModel"] {
  switch (formula) {
    case "Interest Only":
    case "Balloon Pawn":
    case "Balloon Day Count":
    case "Balloon Day Count Skip Holiday":
      return "balloon";
    case "Straight":
      return "declining";
    case "Flat":
      return "flat";
    case "Fixed":
    default:
      return "equal_installments";
  }
}

function formulaForInterestModel(interestModel: LoanEntity["interestModel"]): string {
  if (interestModel === "balloon") return "Balloon Pawn";
  if (interestModel === "declining") return "Straight";
  if (interestModel === "flat") return "Flat";
  return "Fixed";
}

function repaymentFrequencyForPayback(payback: EnhancedLoanFormState["payback"]): CreateLoanInput["repaymentFrequency"] {
  return ({
    "Daily": "daily",
    "Weekly": "weekly",
    "Bi-Weekly": "biweekly",
    "Half Monthly": "semimonthly",
    "Monthly": "monthly",
    "Quarterly": "quarterly",
    "Semi Yearly": "semiannual",
    "Yearly": "yearly",
  } as const)[payback] || "monthly";
}

function paybackForRepaymentFrequency(frequency: LoanEntity["repaymentFrequency"]): EnhancedLoanFormState["payback"] {
  return ({ daily: "Daily", weekly: "Weekly", biweekly: "Bi-Weekly", semimonthly: "Half Monthly", monthly: "Monthly", quarterly: "Quarterly", semiannual: "Semi Yearly", yearly: "Yearly" } as const)[frequency] || "Monthly";
}

function termMonthsForInput(value: string, unit: EnhancedLoanFormState["termUnit"]): number {
  const amount = Number(value) || 0;
  if (unit === "Days") return Math.ceil(amount / 30);
  if (unit === "Weeks") return Math.ceil((amount * 7) / 30);
  if (unit === "Years") return amount * 12;
  return amount;
}

function dateInputValue(date = new Date()): string {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())).toISOString().slice(0, 10);
}

function timeInputValue(source?: string): string {
  if (source?.includes("T")) {
    const parsedSource = new Date(source);
    if (!Number.isNaN(parsedSource.getTime())) {
      return `${String(parsedSource.getHours()).padStart(2, "0")}:${String(parsedSource.getMinutes()).padStart(2, "0")}:${String(parsedSource.getSeconds()).padStart(2, "0")}`;
    }
  }
  const timeMatch = source?.match(/(?:T|\s)(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (timeMatch) {
    const hours = Number(timeMatch[1]);
    const minutes = Number(timeMatch[2]);
    const seconds = Number(timeMatch[3] || 0);
    if (hours <= 23 && minutes <= 59 && seconds <= 59) {
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }
  }
  const date = new Date();
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}`;
}

function dateDisplayValue(date = new Date(), includeTime = false, timeSource?: string): string {
  const displayDate = `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
  return includeTime ? `${displayDate} ${timeInputValue(timeSource)}` : displayDate;
}

function storedDateDisplayValue(value: string, includeTime = false, timeSource?: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return value;
  return dateDisplayValue(new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])), includeTime, timeSource);
}

function numericDateDisplayValue(value: string, includeTime = false): string {
  const maximumLength = includeTime ? 14 : 8;
  const digits = value.replace(/\D/g, "").slice(0, maximumLength);
  const date = digits.length <= 2
    ? digits
    : digits.length <= 4
      ? `${digits.slice(0, 2)}/${digits.slice(2)}`
      : `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
  if (!includeTime || digits.length <= 8) return date;
  const timeDigits = digits.slice(8);
  const time = timeDigits.length <= 2
    ? timeDigits
    : timeDigits.length <= 4
      ? `${timeDigits.slice(0, 2)}:${timeDigits.slice(2)}`
      : `${timeDigits.slice(0, 2)}:${timeDigits.slice(2, 4)}:${timeDigits.slice(4, 6)}`;
  return `${date} ${time}`;
}

function emptyForm(): EnhancedLoanFormState {
  return {
    borrowerId: "",
    fullName: "",
    phone: "",
    email: "",
    nationalId: "",
    address: "",
    customerProfile: { entityType: "individual", relationship: "customer" },
    transactionNo: "",
    loanType: "Car LOAN",
    principal: "",
    loanAmountKHR: "",
    firstAmountCTR: "0",
    formula: "Balloon Pawn",
    interestRate: "0",
    ratePeriod: "Annually",
    rateKHR: "",
    termMonths: "0",
    termUnit: "Months",
    payback: "Monthly",
    startDate: dateDisplayValue(new Date(), true),
    contractDate: dateDisplayValue(),
    contractDateLunar: "",
    contractEndDate: dateDisplayValue(),
    firstPaymentDate: dateDisplayValue(),
    purpose: "",
    notes: "",
    loanInformation: {
      amountToPayKHR: "",
      refinanceAmount: "0",
      roadTaxFee: "0",
      vehicleInspectionFee: "0",
      taxStampFee: "0",
      adminFee: "0",
      withholdingFee: "0",
      collateralCheckFee: "0",
      loanFee: "0",
      sourceLoan: "",
      penaltyRule: "",
      feeCharge: "",
    },
    loanContacts: {
      bm: null,
      collectionOfficer: null,
      loanSpecialist: null,
      coBorrowers: [],
      brokers: [],
      guarantors: [],
    },
  };
}

const DATE_FILTER_OPTIONS = [
  { value: "all_time", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "this_week", label: "This Week" },
  { value: "this_month", label: "This Month" },
  { value: "this_quarter", label: "This Quarter" },
  { value: "this_year", label: "This Year" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last_week", label: "Last Week" },
  { value: "last_month", label: "Last Month" },
  { value: "last_quarter", label: "Last Quarter" },
  { value: "last_year", label: "Last Year" },
  { value: "last_7_days", label: "Last 7 days" },
  { value: "last_30_days", label: "Last 30 days" },
  { value: "last_90_days", label: "Last 90 days" },
  { value: "last_365_days", label: "Last 365 days" },
  { value: "custom", label: "Custom Filter" },
] as const;

type DateFilterOption = (typeof DATE_FILTER_OPTIONS)[number]["value"];

function formatDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getDateRange(option: DateFilterOption) {
  const now = new Date();
  switch (option) {
    case "today": {
      const from = startOfDay(now);
      return { from: formatDateInput(from), to: formatDateInput(endOfDay(from)) };
    }
    case "yesterday": {
      const yesterday = subDays(startOfDay(now), 1);
      return { from: formatDateInput(yesterday), to: formatDateInput(endOfDay(yesterday)) };
    }
    case "this_week": {
      const from = startOfWeek(now, { weekStartsOn: 1 });
      return { from: formatDateInput(startOfDay(from)), to: formatDateInput(endOfDay(endOfWeek(now, { weekStartsOn: 1 }))) };
    }
    case "last_week": {
      const previous = subDays(now, 7);
      const from = startOfWeek(previous, { weekStartsOn: 1 });
      return { from: formatDateInput(startOfDay(from)), to: formatDateInput(endOfDay(endOfWeek(previous, { weekStartsOn: 1 }))) };
    }
    case "this_month": {
      const from = startOfMonth(now);
      return { from: formatDateInput(startOfDay(from)), to: formatDateInput(endOfDay(endOfMonth(now))) };
    }
    case "last_month": {
      const previous = subMonths(now, 1);
      return { from: formatDateInput(startOfDay(startOfMonth(previous))), to: formatDateInput(endOfDay(endOfMonth(previous))) };
    }
    case "this_quarter": {
      const from = startOfQuarter(now);
      return { from: formatDateInput(startOfDay(from)), to: formatDateInput(endOfDay(endOfQuarter(now))) };
    }
    case "last_quarter": {
      const previous = subQuarters(now, 1);
      return { from: formatDateInput(startOfDay(startOfQuarter(previous))), to: formatDateInput(endOfDay(endOfQuarter(previous))) };
    }
    case "this_year": {
      const from = startOfYear(now);
      return { from: formatDateInput(startOfDay(from)), to: formatDateInput(endOfDay(endOfYear(now))) };
    }
    case "last_year": {
      const previous = subYears(now, 1);
      return { from: formatDateInput(startOfDay(startOfYear(previous))), to: formatDateInput(endOfDay(endOfYear(previous))) };
    }
    case "last_7_days":
      return { from: formatDateInput(startOfDay(subDays(now, 6))), to: formatDateInput(endOfDay(now)) };
    case "last_30_days":
      return { from: formatDateInput(startOfDay(subDays(now, 29))), to: formatDateInput(endOfDay(now)) };
    case "last_90_days":
      return { from: formatDateInput(startOfDay(subDays(now, 89))), to: formatDateInput(endOfDay(now)) };
    case "last_365_days":
      return { from: formatDateInput(startOfDay(subDays(now, 364))), to: formatDateInput(endOfDay(now)) };
    case "all_time":
      return { from: "", to: "" };
    case "custom":
      return { from: "", to: "" };
    default:
      return { from: "", to: "" };
  }
}

function applyDateFilterOption(option: DateFilterOption) {
  if (option === "all_time") return { from: "", to: "" };
  if (option === "custom") return { from: "", to: "" };
  return getDateRange(option);
}

function toLoanPayload(form: EnhancedLoanFormState): CreateLoanInput {
  const annualRateMultiplier = { Annually: 1, Monthly: 12, Weekly: 52, Daily: 365 }[form.ratePeriod];
  return {
    borrowerId: form.borrowerId || null,
    borrower: {
      fullName: form.fullName,
      phone: form.phone || null,
      email: form.email || null,
      nationalId: form.nationalId || null,
      address: form.address || null,
      profile: form.customerProfile,
    },
    loanType: form.loanType,
    principal: Number(form.principal) || 0,
    loanAmountKHR: form.loanAmountKHR.trim() || null,
    // The database always stores an annual rate. The user can still enter it
    // in the period selected in the form, just as in the previous system.
    interestRate: (Number(form.interestRate) || 0) * annualRateMultiplier,
    termMonths: termMonthsForInput(form.termMonths, form.termUnit) || 12,
    repaymentFrequency: repaymentFrequencyForPayback(form.payback),
    interestModel: interestModelForFormula(form.formula),
    formula: form.formula || null,
    startDate: form.startDate,
    contractDate: form.contractDate,
    contractDateLunar: form.contractDateLunar || null,
    contractEndDate: form.contractEndDate,
    firstPaymentDate: form.firstPaymentDate,
    purpose: form.purpose || null,
    notes: form.notes || null,
    loanInformation: {
      amountToPayKHR: form.loanInformation.amountToPayKHR || null,
      refinanceAmount: Number(form.loanInformation.refinanceAmount) || 0,
      roadTaxFee: Number(form.loanInformation.roadTaxFee) || 0,
      vehicleInspectionFee: Number(form.loanInformation.vehicleInspectionFee) || 0,
      taxStampFee: Number(form.loanInformation.taxStampFee) || 0,
      adminFee: Number(form.loanInformation.adminFee) || 0,
      withholdingFee: Number(form.loanInformation.withholdingFee) || 0,
      collateralCheckFee: Number(form.loanInformation.collateralCheckFee) || 0,
      loanFee: Number(form.loanInformation.loanFee) || 0,
      sourceLoan: form.loanInformation.sourceLoan || null,
      penaltyRule: form.loanInformation.penaltyRule || null,
      feeCharge: form.loanInformation.feeCharge || null,
    },
    loanContacts: form.loanContacts,
  };
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null;
  if (!response.ok || !payload?.success || payload.data === undefined) {
    throw new Error(payload?.error || "Request failed");
  }
  return payload.data;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value || 0);
}

function formatLoanListCurrency(value: number): string {
  return `$ ${new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value || 0)}`;
}

function shortCurrency(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return "$" + (value / 1_000_000).toFixed(2) + "M";
  if (abs >= 1_000) return "$" + (value / 1_000).toFixed(1) + "K";
  return formatCurrency(value);
}

function shortNumber(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return (value / 1_000_000).toFixed(3).replace(/\.?(0+)$/, "") + "M";
  if (abs >= 1_000) return (value / 1_000).toFixed(3).replace(/\.?(0+)$/, "") + "k";
  return String(value);
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const parsed = new Date(value.slice(0, 10) + "T00:00:00");
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function formatLoanListDate(startDate: string, createdAt?: string | null): string {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(startDate);
  if (!dateMatch) return formatDate(startDate);
  const timeMatch = createdAt?.match(/T(\d{2}):(\d{2}):(\d{2})/);
  return `${dateMatch[3]}/${dateMatch[2]}/${dateMatch[1]}${timeMatch ? ` ${timeMatch[1]}:${timeMatch[2]}:${timeMatch[3]}` : ""}`;
}

function relativeActivityTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "just now";
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 45) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={className ?? "rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"}>{children}</section>;
}

function StatusBadge({ status }: { status: string }) {
  const classes: Record<string, string> = {
    Draft: "bg-slate-100 text-slate-600 dark:bg-slate-700/60 dark:text-slate-300",
    Pending: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    Waiting: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    Approved: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    Progress: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
    Active: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    "Due Soon": "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    Overdue: "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
    Defaulted: "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
    Closed: "bg-slate-100 text-slate-600 dark:bg-slate-700/60 dark:text-slate-300",
    Rejected: "bg-slate-100 text-slate-600 dark:bg-slate-700/60 dark:text-slate-300",
  };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${classes[status] || classes.Closed}`}>{status}</span>;
}

function DashboardMetricCard({ label, value, onClick, className = "", wide = false }: { label: string; value: string; onClick?: () => void; className?: string; wide?: boolean }) {
  const cardClass = `group flex w-full overflow-hidden rounded-xl border border-emerald-300 bg-white text-left shadow-md transition dark:border-emerald-700/50 dark:bg-slate-900 ${onClick ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" : ""} ${className}`;
  const content = (
    <>
      <div className={`flex shrink-0 items-center justify-center bg-emerald-700 text-white dark:bg-emerald-800 ${wide ? "w-[22%] min-w-32 2xl:min-w-40" : "w-[42.5%]"}`}>
        <BarChart3 aria-hidden="true" className="h-[4.75rem] w-[4.75rem] stroke-[1.55] 2xl:h-24 2xl:w-24" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center px-5 py-4 2xl:px-6">
        <p className="truncate text-[clamp(2rem,2.45vw,3rem)] font-medium leading-none tracking-normal text-slate-800 dark:text-white">{value}</p>
        <p className="mt-4 truncate text-[clamp(1rem,1.05vw,1.25rem)] font-bold leading-tight text-slate-800 dark:text-slate-200" title={label}>{label}</p>
      </div>
    </>
  );

  return onClick ? (
    <button type="button" onClick={onClick} className={cardClass}>
      {content}
    </button>
  ) : (
    <div className={cardClass}>{content}</div>
  );
}

function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={className ? className : "block"}>
      <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      {children}
    </label>
  );
}

const inputClass = "w-full rounded-none border-0 border-b border-slate-300 bg-transparent px-2 py-2.5 text-sm text-slate-900 shadow-none outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:ring-0 dark:border-slate-700 dark:bg-transparent dark:text-white dark:focus:border-slate-700";

const PAYMENT_TERM_OPTIONS = [
  "Immediate Payment",
  "15 Days",
  "21 Days",
  "31 Days",
  "45 Days",
  "2 Months",
  "End of Following Month",
  "30% Now, Balance 60 Days",
  "18 Months",
  "12 Months",
  "14 Months",
  "24 Months",
  "3 Months",
  "36 Months",
  "4 Months",
  "42 Months",
  "44 Months",
  "30 Days",
];

const INDUSTRY_OPTIONS = [
  "Administrative",
  "Agriculture",
  "Construction",
  "Education",
  "Energy supply",
  "Entertainment",
  "Extraterritorial",
];

function SalesPurchaseDropdown({ value, options, placeholder, onChange, showSearchMore = false, showCreateAndEdit = false, onCreateAndEdit }: { value: string; options: string[]; placeholder: string; onChange: (value: string) => void; showSearchMore?: boolean; showCreateAndEdit?: boolean; onCreateAndEdit?: () => void }) {
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const optionsId = useId();
  const query = value.trim().toLowerCase();
  const uniqueOptions = Array.from(new Set(options.map((option) => option.trim()).filter(Boolean)));
  const matches = uniqueOptions.filter((option) => !query || option.toLowerCase().includes(query));
  const visibleOptions = showAll ? matches : matches.slice(0, 7);

  return (
    <div className="relative">
      <input
        className={`${inputClass} pr-10`}
        value={value}
        onChange={(event) => { onChange(event.target.value); setOpen(true); setShowAll(false); }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={optionsId}
      />
      <button type="button" tabIndex={-1} onMouseDown={(event) => event.preventDefault()} onClick={() => setOpen((current) => !current)} className="absolute right-0 top-0 flex h-full w-10 items-center justify-center text-slate-500" aria-label={`Open ${placeholder} dropdown`}><ChevronDown className="h-4 w-4" /></button>
      {open ? (
        <div id={optionsId} role="listbox" className="absolute left-0 top-[calc(100%+0.2rem)] z-[90] w-full min-w-64 overflow-hidden border border-slate-300 bg-white py-1 shadow-xl dark:border-slate-700 dark:bg-slate-950">
          <div className="max-h-64 overflow-y-auto">
            {visibleOptions.map((option) => <button key={option} type="button" role="option" aria-selected={value === option} onMouseDown={(event) => event.preventDefault()} onClick={() => { onChange(option); setOpen(false); }} className="block w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">{option}</button>)}
            {!visibleOptions.length ? <p className="px-4 py-3 text-sm text-slate-500">No matching options.</p> : null}
          </div>
          {showSearchMore ? <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => setShowAll(true)} className="block w-full border-t border-slate-200 px-4 py-3 text-left text-sm font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-slate-800 dark:text-emerald-300 dark:hover:bg-emerald-500/10">Search More...</button> : null}
          {showCreateAndEdit ? <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { setOpen(false); onCreateAndEdit?.(); }} className="block w-full border-t border-slate-200 px-4 py-3 text-left text-sm font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-slate-800 dark:text-emerald-300 dark:hover:bg-emerald-500/10">Create and Edit...</button> : null}
        </div>
      ) : null}
    </div>
  );
}

function SalesPurchaseTab({ profile, onChange, salespersonOptions = [] }: { profile: CustomerProfile; onChange: (key: string, value: string) => void; salespersonOptions?: string[] }) {
  const [editorField, setEditorField] = useState<"salesperson" | "area" | null>(null);
  const [editorValue, setEditorValue] = useState("");
  const [customSalespeople, setCustomSalespeople] = useState<string[]>([]);
  const [customAreas, setCustomAreas] = useState<string[]>([]);
  const sectionTitleClass = "mb-5 border-l-4 border-emerald-600 pl-3 text-xl font-semibold text-slate-700 dark:text-slate-200";
  const openEditor = (field: "salesperson" | "area") => {
    setEditorField(field);
    setEditorValue(profile[field] || "");
  };
  const saveEditor = () => {
    const nextValue = editorValue.trim();
    if (!editorField || !nextValue) return;
    onChange(editorField, nextValue);
    if (editorField === "salesperson") setCustomSalespeople((current) => Array.from(new Set([...current, nextValue])));
    if (editorField === "area") setCustomAreas((current) => Array.from(new Set([...current, nextValue])));
    setEditorField(null);
  };
  return (
    <>
      <div className="mt-7 grid gap-x-16 gap-y-10 lg:grid-cols-2">
        <section>
          <h4 className={sectionTitleClass}>Sales</h4>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Salesperson"><SalesPurchaseDropdown value={profile.salesperson || ""} options={[profile.salesperson || "", ...salespersonOptions, ...customSalespeople]} onChange={(value) => onChange("salesperson", value)} placeholder="Salesperson" showSearchMore showCreateAndEdit onCreateAndEdit={() => openEditor("salesperson")} /></Field>
            <Field label="Area"><SalesPurchaseDropdown value={profile.area || ""} options={[profile.area || "", ...customAreas]} onChange={(value) => onChange("area", value)} placeholder="Area" showCreateAndEdit onCreateAndEdit={() => openEditor("area")} /></Field>
            <Field label="Payment Terms"><SalesPurchaseDropdown value={profile.paymentTerms || ""} options={PAYMENT_TERM_OPTIONS} onChange={(value) => onChange("paymentTerms", value)} placeholder="Payment Terms" /></Field>
            <Field label="Pricelist"><SalesPurchaseDropdown value={profile.pricelist || ""} options={profile.pricelist ? [profile.pricelist] : []} onChange={(value) => onChange("pricelist", value)} placeholder="Pricelist" /></Field>
            <Field label="Annual Income"><input type="number" min="0" step="0.01" className={inputClass} value={profile.annualIncome || ""} onChange={(event) => onChange("annualIncome", event.target.value)} placeholder="0.00" /></Field>
          </div>
        </section>
        <section>
          <h4 className={sectionTitleClass}>Purchase</h4>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Payment Terms"><SalesPurchaseDropdown value={profile.supplierPaymentTerms || ""} options={PAYMENT_TERM_OPTIONS} onChange={(value) => onChange("supplierPaymentTerms", value)} placeholder="Payment Terms" /></Field>
            <Field label="Supplier Currency"><SalesPurchaseDropdown value={profile.supplierCurrency || ""} options={["KHR", "USD"]} onChange={(value) => onChange("supplierCurrency", value)} placeholder="Supplier Currency" /></Field>
          </div>
        </section>
        <section>
          <h4 className={sectionTitleClass}>Fiscal Information</h4>
          <Field label="Fiscal Position"><SalesPurchaseDropdown value={profile.fiscalPosition || ""} options={profile.fiscalPosition ? [profile.fiscalPosition] : []} onChange={(value) => onChange("fiscalPosition", value)} placeholder="Fiscal Position" /></Field>
        </section>
        <section>
          <h4 className={sectionTitleClass}>Misc</h4>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Reference"><input className={inputClass} value={profile.reference || ""} onChange={(event) => onChange("reference", event.target.value)} placeholder="Reference" /></Field>
            <Field label="Industry"><SalesPurchaseDropdown value={profile.industry || ""} options={[profile.industry || "", ...INDUSTRY_OPTIONS]} onChange={(value) => onChange("industry", value)} placeholder="Industry" showSearchMore /></Field>
          </div>
        </section>
      </div>
      {editorField ? <div role="dialog" aria-modal="true" aria-labelledby="sales-purchase-editor-title" className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/55 p-4"><div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950"><div className="flex items-center justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-800"><h3 id="sales-purchase-editor-title" className="text-xl font-bold text-slate-900 dark:text-white">Create: {editorField === "salesperson" ? "Salesperson" : "Area"}</h3><button type="button" onClick={() => setEditorField(null)} aria-label="Close editor" className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-white"><X className="h-5 w-5" /></button></div><div className="px-6 py-8"><Field label={editorField === "salesperson" ? "Salesperson Name" : "Area Name"}><input autoFocus className={inputClass} value={editorValue} onChange={(event) => setEditorValue(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") saveEditor(); }} placeholder={editorField === "salesperson" ? "Salesperson" : "Area"} /></Field></div><div className="flex gap-2 border-t border-slate-200 px-6 py-4 dark:border-slate-800"><button type="button" disabled={!editorValue.trim()} onClick={saveEditor} className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-45">Save</button><button type="button" onClick={() => setEditorField(null)} className="rounded-full bg-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200">Discard</button></div></div></div> : null}
    </>
  );
}

function CountryPicker({ value, onChange, onSearchMore, placeholder = "Country" }: { value: string; onChange: (value: string) => void; onSearchMore: () => void; placeholder?: string }) {
  const [open, setOpen] = useState(false);
  const optionsId = useId();
  const normalizedQuery = value.trim().toLowerCase();
  const quickOptions = COUNTRY_OPTIONS
    .filter((country) => !normalizedQuery || country.name.toLowerCase().includes(normalizedQuery) || country.code.toLowerCase().includes(normalizedQuery))
    .slice(0, 8);

  return (
    <div className="relative">
      <input
        className={`${inputClass} pr-10`}
        value={value}
        onChange={(event) => { onChange(event.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={optionsId}
      />
      <button type="button" tabIndex={-1} onMouseDown={(event) => event.preventDefault()} onClick={() => setOpen((current) => !current)} className="absolute right-0 top-0 flex h-full w-10 items-center justify-center text-slate-500" aria-label="Open country dropdown"><ChevronDown className="h-4 w-4" /></button>
      {open ? (
        <div id={optionsId} role="listbox" className="absolute left-0 top-[calc(100%+0.2rem)] z-40 w-full min-w-64 overflow-hidden border border-slate-300 bg-white py-1 shadow-xl dark:border-slate-700 dark:bg-slate-950">
          <div className="max-h-72 overflow-y-auto">
            {quickOptions.map((country) => (
              <button key={country.code} type="button" role="option" aria-selected={value === country.name} onMouseDown={(event) => event.preventDefault()} onClick={() => { onChange(country.name); setOpen(false); }} className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">
                <span>{country.name}</span><span className="text-xs font-semibold text-slate-400">{country.code}</span>
              </button>
            ))}
            {!quickOptions.length ? <p className="px-4 py-3 text-sm text-slate-500">No matching country.</p> : null}
          </div>
          <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { setOpen(false); onSearchMore(); }} className="block w-full border-t border-slate-200 px-4 py-3 text-left text-sm font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-slate-800 dark:text-emerald-300 dark:hover:bg-emerald-500/10">Search More...</button>
        </div>
      ) : null}
    </div>
  );
}

function CustomerCategoryPicker({ value, options, onChange, onCreate, placeholder = "Category" }: { value: string; options: CustomerCategoryOption[]; onChange: (value: string) => void; onCreate: () => void; placeholder?: string }) {
  const [open, setOpen] = useState(false);
  const optionsId = useId();
  const query = value.trim().toLowerCase();
  const matches = options.filter((option) => option.active && (!query || option.name.toLowerCase().includes(query)));
  return (
    <div className="relative">
      <input className={`${inputClass} pr-10`} value={value} onChange={(event) => { onChange(event.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onBlur={() => window.setTimeout(() => setOpen(false), 150)} placeholder={placeholder} autoComplete="off" role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={optionsId} />
      <button type="button" tabIndex={-1} onMouseDown={(event) => event.preventDefault()} onClick={() => setOpen((current) => !current)} className="absolute right-0 top-0 flex h-full w-10 items-center justify-center text-slate-500" aria-label="Open category dropdown"><ChevronDown className="h-4 w-4" /></button>
      {open ? <div id={optionsId} role="listbox" className="absolute left-0 top-[calc(100%+0.2rem)] z-40 w-full min-w-64 overflow-hidden border border-slate-300 bg-white py-1 shadow-xl dark:border-slate-700 dark:bg-slate-950"><div className="max-h-64 overflow-y-auto">{matches.map((option) => <button key={option.name} type="button" role="option" aria-selected={value === option.name} onMouseDown={(event) => event.preventDefault()} onClick={() => { onChange(option.name); setOpen(false); }} className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"><span>{option.name}</span>{option.parent ? <span className="text-xs text-slate-400">{option.parent}</span> : null}</button>)}{!matches.length ? <p className="px-4 py-3 text-sm text-slate-500">No matching categories.</p> : null}</div><button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { setOpen(false); onCreate(); }} className="block w-full border-t border-slate-200 px-4 py-3 text-left text-sm font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-slate-800 dark:text-emerald-300 dark:hover:bg-emerald-500/10">Create and Edit...</button></div> : null}
    </div>
  );
}

function CustomerTagsPicker({ value, options, onChange, onAdd }: { value: string; options: string[]; onChange: (value: string) => void; onAdd: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const optionsId = useId();
  const query = value.trim().toLowerCase();
  const matches = options.filter((tag) => !query || tag.toLowerCase().includes(query));
  const exactMatch = options.some((tag) => tag.toLowerCase() === query);
  const addTypedTag = () => {
    const tag = value.trim();
    if (!tag) return;
    onAdd(tag);
    onChange(tag);
    setOpen(false);
  };
  return (
    <div className="relative">
      <input className={`${inputClass} pr-10`} value={value} onChange={(event) => { onChange(event.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onBlur={() => window.setTimeout(() => setOpen(false), 150)} onKeyDown={(event) => { if (event.key === "Enter" && value.trim() && !exactMatch) { event.preventDefault(); addTypedTag(); } }} placeholder="Tags..." autoComplete="off" role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={optionsId} />
      <button type="button" tabIndex={-1} onMouseDown={(event) => event.preventDefault()} onClick={() => setOpen((current) => !current)} className="absolute right-0 top-0 flex h-full w-10 items-center justify-center text-slate-500" aria-label="Open tags dropdown"><ChevronDown className="h-4 w-4" /></button>
      {open ? <div id={optionsId} role="listbox" className="absolute left-0 top-[calc(100%+0.2rem)] z-40 w-full min-w-64 overflow-hidden border border-slate-300 bg-white py-1 shadow-xl dark:border-slate-700 dark:bg-slate-950"><div className="max-h-64 overflow-y-auto">{matches.map((tag) => <button key={tag} type="button" role="option" aria-selected={value === tag} onMouseDown={(event) => event.preventDefault()} onClick={() => { onChange(tag); setOpen(false); }} className="block w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">{tag}</button>)}{!matches.length && !value.trim() ? <p className="px-4 py-3 text-sm text-slate-500">No tags available.</p> : null}</div>{value.trim() && !exactMatch ? <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={addTypedTag} className="block w-full border-t border-slate-200 px-4 py-3 text-left text-sm font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-slate-800 dark:text-emerald-300 dark:hover:bg-emerald-500/10">Add “{value.trim()}”</button> : null}</div> : null}
    </div>
  );
}

function CustomerTitlePicker({ value, options, onChange, onCreate }: { value: string; options: Array<{ title: string; abbreviation: string }>; onChange: (title: string, abbreviation: string) => void; onCreate: () => void }) {
  const [open, setOpen] = useState(false);
  const optionsId = useId();
  const query = value.trim().toLowerCase();
  const matches = options.filter((option) => !query || option.title.toLowerCase().includes(query) || option.abbreviation.toLowerCase().includes(query));
  return (
    <div className="relative">
      <input className={`${inputClass} pr-10`} value={value} onChange={(event) => { onChange(event.target.value, ""); setOpen(true); }} onFocus={() => setOpen(true)} onBlur={() => window.setTimeout(() => setOpen(false), 150)} placeholder="e.g. Mister" autoComplete="off" role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={optionsId} />
      <button type="button" tabIndex={-1} onMouseDown={(event) => event.preventDefault()} onClick={() => setOpen((current) => !current)} className="absolute right-0 top-0 flex h-full w-10 items-center justify-center text-slate-500" aria-label="Open title dropdown"><ChevronDown className="h-4 w-4" /></button>
      {open ? <div id={optionsId} role="listbox" className="absolute left-0 top-[calc(100%+0.2rem)] z-40 w-full min-w-64 overflow-hidden border border-slate-300 bg-white py-1 shadow-xl dark:border-slate-700 dark:bg-slate-950"><div className="max-h-64 overflow-y-auto">{matches.map((option) => <button key={option.title} type="button" role="option" aria-selected={value === option.title} onMouseDown={(event) => event.preventDefault()} onClick={() => { onChange(option.title, option.abbreviation); setOpen(false); }} className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"><span>{option.title}</span><span className="text-xs text-slate-400">{option.abbreviation}</span></button>)}{!matches.length ? <p className="px-4 py-3 text-sm text-slate-500">No matching titles.</p> : null}</div><button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { setOpen(false); onCreate(); }} className="block w-full border-t border-slate-200 px-4 py-3 text-left text-sm font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-slate-800 dark:text-emerald-300 dark:hover:bg-emerald-500/10">Create and Edit...</button></div> : null}
    </div>
  );
}

function CountrySearchModal({ open, onClose, onSelect, title = "Search: Country" }: { open: boolean; onClose: () => void; onSelect: (country: CountryOption) => void; title?: string }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [bookmarkOpen, setBookmarkOpen] = useState(false);
  const [bookmarkSaved, setBookmarkSaved] = useState(false);
  const [dashboardSaved, setDashboardSaved] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterBuilderOpen, setFilterBuilderOpen] = useState(false);
  const [filterConditions, setFilterConditions] = useState([{ id: 1, field: "callingCode", operator: "equals", value: "0" }]);
  const [appliedFilterConditions, setAppliedFilterConditions] = useState<typeof filterConditions>([]);
  const [groupOpen, setGroupOpen] = useState(false);
  const [groupFieldMenuOpen, setGroupFieldMenuOpen] = useState(false);
  const [groupField, setGroupField] = useState("callingCode");
  const [appliedGroupField, setAppliedGroupField] = useState("");
  const isNationalitySearch = title === "Search: Nationality";
  const searchOptions = isNationalitySearch ? NATIONALITY_OPTIONS : COUNTRY_OPTIONS;
  const pageSize = 80;
  const filteredCountries = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const matches = searchOptions.filter((country) => {
      if (normalized && !country.name.toLowerCase().includes(normalized) && !country.nameKm.toLowerCase().includes(normalized) && !country.code.toLowerCase().includes(normalized)) return false;
      return appliedFilterConditions.every((condition) => {
        const expected = condition.value.trim().toLowerCase();
        if (!expected || condition.field === "callingCode" || condition.field === "createdBy" || condition.field === "createdOn" || condition.field === "currency") return true;
        const actual = condition.field === "code" ? country.code.toLowerCase() : country.name.toLowerCase();
        if (condition.operator === "contains") return actual.includes(expected);
        if (condition.operator === "notEquals") return actual !== expected;
        return actual === expected;
      });
    });
    if (appliedGroupField === "code") return [...matches].sort((left, right) => left.code.localeCompare(right.code));
    if (appliedGroupField === "name") return [...matches].sort((left, right) => left.name.localeCompare(right.name));
    return matches;
  }, [appliedFilterConditions, appliedGroupField, query, searchOptions]);
  const pageCount = Math.max(1, Math.ceil(filteredCountries.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const visibleCountries = filteredCountries.slice(safePage * pageSize, safePage * pageSize + pageSize);
  const rangeStart = filteredCountries.length ? safePage * pageSize + 1 : 0;
  const rangeEnd = Math.min((safePage + 1) * pageSize, filteredCountries.length);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setPage(0);
    setFilterOpen(false);
    setFilterBuilderOpen(false);
    setGroupOpen(false);
    setGroupFieldMenuOpen(false);
    setBookmarkOpen(false);
    setBookmarkSaved(false);
    setDashboardSaved(false);
  }, [open]);

  const countryFieldOptions = [
    { value: "callingCode", label: "Country Calling Code" },
    { value: "code", label: "Country Code" },
    { value: "name", label: "Country Name" },
    { value: "createdBy", label: "Created by" },
    { value: "createdOn", label: "Created on" },
    { value: "currency", label: "Currency" },
  ];
  const addFilterCondition = () => setFilterConditions((current) => [...current, { id: Math.max(0, ...current.map((condition) => condition.id)) + 1, field: "callingCode", operator: "equals", value: "0" }]);
  const updateFilterCondition = (id: number, key: "field" | "operator" | "value", value: string) => setFilterConditions((current) => current.map((condition) => condition.id === id ? { ...condition, [key]: value } : condition));
  const removeFilterCondition = (id: number) => setFilterConditions((current) => current.length === 1 ? current : current.filter((condition) => condition.id !== id));
  const currentCountrySearch = () => ({ query, filters: appliedFilterConditions, groupBy: appliedGroupField, savedAt: new Date().toISOString() });
  const saveCurrentCountrySearch = () => {
    try { window.localStorage.setItem("loan-country-saved-search", JSON.stringify(currentCountrySearch())); } catch { /* Local storage can be disabled by the browser. */ }
    setBookmarkSaved(true);
    setBookmarkOpen(false);
  };
  const addCountrySearchToDashboard = () => {
    try { window.localStorage.setItem("loan-country-dashboard-search", JSON.stringify(currentCountrySearch())); } catch { /* Local storage can be disabled by the browser. */ }
    setDashboardSaved(true);
    setBookmarkOpen(false);
  };

  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="country-search-title" className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-1 sm:p-3">
      <div className="flex h-[calc(100vh-1rem)] w-full max-w-[122rem] flex-col overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950 sm:h-[calc(100vh-1.5rem)]">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-800">
          <h3 id="country-search-title" className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h3>
          <button type="button" onClick={onClose} aria-label="Close country search" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-6 w-6" /></button>
        </div>
        <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 flex-1 items-center gap-4">
              <div className="relative shrink-0">
                <button type="button" aria-haspopup="menu" aria-expanded={bookmarkOpen} onClick={() => { setBookmarkOpen((current) => !current); setFilterOpen(false); setFilterBuilderOpen(false); setGroupOpen(false); setGroupFieldMenuOpen(false); }} className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm"><CalendarDays className="h-5 w-5" />Bookmarks<ChevronDown className={`h-4 w-4 transition ${bookmarkOpen ? "rotate-180" : ""}`} /></button>
                {bookmarkOpen ? <div role="menu" className="absolute left-0 top-[calc(100%+0.35rem)] z-40 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white py-2 shadow-2xl dark:border-slate-700 dark:bg-slate-950"><button type="button" role="menuitem" onClick={saveCurrentCountrySearch} className="flex w-full items-center justify-between px-5 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"><span>Save Current Search</span>{bookmarkSaved ? <Check className="h-4 w-4 text-emerald-600" /> : null}</button><button type="button" role="menuitem" onClick={addCountrySearchToDashboard} className="flex w-full items-center justify-between border-t border-slate-100 px-5 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"><span>Add to My Dashboard</span>{dashboardSaved ? <Check className="h-4 w-4 text-emerald-600" /> : null}</button></div> : null}
              </div>
              <div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-1 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" /><input autoFocus value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); }} className="w-full border-0 border-b border-slate-300 bg-transparent py-3 pl-8 pr-3 text-base text-slate-800 outline-none placeholder:text-slate-400 focus:border-emerald-600 focus:ring-0 dark:border-slate-700 dark:text-slate-100" placeholder="Type to search" /></div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3">
              <span className="px-2 text-sm font-medium text-slate-700 dark:text-slate-200">{rangeStart}-{rangeEnd} <span className="mx-2 text-slate-400">|</span> {filteredCountries.length}</span>
              <button type="button" disabled={safePage === 0} onClick={() => setPage((current) => Math.max(0, current - 1))} className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-200 text-2xl text-slate-700 disabled:opacity-40 dark:bg-slate-800 dark:text-slate-200" aria-label="Previous countries">‹</button>
              <button type="button" disabled={safePage >= pageCount - 1} onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))} className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-200 text-2xl text-slate-700 disabled:opacity-40 dark:bg-slate-800 dark:text-slate-200" aria-label="Next countries">›</button>
              <div className="relative">
                <button type="button" onClick={() => { setFilterOpen((current) => !current); setGroupOpen(false); setGroupFieldMenuOpen(false); setBookmarkOpen(false); }} className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold ${filterOpen ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}><Filter className="h-4 w-4" />Filters<ChevronDown className="h-4 w-4" /></button>
                {filterOpen ? (
                  <div className="absolute right-0 top-[calc(100%+0.35rem)] z-30 w-[min(28rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950">
                    {!filterBuilderOpen ? <button type="button" onClick={() => setFilterBuilderOpen(true)} className="block w-full px-6 py-5 text-left text-lg font-medium text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900">Add Custom Filter</button> : (
                      <>
                        <div className="border-b border-slate-200 px-6 py-4 text-lg font-medium text-slate-600 dark:border-slate-800 dark:text-slate-300">Add Custom Filter</div>
                        <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
                          {filterConditions.map((condition, index) => (
                            <Fragment key={condition.id}>
                              {index ? <div className="py-3 text-center text-base font-medium text-slate-500">or</div> : null}
                              <div className="relative space-y-3 pr-8">
                                <select value={condition.field} onChange={(event) => updateFilterCondition(condition.id, "field", event.target.value)} className="w-full appearance-none border-0 border-b border-slate-300 bg-transparent px-2 py-2.5 text-base text-slate-700 outline-none focus:border-emerald-600 focus:ring-0 dark:border-slate-700 dark:text-slate-200">{countryFieldOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
                                <ChevronDown className="pointer-events-none absolute right-9 top-3 h-4 w-4 text-slate-700 dark:text-slate-200" />
                                <select value={condition.operator} onChange={(event) => updateFilterCondition(condition.id, "operator", event.target.value)} className="w-full appearance-none border-0 border-b border-slate-300 bg-transparent px-2 py-2.5 text-base text-slate-700 outline-none focus:border-emerald-600 focus:ring-0 dark:border-slate-700 dark:text-slate-200"><option value="equals">is equal to</option><option value="notEquals">is not equal to</option><option value="contains">contains</option></select>
                                <ChevronDown className="pointer-events-none absolute right-9 top-[4.35rem] h-4 w-4 text-slate-700 dark:text-slate-200" />
                                <input type={condition.field === "callingCode" ? "number" : "text"} value={condition.value} onChange={(event) => updateFilterCondition(condition.id, "value", event.target.value)} className="w-full border-0 border-b border-slate-300 bg-transparent px-2 py-2.5 text-base text-slate-700 outline-none focus:border-emerald-600 focus:ring-0 dark:border-slate-700 dark:text-slate-200" />
                                <button type="button" onClick={() => removeFilterCondition(condition.id)} className="absolute -right-1 top-0 p-2 text-slate-500 hover:text-rose-600" aria-label="Remove condition"><Trash2 className="h-5 w-5" /></button>
                              </div>
                            </Fragment>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-2 border-t border-slate-200 px-6 py-4 dark:border-slate-800"><button type="button" onClick={() => { setAppliedFilterConditions(filterConditions.map((condition) => ({ ...condition }))); setPage(0); setFilterOpen(false); }} className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">Apply</button><button type="button" onClick={addFilterCondition} className="inline-flex items-center gap-2 rounded-full bg-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200"><Plus className="h-4 w-4" />Add a Condition</button></div>
                      </>
                    )}
                  </div>
                ) : null}
              </div>
              <div className="relative">
                <button type="button" onClick={() => { setGroupOpen((current) => !current); setFilterOpen(false); setFilterBuilderOpen(false); setBookmarkOpen(false); }} className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold ${groupOpen ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}><FolderOpen className="h-4 w-4" />Group By<ChevronDown className="h-4 w-4" /></button>
                {groupOpen ? <div className="absolute right-0 top-[calc(100%+0.35rem)] z-30 w-[min(25rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950">
                  <div className="border-b border-slate-200 px-6 py-4 text-lg font-medium text-slate-600 dark:border-slate-800 dark:text-slate-300">Add Custom Group</div>
                  <div className="relative px-6 py-4">
                    <button type="button" onClick={() => setGroupFieldMenuOpen((current) => !current)} className="flex w-full items-center justify-between border-b border-slate-300 px-2 py-2.5 text-left text-base text-slate-700 dark:border-slate-700 dark:text-slate-200"><span>{countryFieldOptions.find((option) => option.value === groupField)?.label}</span><ChevronDown className="h-4 w-4" /></button>
                    {groupFieldMenuOpen ? <div className="absolute left-6 right-6 top-[calc(100%-0.6rem)] z-40 max-h-72 overflow-y-auto border border-slate-300 bg-white py-1 shadow-xl dark:border-slate-700 dark:bg-slate-950">{countryFieldOptions.map((option) => <button key={option.value} type="button" onClick={() => { setGroupField(option.value); setGroupFieldMenuOpen(false); }} className="block w-full px-5 py-3 text-left text-base text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">{option.label}</button>)}</div> : null}
                  </div>
                  <div className="px-6 pb-5"><button type="button" onClick={() => { setAppliedGroupField(groupField); setPage(0); setGroupOpen(false); setGroupFieldMenuOpen(false); }} className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">Apply</button></div>
                </div> : null}
              </div>
            </div>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto px-6 py-5">
          <table className="w-full min-w-[42rem] border-separate border-spacing-0 text-left">
            <thead className="sticky top-0 z-10 bg-slate-100 text-sm font-bold text-slate-700 dark:bg-slate-900 dark:text-slate-200"><tr><th className="rounded-l-xl px-7 py-4">{isNationalitySearch ? "Nationality (EN)" : "Country Name"}</th><th className="rounded-r-xl px-7 py-4">{isNationalitySearch ? "Nationality (KM)" : "Country Code"}</th></tr></thead>
            <tbody>{visibleCountries.map((country) => <tr key={country.code} onClick={() => onSelect(country)} className="cursor-pointer border-b border-slate-200 text-sm text-slate-700 hover:bg-emerald-50 dark:text-slate-200 dark:hover:bg-emerald-500/10"><td className="border-b border-slate-200 px-7 py-3.5 dark:border-slate-800">{country.name}</td><td className="border-b border-slate-200 px-7 py-3.5 font-medium dark:border-slate-800">{isNationalitySearch ? country.nameKm : country.code}</td></tr>)}</tbody>
          </table>
          {!visibleCountries.length ? <p className="py-16 text-center text-sm text-slate-500">No countries match your search.</p> : null}
        </div>
        <div className="border-t border-slate-200 px-6 py-4 dark:border-slate-800"><button type="button" onClick={onClose} className="rounded-full bg-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200">Cancel</button></div>
      </div>
    </div>
  );
}

function LoanFormPanel({ loan, onClose, onSaved, onOpenJournalItems }: { loan: LoanEntity | null; onClose: () => void; onSaved: () => Promise<void>; onOpenJournalItems: (account: Pick<LoanChartAccount, "code" | "name">) => void }) {
  const { success: toastSuccess, error: toastError } = useToast();
  const currentUser = useAuthUser();
  const activityUserName = currentUser.full_name || currentUser.username || "User";
  const activityUserRole = currentUser.role ? currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1) : "User";
  const activityInitials = activityUserName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "U";
  const [activityFeed, setActivityFeed] = useState<LoanActivityFeed>({ activities: [], followerCount: 0, following: false });
  const [pendingActivities, setPendingActivities] = useState<LoanActivity[]>([]);
  const [activityComposer, setActivityComposer] = useState<"message" | "note" | "scheduled" | null>(null);
  const [activityBody, setActivityBody] = useState("");
  const [activityScheduledFor, setActivityScheduledFor] = useState("");
  const [activityBusy, setActivityBusy] = useState(false);
  const [activityLoading, setActivityLoading] = useState(false);
  const [draftFollowing, setDraftFollowing] = useState(false);
  const activityAttachmentInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<EnhancedLoanFormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"Schedules" | "Loan Informations" | "Collaterals" | "Approvals" | "Contacts" | "Accounting" | "Other Info">("Schedules");
  const [openCalendarField, setOpenCalendarField] = useState<"startDate" | "contractDate" | "contractEndDate" | "firstPaymentDate" | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [calendarDraftDate, setCalendarDraftDate] = useState(() => new Date());
  const [calendarMode, setCalendarMode] = useState<"date" | "time">("date");
  const [calendarTime, setCalendarTime] = useState(() => {
    const now = new Date();
    return { hours: now.getHours(), minutes: now.getMinutes(), seconds: now.getSeconds() };
  });
  const [customerDateCalendarField, setCustomerDateCalendarField] = useState<string | null>(null);
  const [customerDateCalendarMonth, setCustomerDateCalendarMonth] = useState(() => new Date());
  const [customerDateCalendarDraft, setCustomerDateCalendarDraft] = useState(() => new Date());
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [customerSearchAll, setCustomerSearchAll] = useState(false);
  const [customerEditorOpen, setCustomerEditorOpen] = useState(false);
  const [customerEditorSnapshot, setCustomerEditorSnapshot] = useState<EnhancedLoanFormState | null>(null);
  const [customerEditorTab, setCustomerEditorTab] = useState<CustomerEditorTab>("general");
  const [customerSearchModalOpen, setCustomerSearchModalOpen] = useState(false);
  const [customerSearchText, setCustomerSearchText] = useState("");
  const [customerSearchResults, setCustomerSearchResults] = useState<LoanBorrower[]>([]);
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false);
  const [customerImageUploading, setCustomerImageUploading] = useState(false);
  const customerImageInputRef = useRef<HTMLInputElement>(null);
  const [customerContactEditorOpen, setCustomerContactEditorOpen] = useState(false);
  const [customerContactEditorTarget, setCustomerContactEditorTarget] = useState<"customer" | "company">("customer");
  const [customerContactDraft, setCustomerContactDraft] = useState<CustomerContactRow>(emptyCustomerContactRow);
  const [customerContactImageUploading, setCustomerContactImageUploading] = useState(false);
  const customerContactImageInputRef = useRef<HTMLInputElement>(null);
  const [customerTitlePickerOpen, setCustomerTitlePickerOpen] = useState(false);
  const [customerTitleEditorOpen, setCustomerTitleEditorOpen] = useState(false);
  const [customerTitleEditorTarget, setCustomerTitleEditorTarget] = useState<"contact" | "profile">("contact");
  const [customerTitleOptions, setCustomerTitleOptions] = useState([
    { title: "Doctor", abbreviation: "Dr." },
    { title: "Madam", abbreviation: "Mrs." },
    { title: "Miss", abbreviation: "Ms." },
    { title: "Mister", abbreviation: "Mr." },
    { title: "Professor", abbreviation: "Prof." },
  ]);
  const [customerTitleDraft, setCustomerTitleDraft] = useState({ title: "", abbreviation: "" });
  const [customerCompanyPickerOpen, setCustomerCompanyPickerOpen] = useState(false);
  const [customerCompanyShowAll, setCustomerCompanyShowAll] = useState(false);
  const [customerCompanySearchModalOpen, setCustomerCompanySearchModalOpen] = useState(false);
  const [customerCompanySearchText, setCustomerCompanySearchText] = useState("");
  const [customerCompanySearchPage, setCustomerCompanySearchPage] = useState(0);
  const [customerCompanySearchBookmarksOpen, setCustomerCompanySearchBookmarksOpen] = useState(false);
  const [customerCompanySearchFiltersOpen, setCustomerCompanySearchFiltersOpen] = useState(false);
  const [customerCompanySearchFilters, setCustomerCompanySearchFilters] = useState<CustomerCompanyPresetFilter[]>([]);
  const [customerCompanySearchGroupOpen, setCustomerCompanySearchGroupOpen] = useState(false);
  const [customerCompanySearchGroup, setCustomerCompanySearchGroup] = useState<"" | "salesperson" | "company" | "country">("");
  const [customerCompanySort, setCustomerCompanySort] = useState<{ key: "name" | "phone" | "email" | "address1" | "address2"; direction: "asc" | "desc" } | null>(null);
  const [customerCompanyColumnsOpen, setCustomerCompanyColumnsOpen] = useState(false);
  const [customerCompanyVisibleColumns, setCustomerCompanyVisibleColumns] = useState({
    nameKhmer: false,
    phone: true,
    email: true,
    address1: true,
    address2: true,
    country: false,
    taxId: false,
  });
  const [customerCompanyCreatorOpen, setCustomerCompanyCreatorOpen] = useState(false);
  const [customerCompanyDraft, setCustomerCompanyDraft] = useState<LoanContactInput>(() => ({ ...emptyContact(), profile: { entityType: "company", relationship: "customer" } }));
  const [customerCompanySaving, setCustomerCompanySaving] = useState(false);
  const [customerCompanyEditorTab, setCustomerCompanyEditorTab] = useState<RelatedContactEditorTab>("general");
  const [customerCompanyImageUploading, setCustomerCompanyImageUploading] = useState(false);
  const customerCompanyImageInputRef = useRef<HTMLInputElement>(null);
  const customerCompanySearchTableRef = useRef<HTMLDivElement>(null);
  const [countrySearchModalOpen, setCountrySearchModalOpen] = useState(false);
  const [countrySearchModalTitle, setCountrySearchModalTitle] = useState("Search: Country");
  const countrySelectHandlerRef = useRef<((countryName: string) => void) | null>(null);
  const [customerCategoryOptions, setCustomerCategoryOptions] = useState<CustomerCategoryOption[]>([]);
  const [customerTagOptions, setCustomerTagOptions] = useState<string[]>([]);
  const [customerCategoryEditorOpen, setCustomerCategoryEditorOpen] = useState(false);
  const [customerCategoryDraft, setCustomerCategoryDraft] = useState<CustomerCategoryOption>({ name: "", active: true, parent: "" });
  const customerCategorySelectHandlerRef = useRef<((categoryName: string) => void) | null>(null);
  const [customerParentCategoryEditorOpen, setCustomerParentCategoryEditorOpen] = useState(false);
  const [customerParentCategoryDraft, setCustomerParentCategoryDraft] = useState<CustomerCategoryOption>({ name: "", active: true, parent: "" });
  const [loanTypePickerOpen, setLoanTypePickerOpen] = useState(false);
  const [customerSuggestions, setCustomerSuggestions] = useState<LoanBorrower[]>([]);
  const [loanTypeSuggestions, setLoanTypeSuggestions] = useState<string[]>(DEFAULT_LOAN_TYPES);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [loanTypeLoading, setLoanTypeLoading] = useState(false);
  const [loanTypeSearchAll, setLoanTypeSearchAll] = useState(false);
  const [loanTypeSearchModalOpen, setLoanTypeSearchModalOpen] = useState(false);
  const [loanTypeSearchText, setLoanTypeSearchText] = useState("");
  const [sourceLoanPickerOpen, setSourceLoanPickerOpen] = useState(false);
  const [sourceLoanOptions, setSourceLoanOptions] = useState<LoanEntity[]>([]);
  const [sourceLoanLoading, setSourceLoanLoading] = useState(false);
  const [sourceLoanSearchModalOpen, setSourceLoanSearchModalOpen] = useState(false);
  const [sourceLoanSearchText, setSourceLoanSearchText] = useState("");
  const [sourceLoanSearchResults, setSourceLoanSearchResults] = useState<LoanEntity[]>([]);
  const [sourceLoanSearchLoading, setSourceLoanSearchLoading] = useState(false);
  const [loanContactStaffOptions, setLoanContactStaffOptions] = useState<LoanTypeUserOption[]>([]);
  const [loanContactOptions, setLoanContactOptions] = useState<LoanBorrower[]>([]);
  const [loanContactsLoading, setLoanContactsLoading] = useState(false);
  const [loanTeamPickerKey, setLoanTeamPickerKey] = useState<"bm" | "collectionOfficer" | "loanSpecialist" | null>(null);
  const [loanTeamSearch, setLoanTeamSearch] = useState({ bm: "", collectionOfficer: "", loanSpecialist: "" });
  const [loanTeamEditorKey, setLoanTeamEditorKey] = useState<"bm" | "collectionOfficer" | "loanSpecialist" | null>(null);
  const [loanTeamMemberDraft, setLoanTeamMemberDraft] = useState<LoanTeamMemberDraft | null>(null);
  const [loanTeamMemberSaving, setLoanTeamMemberSaving] = useState(false);
  const [loanTeamImageUploading, setLoanTeamImageUploading] = useState(false);
  const loanTeamImageInputRef = useRef<HTMLInputElement>(null);
  const [relatedContactPickerKey, setRelatedContactPickerKey] = useState<"coBorrowers" | "brokers" | "guarantors" | null>(null);
  const [relatedContactSearch, setRelatedContactSearch] = useState("");
  const [relatedContactSelection, setRelatedContactSelection] = useState<string[]>([]);
  const [relatedContactRowPicker, setRelatedContactRowPicker] = useState<{ key: "coBorrowers" | "brokers" | "guarantors"; index: number } | null>(null);
  const [relatedContactMenuPosition, setRelatedContactMenuPosition] = useState<{ left: number; top: number; width: number; openUp: boolean } | null>(null);
  const [relatedContactCreatorOpen, setRelatedContactCreatorOpen] = useState(false);
  const [relatedContactCreatorTab, setRelatedContactCreatorTab] = useState<RelatedContactEditorTab>("general");
  const [relatedContactDraft, setRelatedContactDraft] = useState<LoanContactInput>(() => emptyContact());
  const [relatedContactSaving, setRelatedContactSaving] = useState(false);
  const [relatedContactImageUploading, setRelatedContactImageUploading] = useState(false);
  const [relatedCompanyPickerOpen, setRelatedCompanyPickerOpen] = useState(false);
  const [relatedCompanySearchOpen, setRelatedCompanySearchOpen] = useState(false);
  const [relatedCompanyCreatorOpen, setRelatedCompanyCreatorOpen] = useState(false);
  const [relatedCompanyDraft, setRelatedCompanyDraft] = useState<LoanContactInput>(() => ({ ...emptyContact(), profile: { entityType: "company", relationship: "customer" } }));
  const [relatedCompanySaving, setRelatedCompanySaving] = useState(false);
  const relatedContactImageInputRef = useRef<HTMLInputElement>(null);
  const [loanTypeEditorOpen, setLoanTypeEditorOpen] = useState(false);
  const [loanTypeEditorMode, setLoanTypeEditorMode] = useState<"create" | "open">("create");
  const [loanTypeEditorTab, setLoanTypeEditorTab] = useState<"general" | "approvers">("general");
  const [loanTypeEditor, setLoanTypeEditor] = useState<LoanTypeEditorState>(emptyLoanTypeEditor());
  const [loanTypeEditorLoading, setLoanTypeEditorLoading] = useState(false);
  const [loanTypeSaving, setLoanTypeSaving] = useState(false);
  const [loanTypeTranslationOpen, setLoanTypeTranslationOpen] = useState(false);
  const [loanTypeTranslationDraft, setLoanTypeTranslationDraft] = useState({ english: "", khmer: "" });
  const [loanTypeApproverOptions, setLoanTypeApproverOptions] = useState<LoanTypeUserOption[]>([]);
  const [loanTypeApproversLoading, setLoanTypeApproversLoading] = useState(false);
  const [loanTypeApproverPickerOpen, setLoanTypeApproverPickerOpen] = useState(false);
  const [loanTypeApproverSearch, setLoanTypeApproverSearch] = useState("");
  const [loanChartAccounts, setLoanChartAccounts] = useState<LoanChartAccount[]>([]);
  const [loanAccountPickerField, setLoanAccountPickerField] = useState<LoanTypeAccountField | null>(null);
  const [loanAccountSearch, setLoanAccountSearch] = useState("");
  const [loanAccountSearchModalOpen, setLoanAccountSearchModalOpen] = useState(false);
  const [loanAccountEditorOpen, setLoanAccountEditorOpen] = useState(false);
  const [loanAccountEditorMode, setLoanAccountEditorMode] = useState<"create" | "open">("create");
  const [loanAccountEditor, setLoanAccountEditor] = useState<LoanChartAccountEditorState>(emptyLoanChartAccount());
  const [loanAccountSaving, setLoanAccountSaving] = useState(false);
  const loanTypeInputRef = useRef<HTMLInputElement>(null);

  const filteredLoanTypeApproverOptions = useMemo(() => {
    const query = loanTypeApproverSearch.trim().toLowerCase();
    return loanTypeApproverOptions.filter((user) => {
      if (loanTypeEditor.approvers.some((approver) => approver.username === user.username)) return false;
      if (!query) return true;
      return [user.full_name, user.username, user.role].some((value) => value?.toLowerCase().includes(query));
    });
  }, [loanTypeApproverOptions, loanTypeEditor.approvers, loanTypeApproverSearch]);

  const filteredLoanChartAccounts = useMemo(() => {
    const query = loanAccountSearch.trim().toLowerCase();
    return loanChartAccounts.filter((account) => !account.inactive && (!query || account.code.toLowerCase().includes(query) || account.name.toLowerCase().includes(query)));
  }, [loanChartAccounts, loanAccountSearch]);

  const filteredRelatedContactOptions = useMemo(() => {
    const query = relatedContactSearch.trim().toLowerCase();
    return loanContactOptions.filter((contact) => !query || [contact.fullName, contact.phone, contact.email, contact.address, contact.nationalId]
      .some((value) => value?.toLowerCase().includes(query)));
  }, [loanContactOptions, relatedContactSearch]);

  const filteredRelatedCompanyOptions = useMemo(() => {
    const query = (relatedContactDraft.profile.company || "").trim().toLowerCase();
    return loanContactOptions.filter((contact) => !query || [contact.fullName, contact.phone, contact.email]
      .some((value) => value?.toLowerCase().includes(query)));
  }, [loanContactOptions, relatedContactDraft.profile.company]);

  const filteredCustomerCompanyOptions = useMemo(() => {
    const query = (form.customerProfile.company || "").trim().toLowerCase();
    return loanContactOptions.filter((contact) => {
      const isCompany = contact.profile.entityType === "company";
      return isCompany && (!query || [contact.fullName, contact.phone, contact.email]
        .some((value) => value?.toLowerCase().includes(query)));
    });
  }, [form.customerProfile.company, loanContactOptions]);

  const customerCompanySearchResults = useMemo(() => {
    const query = customerCompanySearchText.trim().toLowerCase();
    const companies = loanContactOptions.filter((contact) => {
      const relationship = contact.profile.relationship || "";
      const entityFilters = customerCompanySearchFilters.filter((filter) => filter === "individuals" || filter === "companies");
      const relationshipFilters = customerCompanySearchFilters.filter((filter) => filter === "customers" || filter === "vendors");
      const matchesEntity = !entityFilters.length || entityFilters.some((filter) => filter === "individuals" ? contact.profile.entityType === "individual" : contact.profile.entityType === "company");
      const matchesRelationship = !relationshipFilters.length || relationshipFilters.some((filter) => filter === "customers" ? relationship === "customer" || relationship === "customer_vendor" : relationship === "vendor" || relationship === "customer_vendor");
      const matchesArchived = !customerCompanySearchFilters.includes("archived") || contact.profile.archived === "true" || contact.profile.active === "false";
      const matchesPreset = customerCompanySearchFilters.length ? matchesEntity && matchesRelationship && matchesArchived : contact.profile.entityType === "company";
      if (!matchesPreset) return false;
      if (!query) return true;
      return [contact.fullName, contact.phone, contact.email, contact.address, contact.profile.address2]
        .some((value) => value?.toLowerCase().includes(query));
    });
    const sortKey = customerCompanySort?.key || customerCompanySearchGroup;
    if (!sortKey) return companies;
    const fieldValue = (company: LoanBorrower) => {
      if (sortKey === "phone") return company.phone || company.profile.mobile || "";
      if (sortKey === "email") return company.email || "";
      if (sortKey === "address1") return company.address || "";
      if (sortKey === "address2") return company.profile.address2 || "";
      if (sortKey === "salesperson") return company.profile.salesperson || "";
      if (sortKey === "company") return company.profile.company || company.fullName;
      if (sortKey === "country") return company.profile.country || "";
      return company.fullName;
    };
    const direction = customerCompanySort?.direction === "desc" ? -1 : 1;
    return [...companies].sort((left, right) => direction * fieldValue(left).localeCompare(fieldValue(right), undefined, { sensitivity: "base", numeric: true }));
  }, [customerCompanySearchFilters, customerCompanySearchGroup, customerCompanySearchText, customerCompanySort, loanContactOptions]);
  const customerCompanySearchPageSize = 80;
  const customerCompanySearchPageCount = Math.max(1, Math.ceil(customerCompanySearchResults.length / customerCompanySearchPageSize));
  const customerCompanySearchSafePage = Math.min(customerCompanySearchPage, customerCompanySearchPageCount - 1);
  const customerCompanySearchPageRows = customerCompanySearchResults.slice(customerCompanySearchSafePage * customerCompanySearchPageSize, (customerCompanySearchSafePage + 1) * customerCompanySearchPageSize);
  const customerCompanySearchStart = customerCompanySearchResults.length ? customerCompanySearchSafePage * customerCompanySearchPageSize + 1 : 0;
  const customerCompanySearchEnd = Math.min((customerCompanySearchSafePage + 1) * customerCompanySearchPageSize, customerCompanySearchResults.length);
  const customerCompanySearchFilterChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; filters: CustomerCompanyPresetFilter[] }> = [];
    const hasIndividuals = customerCompanySearchFilters.includes("individuals");
    const hasCompanies = customerCompanySearchFilters.includes("companies");
    const hasCustomers = customerCompanySearchFilters.includes("customers");
    const hasVendors = customerCompanySearchFilters.includes("vendors");
    if (hasIndividuals || hasCompanies) chips.push({ key: "entity", label: hasIndividuals && hasCompanies ? "Individuals or Companies" : hasIndividuals ? "Individuals" : "Companies", filters: hasIndividuals && hasCompanies ? ["individuals", "companies"] : hasIndividuals ? ["individuals"] : ["companies"] });
    if (hasCustomers || hasVendors) chips.push({ key: "relationship", label: hasCustomers && hasVendors ? "Customers or Vendors" : hasCustomers ? "Customers" : "Vendors", filters: hasCustomers && hasVendors ? ["customers", "vendors"] : hasCustomers ? ["customers"] : ["vendors"] });
    if (customerCompanySearchFilters.includes("archived")) chips.push({ key: "archived", label: "Archived", filters: ["archived"] });
    return chips;
  }, [customerCompanySearchFilters]);

  const positionRelatedContactMenu = useCallback((key: "coBorrowers" | "brokers" | "guarantors", index: number, input?: HTMLInputElement | null) => {
    const anchor = input || document.getElementById(`related-contact-input-${key}-${index}`) as HTMLInputElement | null;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const width = Math.min(Math.max(rect.width, 360), window.innerWidth - 16);
    const left = Math.min(Math.max(8, rect.left), Math.max(8, window.innerWidth - width - 8));
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < 330 && rect.top > spaceBelow;
    setRelatedContactMenuPosition({ left, top: openUp ? rect.top - 8 : rect.bottom + 8, width, openUp });
  }, []);

  useEffect(() => {
    if (!relatedContactRowPicker) {
      setRelatedContactMenuPosition(null);
      return;
    }
    const { key, index } = relatedContactRowPicker;
    const update = () => positionRelatedContactMenu(key, index);
    update();
    window.addEventListener("resize", update);
    document.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      document.removeEventListener("scroll", update, true);
    };
  }, [positionRelatedContactMenu, relatedContactRowPicker]);

  // Accept common keyboard-friendly date formats and normalize to YYYY-MM-DD.
  // This also rejects impossible dates such as 2026-02-31.
  function parseAndFormatDate(input: string): string | null {
    const v = input.trim();
    if (!v) return null;
    const toIsoDate = (year: number, month: number, day: number) => {
      const date = new Date(Date.UTC(year, month - 1, day));
      return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
        ? `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
        : null;
    };
    const validTime = (hours?: string, minutes?: string, seconds?: string) => {
      if (hours === undefined) return true;
      return Number(hours) <= 23 && Number(minutes) <= 59 && Number(seconds || 0) <= 59;
    };
    const isoMatch = /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(v);
    if (isoMatch && validTime(isoMatch[4], isoMatch[5], isoMatch[6])) return toIsoDate(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]));
    // Compact numeric input is convenient on a phone keypad.
    const compactMatch = /^(\d{4})(\d{2})(\d{2})$/.exec(v);
    if (compactMatch) return toIsoDate(Number(compactMatch[1]), Number(compactMatch[2]), Number(compactMatch[3]));
    // Previous-system style DD/MM/YYYY, optionally followed by a time.
    const localMatch = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(v);
    if (localMatch && validTime(localMatch[4], localMatch[5], localMatch[6])) {
      return toIsoDate(Number(localMatch[3]), Number(localMatch[2]), Number(localMatch[1]));
    }
    return null;
  }

  useEffect(() => {
    if (loan) {
      setForm({
        borrowerId: loan.borrower.id,
        fullName: loan.borrower.fullName || "",
        phone: loan.borrower.phone || "",
        email: loan.borrower.email || "",
        nationalId: loan.borrower.nationalId || "",
        address: loan.borrower.address || "",
        customerProfile: loan.borrower.profile || { entityType: "individual", relationship: "customer" },
        transactionNo: loan.loanNumber || "",
        loanType: loan.loanType || "Car LOAN",
        principal: String(loan.principal || ""),
        loanAmountKHR: loan.loanAmountKHR == null ? "" : String(loan.loanAmountKHR),
        firstAmountCTR: "0",
        formula: loan.formula || formulaForInterestModel(loan.interestModel),
        interestRate: String(loan.interestRate || 0),
        ratePeriod: "Annually",
        rateKHR: "",
        termMonths: String(loan.termMonths || 12),
        termUnit: "Months",
        payback: paybackForRepaymentFrequency(loan.repaymentFrequency),
        startDate: storedDateDisplayValue(loan.startDate || dateInputValue(), true, loan.createdAt),
        contractDate: storedDateDisplayValue(loan.contractDate || loan.startDate || dateInputValue()),
        contractDateLunar: loan.contractDateLunar || "",
        contractEndDate: storedDateDisplayValue(loan.contractEndDate || loan.firstPaymentDate || dateInputValue()),
        firstPaymentDate: storedDateDisplayValue(loan.firstPaymentDate || dateInputValue()),
        purpose: loan.purpose || "",
        notes: loan.notes || "",
        loanInformation: {
          amountToPayKHR: loan.loanInformation.amountToPayKHR || "",
          refinanceAmount: String(loan.loanInformation.refinanceAmount || 0),
          roadTaxFee: String(loan.loanInformation.roadTaxFee || 0),
          vehicleInspectionFee: String(loan.loanInformation.vehicleInspectionFee || 0),
          taxStampFee: String(loan.loanInformation.taxStampFee || 0),
          adminFee: String(loan.loanInformation.adminFee || 0),
          withholdingFee: String(loan.loanInformation.withholdingFee || 0),
          collateralCheckFee: String(loan.loanInformation.collateralCheckFee || 0),
          loanFee: String(loan.loanInformation.loanFee || 0),
          sourceLoan: loan.loanInformation.sourceLoan || "",
          penaltyRule: loan.loanInformation.penaltyRule || "",
          feeCharge: loan.loanInformation.feeCharge || "",
        },
        loanContacts: loan.loanContacts,
      });
    } else {
      setForm(emptyForm());
    }
  }, [loan]);

  useEffect(() => {
    let current = true;
    if (!loan) {
      setActivityFeed({ activities: [], followerCount: 0, following: false });
      return () => { current = false; };
    }
    setActivityLoading(true);
    void api<LoanActivityFeed>(`/api/loan/loans/${loan.id}/activities`)
      .then((feed) => { if (current) setActivityFeed(feed); })
      .catch((caught) => { if (current) toastError(caught instanceof Error ? caught.message : "Could not load loan activity"); })
      .finally(() => { if (current) setActivityLoading(false); });
    return () => { current = false; };
  }, [loan, toastError]);

  const activityDraft = useCallback((input: CreateLoanActivityInput): LoanActivity => ({
    id: `draft-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    loanId: loan?.id || "draft",
    type: input.type,
    body: input.body?.trim() || null,
    scheduledFor: input.scheduledFor || null,
    attachmentName: input.attachmentName || null,
    attachmentUrl: input.attachmentUrl || null,
    createdBy: currentUser.username || "user",
    actorName: activityUserName,
    actorRole: activityUserRole,
    createdAt: new Date().toISOString(),
  }), [activityUserName, activityUserRole, currentUser.username, loan?.id]);

  const addLoanActivity = useCallback(async (input: CreateLoanActivityInput) => {
    if (loan) {
      const created = await api<LoanActivity>(`/api/loan/loans/${loan.id}/activities`, { method: "POST", body: JSON.stringify(input) });
      setActivityFeed((current) => ({ ...current, activities: [created, ...current.activities] }));
      return;
    }
    setPendingActivities((current) => [activityDraft(input), ...current]);
  }, [activityDraft, loan]);

  const saveActivityComposer = async () => {
    const body = activityBody.trim();
    if (!body) {
      toastError("Enter activity details first.");
      return;
    }
    if (activityComposer === "scheduled" && !activityScheduledFor) {
      toastError("Choose when this activity should happen.");
      return;
    }
    if (!activityComposer) return;
    setActivityBusy(true);
    try {
      await addLoanActivity({ type: activityComposer, body, scheduledFor: activityComposer === "scheduled" ? new Date(activityScheduledFor).toISOString() : null });
      setActivityBody("");
      setActivityScheduledFor("");
      setActivityComposer(null);
      toastSuccess(loan ? "Activity saved." : "Activity will be saved with the loan.");
    } catch (caught) {
      toastError(caught instanceof Error ? caught.message : "Could not save activity");
    } finally {
      setActivityBusy(false);
    }
  };

  const uploadActivityAttachment = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setActivityBusy(true);
    try {
      const data = new FormData();
      data.append("file", file);
      const response = await fetch("/api/loan/activity-attachment", { method: "POST", credentials: "include", body: data });
      const payload = await response.json().catch(() => null) as ApiResponse<{ name: string; url: string }> | null;
      if (!response.ok || !payload?.success || !payload.data) throw new Error(payload?.error || "Could not upload attachment");
      await addLoanActivity({ type: "attachment", attachmentName: payload.data.name, attachmentUrl: payload.data.url });
      toastSuccess(loan ? "Attachment added." : "Attachment will be saved with the loan.");
    } catch (caught) {
      toastError(caught instanceof Error ? caught.message : "Could not upload attachment");
    } finally {
      setActivityBusy(false);
    }
  };

  const toggleLoanFollowing = async () => {
    const next = loan ? !activityFeed.following : !draftFollowing;
    if (!loan) {
      setDraftFollowing(next);
      setActivityFeed((current) => ({ ...current, followerCount: next ? 1 : 0, following: next }));
      return;
    }
    setActivityBusy(true);
    try {
      const result = await api<{ followerCount: number; following: boolean }>(`/api/loan/loans/${loan.id}/activities`, { method: "POST", body: JSON.stringify({ action: "follow", following: next }) });
      setActivityFeed((current) => ({ ...current, ...result }));
    } catch (caught) {
      toastError(caught instanceof Error ? caught.message : "Could not update followers");
    } finally {
      setActivityBusy(false);
    }
  };

  useEffect(() => {
    if (!customerPickerOpen) return;
    let current = true;
    const timeout = window.setTimeout(async () => {
      setCustomerLoading(true);
      try {
        const query = customerSearchAll ? "" : form.fullName;
        const options = await api<LoanFormSuggestions>(`/api/loan/options?kind=borrowers&limit=20&q=${encodeURIComponent(query)}`);
        if (current) setCustomerSuggestions(options.borrowers);
      } catch {
        if (current) setCustomerSuggestions([]);
      } finally {
        if (current) setCustomerLoading(false);
      }
    }, 150);
    return () => { current = false; window.clearTimeout(timeout); };
  }, [customerPickerOpen, customerSearchAll, form.fullName]);

  useEffect(() => {
    if (!customerSearchModalOpen) return;
    let current = true;
    const timeout = window.setTimeout(async () => {
      setCustomerSearchLoading(true);
      try {
        const options = await api<LoanFormSuggestions>(`/api/loan/options?kind=borrowers&limit=200&q=${encodeURIComponent(customerSearchText)}`);
        if (current) setCustomerSearchResults(options.borrowers);
      } catch {
        if (current) setCustomerSearchResults([]);
      } finally {
        if (current) setCustomerSearchLoading(false);
      }
    }, 180);
    return () => { current = false; window.clearTimeout(timeout); };
  }, [customerSearchModalOpen, customerSearchText]);

  // Keep the loan form fixed behind the customer windows. Only the customer
  // list or profile content should scroll, matching the previous system.
  useEffect(() => {
    if (!customerSearchModalOpen && !customerEditorOpen && !loanTypeSearchModalOpen && !loanTypeEditorOpen && !sourceLoanSearchModalOpen && !relatedContactPickerKey && !relatedContactCreatorOpen && !loanTeamEditorKey) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [customerSearchModalOpen, customerEditorOpen, loanTypeSearchModalOpen, loanTypeEditorOpen, sourceLoanSearchModalOpen, relatedContactPickerKey, relatedContactCreatorOpen, loanTeamEditorKey]);

  useEffect(() => {
    if (!loanTypeEditorOpen || loanTypeEditorTab !== "approvers") return;
    let current = true;
    setLoanTypeApproversLoading(true);
    void fetch("/api/auth/users", { credentials: "include", cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({})) as { ok?: boolean; users?: LoanTypeUserOption[] };
        if (current) setLoanTypeApproverOptions(response.ok && payload.ok && Array.isArray(payload.users) ? payload.users : []);
      })
      .catch(() => { if (current) setLoanTypeApproverOptions([]); })
      .finally(() => { if (current) setLoanTypeApproversLoading(false); });
    return () => { current = false; };
  }, [loanTypeEditorOpen, loanTypeEditorTab]);

  useEffect(() => {
    if (!loanTypeEditorOpen) return;
    let current = true;
    void api<LoanChartAccount[]>("/api/loan/accounts")
      .then((accounts) => { if (current) setLoanChartAccounts(accounts); })
      .catch(() => { if (current) setLoanChartAccounts([]); });
    return () => { current = false; };
  }, [loanTypeEditorOpen]);

  useEffect(() => {
    if (!loanTypePickerOpen) return;
    let current = true;
    const timeout = window.setTimeout(async () => {
      setLoanTypeLoading(true);
      try {
        const query = loanTypeSearchAll ? "" : form.loanType;
        const options = await api<LoanFormSuggestions>(`/api/loan/options?kind=loanTypes&limit=50&q=${encodeURIComponent(query)}`);
        if (current) {
          const existing = options.loanTypes.filter((type) => !DEFAULT_LOAN_TYPES.includes(type));
          const typed = loanTypeSearchAll ? "" : form.loanType.trim();
          setLoanTypeSuggestions([...DEFAULT_LOAN_TYPES, ...existing].filter((type, index, values) => values.indexOf(type) === index && (!typed || type.toLowerCase().includes(typed.toLowerCase()))));
        }
      } catch {
        if (current) setLoanTypeSuggestions(DEFAULT_LOAN_TYPES);
      } finally {
        if (current) setLoanTypeLoading(false);
      }
    }, 150);
    return () => { current = false; window.clearTimeout(timeout); };
  }, [loanTypePickerOpen, form.loanType, loanTypeSearchAll]);

  useEffect(() => {
    if (!sourceLoanPickerOpen) return;
    let current = true;
    const timeout = window.setTimeout(async () => {
      setSourceLoanLoading(true);
      try {
        const search = form.loanInformation.sourceLoan.trim();
        const options = await api<LoanEntity[]>(`/api/loan/loans?limit=50${search ? `&search=${encodeURIComponent(search)}` : ""}`);
        if (current) setSourceLoanOptions(options.filter((option) => option.id !== loan?.id && option.loanNumber));
      } catch {
        if (current) setSourceLoanOptions([]);
      } finally {
        if (current) setSourceLoanLoading(false);
      }
    }, 150);
    return () => { current = false; window.clearTimeout(timeout); };
  }, [sourceLoanPickerOpen, form.loanInformation.sourceLoan, loan?.id]);

  useEffect(() => {
    if (!sourceLoanSearchModalOpen) return;
    let current = true;
    const timeout = window.setTimeout(async () => {
      setSourceLoanSearchLoading(true);
      try {
        const search = sourceLoanSearchText.trim();
        const options = await api<LoanEntity[]>(`/api/loan/loans?limit=200${search ? `&search=${encodeURIComponent(search)}` : ""}`);
        if (current) setSourceLoanSearchResults(options.filter((option) => option.id !== loan?.id && option.loanNumber));
      } catch {
        if (current) setSourceLoanSearchResults([]);
      } finally {
        if (current) setSourceLoanSearchLoading(false);
      }
    }, 180);
    return () => { current = false; window.clearTimeout(timeout); };
  }, [sourceLoanSearchModalOpen, sourceLoanSearchText, loan?.id]);

  useEffect(() => {
    if (activeTab !== "Contacts") return;
    let current = true;
    setLoanContactsLoading(true);
    void Promise.all([
      fetch("/api/auth/users", { credentials: "include", cache: "no-store" }).then(async (response) => {
        const payload = await response.json().catch(() => ({})) as { ok?: boolean; users?: LoanTypeUserOption[] };
        return response.ok && payload.ok && Array.isArray(payload.users) ? payload.users : [];
      }),
      api<LoanBorrower[]>("/api/loan/contacts?limit=200"),
    ])
      .then(([users, contacts]) => { if (current) { setLoanContactStaffOptions(users); setLoanContactOptions(contacts); } })
      .catch(() => { if (current) { setLoanContactStaffOptions([]); setLoanContactOptions([]); } })
      .finally(() => { if (current) setLoanContactsLoading(false); });
    return () => { current = false; };
  }, [activeTab]);

  const set = (key: keyof EnhancedLoanFormState) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
  };

  const changeCustomer = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fullName = event.target.value;
    setForm((current) => ({ ...current, fullName, borrowerId: "" }));
    setCustomerSearchAll(false);
    setCustomerPickerOpen(true);
  };

  const selectCustomer = (borrower: LoanBorrower) => {
    setForm((current) => ({
      ...current,
      borrowerId: borrower.id,
      fullName: borrower.fullName,
      phone: borrower.phone || "",
      email: borrower.email || "",
      nationalId: borrower.nationalId || "",
      address: borrower.address || "",
      customerProfile: borrower.profile || {},
    }));
    setCustomerPickerOpen(false);
  };

  const openCustomerEditor = () => {
    setCustomerEditorSnapshot(form);
    setCustomerEditorTab("general");
    setCustomerPickerOpen(false);
    setCustomerEditorOpen(true);
  };

  const closeCustomerEditor = (discardChanges = false) => {
    if (discardChanges && customerEditorSnapshot) setForm(customerEditorSnapshot);
    setCustomerEditorSnapshot(null);
    setCustomerEditorOpen(false);
  };

  const openLoanTypeEditor = () => {
    setLoanTypeEditor(emptyLoanTypeEditor(form.loanType));
    setLoanTypeTranslationOpen(false);
    setLoanTypeApproverPickerOpen(false);
    setLoanTypeApproverSearch("");
    setLoanTypeEditorMode("create");
    setLoanTypeEditorTab("general");
    setLoanTypePickerOpen(false);
    setLoanTypeSearchModalOpen(false);
    setLoanTypeEditorOpen(true);
  };

  const openSelectedLoanTypeEditor = async () => {
    const name = form.loanType.trim();
    if (!name) return;
    setLoanTypeEditor(loanTypeEditorFromDefaults(name));
    setLoanTypeTranslationOpen(false);
    setLoanTypeApproverPickerOpen(false);
    setLoanTypeApproverSearch("");
    setLoanTypeEditorMode("open");
    setLoanTypeEditorTab("general");
    setLoanTypePickerOpen(false);
    setLoanTypeSearchModalOpen(false);
    setLoanTypeEditorOpen(true);
    setLoanTypeEditorLoading(true);
    try {
      const definitions = await api<LoanTypeDefinition[]>(`/api/loan/loan-types?q=${encodeURIComponent(name)}`);
      const selected = definitions.find((item) => item.name.toLowerCase() === name.toLowerCase());
      if (selected) setLoanTypeEditor({ name: selected.name, nameKhmer: selected.nameKhmer, approvers: selected.approvers, amountOffer: selected.amountOffer, minOffer: selected.minOffer, maxOffer: selected.maxOffer, approverRequired: selected.approverRequired, contractTerms: selected.contractTerms, currency: selected.currency, sequenceCode: selected.sequenceCode, incomeAccount: selected.incomeAccount, penaltyAccount: selected.penaltyAccount, feeAccount: selected.feeAccount, badDebtAccount: selected.badDebtAccount });
    } catch (caught) {
      toastError(caught instanceof Error ? caught.message : "Could not load the loan type");
    } finally {
      setLoanTypeEditorLoading(false);
    }
  };

  const openLoanTypeTranslation = () => {
    setLoanTypeTranslationDraft({ english: loanTypeEditor.name, khmer: loanTypeEditor.nameKhmer || "" });
    setLoanTypeTranslationOpen(true);
  };

  const saveLoanTypeTranslation = () => {
    setLoanTypeEditor((current) => ({ ...current, name: loanTypeTranslationDraft.english, nameKhmer: loanTypeTranslationDraft.khmer }));
    setLoanTypeTranslationOpen(false);
  };

  const addLoanTypeApprover = (username: string) => {
    const user = loanTypeApproverOptions.find((item) => item.username === username);
    if (!user) return;
    const role = user.role ? user.role.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) : "User";
    const name = `${user.full_name?.trim() || user.username} (${role})`;
    setLoanTypeEditor((current) => current.approvers.some((item) => item.username === username)
      ? current
      : { ...current, approvers: [...current.approvers, { username, name, required: false }] });
    setLoanTypeApproverPickerOpen(false);
    setLoanTypeApproverSearch("");
  };

  const setLoanTypeApproverRequired = (username: string, required: boolean) => {
    setLoanTypeEditor((current) => ({ ...current, approvers: current.approvers.map((item) => item.username === username ? { ...item, required } : item) }));
  };

  const removeLoanTypeApprover = (username: string) => {
    setLoanTypeEditor((current) => ({ ...current, approvers: current.approvers.filter((item) => item.username !== username) }));
  };

  const selectLoanChartAccount = (account: LoanChartAccount) => {
    if (!loanAccountPickerField) return;
    setLoanTypeEditor((current) => ({ ...current, [loanAccountPickerField]: loanChartAccountLabel(account) }));
    setLoanAccountPickerField(null);
    setLoanAccountSearch("");
    setLoanAccountSearchModalOpen(false);
  };

  const openLoanAccountEditor = (field: LoanTypeAccountField, account?: LoanChartAccount) => {
    setLoanAccountPickerField(field);
    setLoanAccountEditorMode(account ? "open" : "create");
    setLoanAccountEditor(account ? { code: account.code, name: account.name, type: account.type === "Asset" ? "Current Assets" : account.type, defaultTaxes: account.defaultTaxes, tags: account.tags, accountGroup: account.accountGroup, accountCurrency: account.accountCurrency, allowReconciliation: account.allowReconciliation, inactive: account.inactive } : emptyLoanChartAccount());
    setLoanAccountSearchModalOpen(false);
    setLoanAccountEditorOpen(true);
  };

  const openSelectedLoanAccount = (field: LoanTypeAccountField) => {
    const value = loanTypeEditor[field] || "";
    const code = value.trim().split(/\s+/, 1)[0] || "";
    const account = loanChartAccounts.find((item) => loanChartAccountLabel(item) === value || item.code === code);
    openLoanAccountEditor(field, account || { id: "", code, name: value.slice(code.length).trim(), type: "Current Assets", defaultTaxes: null, tags: null, accountGroup: null, accountCurrency: null, allowReconciliation: false, inactive: false });
  };

  const saveLoanAccount = async () => {
    setLoanAccountSaving(true);
    try {
      const saved = await api<LoanChartAccount>("/api/loan/accounts", { method: "POST", body: JSON.stringify(loanAccountEditor) });
      setLoanChartAccounts((current) => [...current.filter((account) => account.code !== saved.code), saved].sort((a, b) => a.code.localeCompare(b.code)));
      if (loanAccountPickerField) setLoanTypeEditor((current) => ({ ...current, [loanAccountPickerField]: loanChartAccountLabel(saved) }));
      setLoanAccountEditorOpen(false);
      setLoanAccountPickerField(null);
      setLoanAccountSearch("");
      toastSuccess("Account saved successfully.");
    } catch (caught) {
      toastError(caught instanceof Error ? caught.message : "Could not save account");
    } finally {
      setLoanAccountSaving(false);
    }
  };

  const openLoanAccountJournal = () => {
    const code = loanAccountEditor.code.trim();
    if (!code) {
      toastError("Save the account code before viewing journal items.");
      return;
    }
    onOpenJournalItems({ code, name: loanAccountEditor.name.trim() || "Account" });
  };

  const renderLoanAccountField = (label: string, field: LoanTypeAccountField) => {
    const value = loanTypeEditor[field] || "";
    const pickerOpen = loanAccountPickerField === field && !loanAccountSearchModalOpen && !loanAccountEditorOpen;
    return (
      <Field label={label}>
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <input className={`${inputClass} pr-9`} value={value} onFocus={() => { setLoanAccountPickerField(field); setLoanAccountSearch(value); }} onChange={(event) => { setLoanTypeEditor((current) => ({ ...current, [field]: event.target.value })); setLoanAccountPickerField(field); setLoanAccountSearch(event.target.value); }} placeholder="Search account" role="combobox" aria-expanded={pickerOpen} aria-controls={`loan-account-options-${field}`} />
            <button type="button" onClick={() => { setLoanAccountPickerField(field); setLoanAccountSearch(value); }} aria-label={`Show ${label.toLowerCase()} options`} className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><ChevronDown className="h-4 w-4" /></button>
            {pickerOpen ? (
              <div id={`loan-account-options-${field}`} role="listbox" className="absolute right-0 top-[calc(100%+0.35rem)] z-30 w-full min-w-[360px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950">
                <div className="max-h-64 overflow-y-auto p-1">
                  {filteredLoanChartAccounts.slice(0, 8).map((account) => <button key={account.id || account.code} type="button" onClick={() => selectLoanChartAccount(account)} className="block w-full rounded-lg px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 dark:text-slate-200 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-200"><span className="font-semibold">{account.code}</span> {account.name}</button>)}
                  {filteredLoanChartAccounts.length === 0 ? <p className="px-3 py-4 text-center text-sm text-slate-500">No matching accounts found.</p> : null}
                </div>
                <div className="border-t border-slate-200 p-1 dark:border-slate-800">
                  <button type="button" onClick={() => setLoanAccountSearchModalOpen(true)} className="block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-500/10">Search More…</button>
                  <button type="button" onClick={() => openLoanAccountEditor(field)} className="block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-500/10">Create and Edit…</button>
                </div>
              </div>
            ) : null}
          </div>
          <button type="button" disabled={!value.trim()} onClick={() => openSelectedLoanAccount(field)} aria-label={`Open ${label.toLowerCase()}`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-35 dark:hover:bg-slate-800"><ArrowRight className="h-4 w-4" /></button>
        </div>
      </Field>
    );
  };

  const saveLoanTypeEditor = async () => {
    setLoanTypeSaving(true);
    try {
      const saved = await api<LoanTypeDefinition>("/api/loan/loan-types", { method: "POST", body: JSON.stringify(loanTypeEditor) });
      setForm((current) => ({ ...current, loanType: saved.name }));
      setLoanTypeSuggestions((current) => [...current, saved.name].filter((value, index, values) => values.indexOf(value) === index));
      setLoanTypeEditorOpen(false);
      toastSuccess("Loan type saved successfully.");
    } catch (caught) {
      toastError(caught instanceof Error ? caught.message : "Could not save loan type");
    } finally { setLoanTypeSaving(false); }
  };

  const setCustomerProfile = (key: string) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((current) => ({ ...current, customerProfile: { ...current.customerProfile, [key]: event.target.value } }));
  };

  const setCustomerProfileValue = (key: string, value: string) => {
    setForm((current) => ({ ...current, customerProfile: { ...current.customerProfile, [key]: value } }));
  };

  const setCustomerBirthDate = (value: string) => {
    const normalized = parseAndFormatDate(value);
    let age = "";

    if (normalized) {
      const [birthYear, birthMonth, birthDay] = normalized.split("-").map(Number);
      const today = new Date();
      let calculatedAge = today.getFullYear() - birthYear;
      const birthdayHasPassed = today.getMonth() + 1 > birthMonth
        || (today.getMonth() + 1 === birthMonth && today.getDate() >= birthDay);
      if (!birthdayHasPassed) calculatedAge -= 1;
      if (calculatedAge >= 0) age = String(calculatedAge);
    }

    setForm((current) => ({
      ...current,
      customerProfile: { ...current.customerProfile, dateOfBirth: value, age },
    }));
  };

  const setCustomerProfileRows = <T,>(key: string, rows: T[]) => {
    setCustomerProfileValue(key, JSON.stringify(rows));
  };

  const uploadCustomerImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toastError("Choose an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toastError("The image must be 5 MB or smaller");
      return;
    }
    setCustomerImageUploading(true);
    try {
      const upload = new FormData();
      upload.append("file", file);
      const response = await fetch("/api/loan/contact-image", { method: "POST", body: upload, credentials: "include" });
      const payload = await response.json().catch(() => null) as ApiResponse<{ url: string; publicId: string | null }> | null;
      if (!response.ok || !payload?.success || !payload.data?.url) throw new Error(payload?.error || "Image upload failed");
      const image = payload.data;
      setForm((current) => ({
        ...current,
        customerProfile: {
          ...current.customerProfile,
          imageUrl: image.url,
          imagePublicId: image.publicId || "",
        },
      }));
      toastSuccess("Customer image uploaded.");
    } catch (caught) {
      toastError(caught instanceof Error ? caught.message : "Could not upload image");
    } finally {
      setCustomerImageUploading(false);
    }
  };

  const uploadCustomerContactImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      toastError("Choose an image up to 5 MB");
      return;
    }
    setCustomerContactImageUploading(true);
    try {
      const upload = new FormData();
      upload.append("file", file);
      const response = await fetch("/api/loan/contact-image", { method: "POST", body: upload, credentials: "include" });
      const payload = await response.json().catch(() => null) as ApiResponse<{ url: string }> | null;
      if (!response.ok || !payload?.success || !payload.data?.url) throw new Error(payload?.error || "Image upload failed");
      setCustomerContactDraft((current) => ({ ...current, imageUrl: payload.data?.url || "" }));
    } catch (caught) {
      toastError(caught instanceof Error ? caught.message : "Could not upload contact image");
    } finally {
      setCustomerContactImageUploading(false);
    }
  };

  const setLoanInformation = (key: keyof LoanInformation) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((current) => ({ ...current, loanInformation: { ...current.loanInformation, [key]: event.target.value } }));
  };
  const selectSourceLoan = (source: LoanEntity) => {
    setForm((current) => ({ ...current, loanInformation: { ...current.loanInformation, sourceLoan: source.loanNumber || "" } }));
    setSourceLoanPickerOpen(false);
    setSourceLoanSearchModalOpen(false);
  };
  const openSourceLoanWorkspace = () => {
    const sourceNumber = form.loanInformation.sourceLoan.trim().toLowerCase();
    const selected = [...sourceLoanOptions, ...sourceLoanSearchResults].find((source) => source.loanNumber?.toLowerCase() === sourceNumber);
    const url = selected ? `/loan?view=loans&openLoan=${encodeURIComponent(selected.id)}` : "/loan?view=loans&newLoan=1";
    window.open(url, "_blank", "noopener,noreferrer");
  };
  const updateLoanContactAssignment = (key: "bm" | "collectionOfficer" | "loanSpecialist", value: string) => {
    setForm((current) => ({ ...current, loanContacts: { ...current.loanContacts, [key]: value || null } }));
  };
  const loanTeamOptionLabel = (option: LoanTypeUserOption) => `${option.full_name?.trim() || option.username}${option.role ? ` (${option.role})` : ""}`;
  const selectLoanTeamMember = (key: "bm" | "collectionOfficer" | "loanSpecialist", option: LoanTypeUserOption) => {
    updateLoanContactAssignment(key, option.username);
    setLoanTeamSearch((current) => ({ ...current, [key]: loanTeamOptionLabel(option) }));
    setLoanTeamPickerKey(null);
  };
  const loanTeamFieldLabel = (key: "bm" | "collectionOfficer" | "loanSpecialist") => key === "bm" ? "BM" : key === "collectionOfficer" ? "Collection Officer" : "Loan Specialist";
  const openLoanTeamMemberEditor = (key: "bm" | "collectionOfficer" | "loanSpecialist") => {
    const username = form.loanContacts[key];
    const member = loanContactStaffOptions.find((option) => option.username === username);
    if (!member) return;
    setLoanTeamMemberDraft({
      username: member.username,
      full_name: member.full_name || member.username,
      email: member.email || "",
      phone: member.phone || "",
      mobile: member.mobile || "",
      profile_picture: member.profile_picture || "",
    });
    setLoanTeamPickerKey(null);
    setLoanTeamEditorKey(key);
  };
  const uploadLoanTeamImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      toastError("Use a JPG, PNG, WebP, or GIF image");
      return;
    }
    if (file.size > 500 * 1024) {
      toastError("The profile image must be 500 KB or smaller");
      return;
    }
    setLoanTeamImageUploading(true);
    try {
      const upload = new FormData();
      upload.append("file", file);
      const response = await fetch("/api/auth/upload-avatar", { method: "POST", body: upload, credentials: "include" });
      const payload = await response.json().catch(() => null) as { ok?: boolean; url?: string; error?: string } | null;
      if (!response.ok || !payload?.ok || !payload.url) throw new Error(payload?.error || "Image upload failed");
      setLoanTeamMemberDraft((current) => current ? { ...current, profile_picture: payload.url || "" } : current);
      toastSuccess("Profile image uploaded.");
    } catch (caught) {
      toastError(caught instanceof Error ? caught.message : "Could not upload profile image");
    } finally {
      setLoanTeamImageUploading(false);
    }
  };
  const saveLoanTeamMember = async () => {
    if (!loanTeamMemberDraft || !loanTeamEditorKey) return;
    if (!loanTeamMemberDraft.full_name.trim()) {
      toastError("Name is required");
      return;
    }
    setLoanTeamMemberSaving(true);
    try {
      const response = await fetch("/api/auth/users", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: loanTeamMemberDraft.username,
          full_name: loanTeamMemberDraft.full_name.trim(),
          email: loanTeamMemberDraft.email.trim(),
          phone: loanTeamMemberDraft.phone.trim(),
          mobile: loanTeamMemberDraft.mobile.trim(),
          profile_picture: loanTeamMemberDraft.profile_picture,
        }),
      });
      const payload = await response.json().catch(() => null) as { ok?: boolean; user?: LoanTypeUserOption; error?: string } | null;
      if (!response.ok || !payload?.ok || !payload.user) throw new Error(payload?.error || "Could not save staff member");
      setLoanContactStaffOptions((current) => current.map((option) => option.username === loanTeamMemberDraft.username ? { ...option, ...payload.user } : option));
      setLoanTeamSearch((current) => ({ ...current, [loanTeamEditorKey]: loanTeamOptionLabel(payload.user!) }));
      setLoanTeamEditorKey(null);
      setLoanTeamMemberDraft(null);
      toastSuccess(`${loanTeamFieldLabel(loanTeamEditorKey)} updated successfully.`);
    } catch (caught) {
      toastError(caught instanceof Error ? caught.message : "Could not save staff member");
    } finally {
      setLoanTeamMemberSaving(false);
    }
  };
  const emptyRelatedContact = (): LoanRelatedContact => ({ contactId: null, name: "", phone: null, email: null, address1: null, address2: null, relation: null, type: null, limit: null });
  const relatedContactFromBorrower = (contact: LoanBorrower): LoanRelatedContact => ({
    ...emptyRelatedContact(),
    contactId: contact.id,
    name: contact.fullName,
    phone: contact.phone,
    email: contact.email,
    address1: contact.address,
    address2: contact.profile.address2 || null,
  });
  const relatedContactTitle = (key: "coBorrowers" | "brokers" | "guarantors") => key === "coBorrowers" ? "Co-Borrower" : key === "brokers" ? "Broker" : "Guarantor";
  const openRelatedContactPicker = (key: "coBorrowers" | "brokers" | "guarantors") => {
    setRelatedContactPickerKey(key);
    setRelatedContactSearch("");
    setRelatedContactSelection([]);
  };
  const toggleRelatedContactSelection = (contactId: string) => {
    setRelatedContactSelection((current) => current.includes(contactId) ? current.filter((id) => id !== contactId) : [...current, contactId]);
  };
  const selectRelatedContacts = () => {
    if (!relatedContactPickerKey || relatedContactSelection.length === 0) return;
    const selected = loanContactOptions.filter((contact) => relatedContactSelection.includes(contact.id));
    setForm((current) => {
      const existing = current.loanContacts[relatedContactPickerKey];
      const additions = selected.filter((contact) => !existing.some((item) => item.contactId === contact.id)).map(relatedContactFromBorrower);
      return { ...current, loanContacts: { ...current.loanContacts, [relatedContactPickerKey]: [...existing, ...additions] } };
    });
    setRelatedContactPickerKey(null);
    setRelatedContactSelection([]);
  };
  const openRelatedContactCreator = (keyOverride?: "coBorrowers" | "brokers" | "guarantors") => {
    const targetKey = keyOverride || relatedContactPickerKey;
    if (!targetKey) return;
    const contactRole = relatedContactTitle(targetKey);
    setRelatedContactPickerKey(targetKey);
    setRelatedContactDraft({
      ...emptyContact(),
      profile: {
        relationship: targetKey === "brokers" ? "vendor" : "customer",
        loanContactRole: contactRole,
      },
    });
    setRelatedContactCreatorTab("general");
    setRelatedContactPickerKey((current) => current);
    setRelatedCompanyPickerOpen(false);
    setRelatedCompanySearchOpen(false);
    setRelatedCompanyCreatorOpen(false);
    setRelatedContactCreatorOpen(true);
  };
  const closeRelatedContactCreator = () => {
    setRelatedCompanyPickerOpen(false);
    setRelatedCompanySearchOpen(false);
    setRelatedCompanyCreatorOpen(false);
    setRelatedContactCreatorOpen(false);
  };
  const setRelatedContactDraftField = (key: keyof Omit<LoanContactInput, "profile">, value: string) => {
    setRelatedContactDraft((current) => ({ ...current, [key]: key === "income" ? (value ? Number(value) : null) : value || null }));
  };
  const setRelatedContactDraftProfile = (key: string, value: string) => {
    setRelatedContactDraft((current) => ({ ...current, profile: { ...current.profile, [key]: value } }));
  };
  const setRelatedContactProfileRows = <T,>(key: string, rows: T[]) => {
    setRelatedContactDraftProfile(key, JSON.stringify(rows));
  };
  const uploadRelatedContactImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toastError("Choose an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toastError("The image must be 5 MB or smaller");
      return;
    }
    setRelatedContactImageUploading(true);
    try {
      const upload = new FormData();
      upload.append("file", file);
      const response = await fetch("/api/loan/contact-image", { method: "POST", body: upload, credentials: "include" });
      const payload = await response.json().catch(() => null) as ApiResponse<{ url: string; publicId: string | null }> | null;
      if (!response.ok || !payload?.success || !payload.data?.url) throw new Error(payload?.error || "Image upload failed");
      setRelatedContactDraftProfile("imageUrl", payload.data.url);
      setRelatedContactDraftProfile("imagePublicId", payload.data.publicId || "");
      toastSuccess("Contact image uploaded.");
    } catch (caught) {
      toastError(caught instanceof Error ? caught.message : "Could not upload image");
    } finally {
      setRelatedContactImageUploading(false);
    }
  };
  const selectRelatedCompany = (company: LoanBorrower) => {
    setRelatedContactDraftProfile("company", company.fullName);
    setRelatedCompanyPickerOpen(false);
    setRelatedCompanySearchOpen(false);
  };
  const openRelatedCompanyCreator = () => {
    setRelatedCompanyDraft({ ...emptyContact(), fullName: relatedContactDraft.profile.company || "", profile: { entityType: "company", relationship: "customer" } });
    setRelatedCompanyPickerOpen(false);
    setRelatedCompanySearchOpen(false);
    setRelatedCompanyCreatorOpen(true);
  };
  const saveRelatedCompany = async () => {
    if (!relatedCompanyDraft.fullName.trim()) {
      toastError("Company name is required");
      return;
    }
    setRelatedCompanySaving(true);
    try {
      const saved = await api<LoanBorrower>("/api/loan/contacts", { method: "POST", body: JSON.stringify(relatedCompanyDraft) });
      setLoanContactOptions((current) => [saved, ...current.filter((contact) => contact.id !== saved.id)]);
      selectRelatedCompany(saved);
      setRelatedCompanyCreatorOpen(false);
      toastSuccess("Company created successfully.");
    } catch (caught) {
      toastError(caught instanceof Error ? caught.message : "Could not create company");
    } finally {
      setRelatedCompanySaving(false);
    }
  };
  const saveRelatedContact = async (saveAndNew = false) => {
    if (!relatedContactPickerKey) return;
    if (!relatedContactDraft.fullName.trim()) {
      toastError("Contact name is required");
      return;
    }
    setRelatedContactSaving(true);
    try {
      const saved = await api<LoanBorrower>("/api/loan/contacts", { method: "POST", body: JSON.stringify(relatedContactDraft) });
      setLoanContactOptions((current) => [saved, ...current.filter((contact) => contact.id !== saved.id)]);
      setForm((current) => ({ ...current, loanContacts: { ...current.loanContacts, [relatedContactPickerKey]: [...current.loanContacts[relatedContactPickerKey], relatedContactFromBorrower(saved)] } }));
      toastSuccess(`${relatedContactTitle(relatedContactPickerKey)} contact created successfully.`);
      if (saveAndNew) setRelatedContactDraft({ ...emptyContact(), profile: { relationship: relatedContactPickerKey === "brokers" ? "vendor" : "customer", loanContactRole: relatedContactTitle(relatedContactPickerKey) } });
      else {
        closeRelatedContactCreator();
        setRelatedContactPickerKey(null);
      }
    } catch (caught) {
      toastError(caught instanceof Error ? caught.message : "Could not create contact");
    } finally {
      setRelatedContactSaving(false);
    }
  };
  const updateRelatedContact = (key: "coBorrowers" | "brokers" | "guarantors", index: number, patch: Partial<LoanRelatedContact>) => {
    setForm((current) => ({ ...current, loanContacts: { ...current.loanContacts, [key]: current.loanContacts[key].map((contact, contactIndex) => contactIndex === index ? { ...contact, ...patch } : contact) } }));
  };
  const removeRelatedContact = (key: "coBorrowers" | "brokers" | "guarantors", index: number) => {
    setForm((current) => ({ ...current, loanContacts: { ...current.loanContacts, [key]: current.loanContacts[key].filter((_, contactIndex) => contactIndex !== index) } }));
  };
  const setRelatedContactName = (key: "coBorrowers" | "brokers" | "guarantors", index: number, name: string) => {
    const selected = loanContactOptions.find((contact) => contact.fullName.toLowerCase() === name.trim().toLowerCase());
    updateRelatedContact(key, index, selected ? {
      contactId: selected.id,
      name: selected.fullName,
      phone: selected.phone,
      email: selected.email,
      address1: selected.address,
      address2: selected.profile.address2 || null,
    } : { contactId: null, name });
  };

  const selectRelatedContactForRow = (key: "coBorrowers" | "brokers" | "guarantors", index: number, selected: LoanBorrower) => {
    updateRelatedContact(key, index, relatedContactFromBorrower(selected));
    setRelatedContactRowPicker(null);
  };

  const renderRelatedContacts = (title: string, key: "coBorrowers" | "brokers" | "guarantors", guarantorColumns = false) => {
    const contacts = form.loanContacts[key];
    return (
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <h3 className="font-bold text-slate-900 dark:text-white">{title}</h3>
          <span className="text-xs font-semibold text-slate-500">{contacts.length} added</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">
              <tr>
                {guarantorColumns ? <><th className="px-3 py-3">Contact</th><th className="px-3 py-3">Relation</th><th className="px-3 py-3">Type</th><th className="px-3 py-3">Limit</th></> : <><th className="px-3 py-3">Name</th><th className="px-3 py-3">Phone</th><th className="px-3 py-3">Email</th><th className="px-3 py-3">Address 1</th><th className="px-3 py-3">Address 2</th></>}
                <th className="w-12 px-2 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact, index) => {
                const contactMenuOpen = relatedContactRowPicker?.key === key && relatedContactRowPicker.index === index;
                const contactQuery = contact.name.trim().toLowerCase();
                const matchingContacts = loanContactOptions.filter((option) => !contactQuery || [option.fullName, option.phone, option.email].some((value) => value?.toLowerCase().includes(contactQuery))).slice(0, 7);
                const contactMenu = contactMenuOpen && relatedContactMenuPosition && typeof document !== "undefined" ? createPortal(
                  <div
                    id={`related-contact-options-${key}-${index}`}
                    role="listbox"
                    className="fixed z-[120] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950"
                    style={{ left: relatedContactMenuPosition.left, top: relatedContactMenuPosition.top, width: relatedContactMenuPosition.width, transform: relatedContactMenuPosition.openUp ? "translateY(-100%)" : undefined }}
                  >
                    <div className="max-h-72 overflow-y-auto p-1">
                      {matchingContacts.map((option) => <button key={option.id} type="button" role="option" aria-selected={contact.contactId === option.id} onMouseDown={(event) => event.preventDefault()} onClick={() => selectRelatedContactForRow(key, index, option)} className="block w-full rounded-lg px-3 py-2.5 text-left hover:bg-emerald-50 focus:bg-emerald-50 focus:outline-none dark:hover:bg-emerald-500/10 dark:focus:bg-emerald-500/10"><span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">{option.fullName}</span><span className="mt-0.5 block truncate text-xs text-slate-500">{[option.phone, option.email].filter(Boolean).join(" · ") || "Saved contact"}</span></button>)}
                      {matchingContacts.length === 0 ? <p className="px-3 py-4 text-center text-sm text-slate-500">No matching contacts.</p> : null}
                    </div>
                    <div className="border-t border-slate-200 p-1 dark:border-slate-800">
                      <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { setRelatedContactRowPicker(null); openRelatedContactPicker(key); }} className="block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-500/10">Search More…</button>
                      <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { setRelatedContactRowPicker(null); openRelatedContactCreator(key); }} className="block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-500/10">Create and Edit…</button>
                    </div>
                  </div>, document.body) : null;
                return (
                  <tr key={`${key}-${index}`} className="border-t border-slate-100 dark:border-slate-800">
                    {guarantorColumns ? <>
                      <td className="p-2"><div className="relative min-w-52"><input id={`related-contact-input-${key}-${index}`} className={`${inputClass} pr-9`} value={contact.name} onFocus={(event) => { setRelatedContactRowPicker({ key, index }); positionRelatedContactMenu(key, index, event.currentTarget); }} onBlur={() => window.setTimeout(() => setRelatedContactRowPicker(null), 160)} onChange={(event) => { setRelatedContactName(key, index, event.target.value); setRelatedContactRowPicker({ key, index }); positionRelatedContactMenu(key, index, event.currentTarget); }} placeholder="Contact" autoComplete="off" role="combobox" aria-autocomplete="list" aria-expanded={contactMenuOpen} aria-controls={`related-contact-options-${key}-${index}`} /><ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />{contactMenu}</div></td>
                      <td className="p-2"><input className={`${inputClass} min-w-36`} value={contact.relation || ""} onChange={(event) => updateRelatedContact(key, index, { relation: event.target.value || null })} placeholder="Relation" /></td>
                      <td className="p-2"><select className={`${inputClass} min-w-36`} value={contact.type || ""} onChange={(event) => updateRelatedContact(key, index, { type: event.target.value || null, limit: event.target.value === "Limited" ? contact.limit : null })}><option value="">Select type</option><option>Certifiers</option><option>Limited</option><option>Unlimited</option></select></td>
                      <td className="p-2"><input type="number" min="0" step="0.01" disabled={contact.type !== "Limited"} className={`${inputClass} min-w-32 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 dark:disabled:bg-slate-950`} value={contact.type === "Limited" ? contact.limit ?? "" : ""} onChange={(event) => updateRelatedContact(key, index, { limit: event.target.value === "" ? null : Number(event.target.value) })} placeholder={contact.type === "Limited" ? "0.00" : "—"} /></td>
                    </> : <>
                      <td className="p-2"><input list="loan-related-contact-options" className={`${inputClass} min-w-44`} value={contact.name} onChange={(event) => setRelatedContactName(key, index, event.target.value)} placeholder="Select contact" /></td>
                      <td className="p-2"><input className={`${inputClass} min-w-36`} value={contact.phone || ""} onChange={(event) => updateRelatedContact(key, index, { phone: event.target.value || null })} placeholder="Phone" /></td>
                      <td className="p-2"><input type="email" className={`${inputClass} min-w-44`} value={contact.email || ""} onChange={(event) => updateRelatedContact(key, index, { email: event.target.value || null })} placeholder="Email" /></td>
                      <td className="p-2"><input className={`${inputClass} min-w-48`} value={contact.address1 || ""} onChange={(event) => updateRelatedContact(key, index, { address1: event.target.value || null })} placeholder="Address 1" /></td>
                      <td className="p-2"><input className={`${inputClass} min-w-48`} value={contact.address2 || ""} onChange={(event) => updateRelatedContact(key, index, { address2: event.target.value || null })} placeholder="Address 2" /></td>
                    </>}
                    <td className="p-2"><button type="button" onClick={() => removeRelatedContact(key, index)} aria-label={`Remove ${title.toLowerCase()} row`} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"><Trash2 className="h-4 w-4" /></button></td>
                  </tr>
                );
              })}
              {!contacts.length ? <tr><td colSpan={guarantorColumns ? 5 : 6} className="px-4 py-7 text-center text-sm text-slate-500">No {title.toLowerCase()} added.</td></tr> : null}
            </tbody>
          </table>
        </div>
        <button type="button" onClick={() => guarantorColumns ? setForm((current) => ({ ...current, loanContacts: { ...current.loanContacts, [key]: [...current.loanContacts[key], emptyRelatedContact()] } })) : openRelatedContactPicker(key)} className="flex w-full items-center gap-2 border-t border-slate-200 px-4 py-3 text-left text-sm font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-slate-800 dark:text-emerald-300 dark:hover:bg-emerald-500/10"><Plus className="h-4 w-4" />Add a line</button>
      </section>
    );
  };
  const loanInformationAmount = (key: keyof LoanInformation) => Math.max(0, Number(form.loanInformation[key]) || 0);
  const loanInformationFees = loanInformationAmount("roadTaxFee")
    + loanInformationAmount("vehicleInspectionFee")
    + loanInformationAmount("taxStampFee")
    + loanInformationAmount("adminFee")
    + loanInformationAmount("withholdingFee")
    + loanInformationAmount("collateralCheckFee")
    + loanInformationAmount("loanFee");
  const informationPrincipal = Math.max(0, Number(form.principal) || 0);
  const projectedInterest = loan
    ? Math.max(0, loan.totalPayable - loan.principal)
    : informationPrincipal * Math.max(0, Number(form.interestRate) || 0) / 100 * Math.max(0, termMonthsForInput(form.termMonths, form.termUnit)) / 12;
  const informationTotal = informationPrincipal + projectedInterest + loanInformationFees;
  const informationPaid = loan ? Math.max(0, loan.totalPayable - loan.outstandingBalance) : 0;
  const principalPaid = Math.min(informationPrincipal, informationPaid);
  const interestPaid = Math.min(projectedInterest, Math.max(0, informationPaid - principalPaid));
  const feePaid = Math.min(loanInformationFees, Math.max(0, informationPaid - principalPaid - interestPaid));
  const informationBalance = Math.max(0, informationTotal - informationPaid);
  const principalBalance = Math.max(0, informationPrincipal - principalPaid);
  const interestBalance = Math.max(0, projectedInterest - interestPaid);
  const feeBalance = Math.max(0, loanInformationFees - feePaid);
  const contractTerms = DEFAULT_LOAN_TYPE_CATALOG.find((item) => item.name.toLowerCase() === form.loanType.trim().toLowerCase())?.contractTerms || "PAWN";
  const relatedAddressRows = profileRows<ContactAddressRow>(relatedContactDraft.profile.additionalContacts);
  const relatedBankRows = profileRows<ContactBankRow>(relatedContactDraft.profile.bankAccounts);
  const customerContactRows = profileRows<CustomerContactRow>(form.customerProfile.additionalContacts);
  const customerCompanyContactRows = profileRows<CustomerContactRow>(customerCompanyDraft.profile.additionalContacts);
  const customerBankRows = profileRows<ContactBankRow>(form.customerProfile.bankAccounts);
  const openCustomerContactEditor = (target: "customer" | "company" = "customer") => {
    setCustomerContactEditorTarget(target);
    setCustomerContactDraft(emptyCustomerContactRow());
    setCustomerContactEditorOpen(true);
  };
  const saveCustomerContact = (createAnother: boolean) => {
    if (customerContactEditorTarget === "company") {
      setCustomerCompanyProfile("additionalContacts", JSON.stringify([...customerCompanyContactRows, customerContactDraft]));
    } else {
      setCustomerProfileRows("additionalContacts", [...customerContactRows, customerContactDraft]);
    }
    if (createAnother) setCustomerContactDraft(emptyCustomerContactRow());
    else setCustomerContactEditorOpen(false);
  };
  const openCustomerTitleEditor = (target: "contact" | "profile" = "contact") => {
    setCustomerTitlePickerOpen(false);
    setCustomerTitleEditorTarget(target);
    setCustomerTitleDraft({ title: "", abbreviation: "" });
    setCustomerTitleEditorOpen(true);
  };
  const saveCustomerTitle = () => {
    const title = customerTitleDraft.title.trim();
    if (!title) return;
    const abbreviation = customerTitleDraft.abbreviation.trim();
    setCustomerTitleOptions((current) => current.some((item) => item.title.toLowerCase() === title.toLowerCase()) ? current : [...current, { title, abbreviation }]);
    if (customerTitleEditorTarget === "profile") setCustomerProfileValue("title", title);
    else setCustomerContactDraft((current) => ({ ...current, title, titleAbbreviation: abbreviation }));
    setCustomerTitleEditorOpen(false);
  };
  const selectCustomerCompany = (company: LoanBorrower) => {
    setCustomerProfileValue("company", company.fullName);
    setCustomerCompanyPickerOpen(false);
    setCustomerCompanyShowAll(false);
    setCustomerCompanySearchModalOpen(false);
  };
  const openCustomerCompanySearch = () => {
    setCustomerCompanyPickerOpen(false);
    setCustomerCompanySearchText("");
    setCustomerCompanySearchPage(0);
    setCustomerCompanySearchBookmarksOpen(false);
    setCustomerCompanySearchFiltersOpen(false);
    setCustomerCompanySearchGroupOpen(false);
    setCustomerCompanyColumnsOpen(false);
    setCustomerCompanySort(null);
    setCustomerCompanySearchModalOpen(true);
  };
  const toggleCustomerCompanySort = (key: "name" | "phone" | "email" | "address1" | "address2") => {
    setCustomerCompanySort((current) => {
      if (!current || current.key !== key) return { key, direction: "asc" };
      if (current.direction === "asc") return { key, direction: "desc" };
      return null;
    });
    setCustomerCompanySearchPage(0);
  };
  const stepCustomerCompanySearchPage = (direction: -1 | 1) => {
    const nextPage = Math.min(customerCompanySearchPageCount - 1, Math.max(0, customerCompanySearchSafePage + direction));
    if (nextPage === customerCompanySearchSafePage) return;
    setCustomerCompanySearchPage(nextPage);
    window.requestAnimationFrame(() => customerCompanySearchTableRef.current?.scrollTo({ top: 0, behavior: "smooth" }));
  };
  const openCustomerCompanyCreator = () => {
    setCustomerCompanyDraft({ ...emptyContact(), fullName: form.customerProfile.company || "", profile: { entityType: "company", relationship: "customer" } });
    setCustomerCompanyEditorTab("general");
    setCustomerCompanyPickerOpen(false);
    setCustomerCompanySearchModalOpen(false);
    setCustomerCompanyCreatorOpen(true);
  };
  const setCustomerCompanyProfile = (key: string, value: string) => {
    setCustomerCompanyDraft((current) => ({ ...current, profile: { ...current.profile, [key]: value } }));
  };
  const openCountrySearch = (onSelect: (countryName: string) => void, title = "Search: Country") => {
    countrySelectHandlerRef.current = onSelect;
    setCountrySearchModalTitle(title);
    setCountrySearchModalOpen(true);
  };
  const selectCountryFromSearch = (country: CountryOption) => {
    countrySelectHandlerRef.current?.(country.name);
    countrySelectHandlerRef.current = null;
    setCountrySearchModalOpen(false);
  };
  const closeCountrySearch = () => {
    countrySelectHandlerRef.current = null;
    setCountrySearchModalOpen(false);
  };
  const openCustomerCategoryEditor = (onSelect: (categoryName: string) => void) => {
    customerCategorySelectHandlerRef.current = onSelect;
    setCustomerCategoryDraft({ name: "", active: true, parent: "" });
    setCustomerCategoryEditorOpen(true);
  };
  const closeCustomerCategoryEditor = () => {
    customerCategorySelectHandlerRef.current = null;
    setCustomerCategoryEditorOpen(false);
  };
  const saveCustomerCategory = () => {
    const name = customerCategoryDraft.name.trim();
    if (!name) return;
    const savedCategory = { ...customerCategoryDraft, name, parent: customerCategoryDraft.parent.trim() };
    setCustomerCategoryOptions((current) => current.some((category) => category.name.toLowerCase() === name.toLowerCase()) ? current.map((category) => category.name.toLowerCase() === name.toLowerCase() ? savedCategory : category) : [...current, savedCategory]);
    customerCategorySelectHandlerRef.current?.(name);
    customerCategorySelectHandlerRef.current = null;
    setCustomerCategoryEditorOpen(false);
  };
  const addCustomerTagOption = (value: string) => {
    const tag = value.trim();
    if (!tag) return;
    setCustomerTagOptions((current) => current.some((option) => option.toLowerCase() === tag.toLowerCase()) ? current : [...current, tag]);
  };
  const openCustomerParentCategoryEditor = () => {
    setCustomerParentCategoryDraft({ name: "", active: true, parent: "" });
    setCustomerParentCategoryEditorOpen(true);
  };
  const saveCustomerParentCategory = () => {
    const name = customerParentCategoryDraft.name.trim();
    if (!name) return;
    const savedCategory = { ...customerParentCategoryDraft, name, parent: customerParentCategoryDraft.parent.trim() };
    setCustomerCategoryOptions((current) => current.some((category) => category.name.toLowerCase() === name.toLowerCase()) ? current.map((category) => category.name.toLowerCase() === name.toLowerCase() ? savedCategory : category) : [...current, savedCategory]);
    setCustomerCategoryDraft((current) => ({ ...current, parent: name }));
    setCustomerParentCategoryEditorOpen(false);
  };
  const uploadCustomerCompanyImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      toastError("Choose an image up to 5 MB");
      return;
    }
    setCustomerCompanyImageUploading(true);
    try {
      const upload = new FormData();
      upload.append("file", file);
      const response = await fetch("/api/loan/contact-image", { method: "POST", body: upload, credentials: "include" });
      const payload = await response.json().catch(() => null) as ApiResponse<{ url: string; publicId: string | null }> | null;
      if (!response.ok || !payload?.success || !payload.data?.url) throw new Error(payload?.error || "Image upload failed");
      setCustomerCompanyDraft((current) => ({ ...current, profile: { ...current.profile, imageUrl: payload.data?.url || "", imagePublicId: payload.data?.publicId || "" } }));
    } catch (caught) {
      toastError(caught instanceof Error ? caught.message : "Could not upload company image");
    } finally {
      setCustomerCompanyImageUploading(false);
    }
  };
  const saveCustomerCompany = async () => {
    if (!customerCompanyDraft.fullName.trim()) {
      toastError("Company name is required");
      return;
    }
    setCustomerCompanySaving(true);
    try {
      const saved = await api<LoanBorrower>("/api/loan/contacts", { method: "POST", body: JSON.stringify(customerCompanyDraft) });
      setLoanContactOptions((current) => [saved, ...current.filter((contact) => contact.id !== saved.id)]);
      selectCustomerCompany(saved);
      setCustomerCompanyCreatorOpen(false);
      toastSuccess("Company created successfully.");
    } catch (caught) {
      toastError(caught instanceof Error ? caught.message : "Could not create company");
    } finally {
      setCustomerCompanySaving(false);
    }
  };

  const renderLoanInformationAmount = (label: string, key: keyof LoanInformation) => (
    <Field label={label}>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">$</span>
        <input type="number" min="0" step="0.01" inputMode="decimal" className={`${inputClass} pl-7`} value={form.loanInformation[key]} onChange={setLoanInformation(key)} placeholder="0.00" />
      </div>
    </Field>
  );

  const loanInformationMetric = (label: string, value: number, emphasized = false) => (
    <div className={`flex items-center justify-between gap-4 rounded-xl px-3 py-2.5 ${emphasized ? "bg-emerald-50 dark:bg-emerald-950/30" : "bg-slate-50 dark:bg-slate-950"}`}>
      <dt className={`text-sm ${emphasized ? "font-semibold text-emerald-800 dark:text-emerald-200" : "font-medium text-slate-600 dark:text-slate-300"}`}>{label}</dt>
      <dd className={`text-sm font-semibold tabular-nums ${emphasized ? "text-emerald-800 dark:text-emerald-200" : "text-slate-900 dark:text-white"}`}>{formatCurrency(value)}</dd>
    </div>
  );

  const renderDateField = (
    label: string,
    field: "startDate" | "contractDate" | "contractEndDate" | "firstPaymentDate",
  ) => {
    const value = form[field];
    const normalizedValue = parseAndFormatDate(value);
    const selectedDate = normalizedValue ? new Date(`${normalizedValue}T00:00:00`) : null;
    const includesTime = field === "startDate";
    const inputId = `loan-${field}`;
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const calendarDates = Array.from({ length: 42 }, (_, index) => new Date(year, month, 1 - firstWeekday + index));
    const calendarWeeks = Array.from({ length: 6 }, (_, index) => calendarDates.slice(index * 7, index * 7 + 7));
    const weekNumber = (date: Date) => {
      const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      const day = target.getUTCDay() || 7;
      target.setUTCDate(target.getUTCDate() + 4 - day);
      const start = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
      return Math.ceil((((target.getTime() - start.getTime()) / 86_400_000) + 1) / 7);
    };
    const showCalendar = () => {
      const nextDate = selectedDate || new Date();
      const [hours, minutes, seconds] = timeInputValue(value).split(":").map(Number);
      setCalendarMonth(nextDate);
      setCalendarDraftDate(nextDate);
      setCalendarTime({ hours, minutes, seconds });
      setCalendarMode("date");
      setOpenCalendarField(field);
    };
    const toggleCalendarFromInput = () => {
      if (openCalendarField === field) {
        setOpenCalendarField(null);
        return;
      }
      showCalendar();
    };
    const adjustCalendarTime = (part: "hours" | "minutes" | "seconds", amount: number) => {
      const maximum = part === "hours" ? 24 : 60;
      setCalendarTime((current) => ({ ...current, [part]: (current[part] + amount + maximum) % maximum }));
    };
    const confirmCalendar = () => {
      const time = `${String(calendarTime.hours).padStart(2, "0")}:${String(calendarTime.minutes).padStart(2, "0")}:${String(calendarTime.seconds).padStart(2, "0")}`;
      setForm((current) => ({ ...current, [field]: dateDisplayValue(calendarDraftDate, includesTime, ` ${time}`) }));
      setError(null);
      setOpenCalendarField(null);
    };
    const changeDateFromKeyboard = (event: React.ChangeEvent<HTMLInputElement>) => {
      const nextValue = numericDateDisplayValue(event.target.value, includesTime);
      setForm((current) => ({ ...current, [field]: nextValue }));
      setOpenCalendarField(null);

      // Keep the picker in sync with a valid typed date, ready for the next
      // time the user opens it. Do not normalize while typing so partial input
      // such as "2026-08-" remains easy to complete.
      const typedDate = parseAndFormatDate(nextValue);
      if (typedDate) setCalendarMonth(new Date(`${typedDate}T00:00:00`));
    };
    const normalize = (rawValue: string) => {
      if (!rawValue.trim()) {
        setForm((current) => ({ ...current, [field]: "" }));
        return;
      }
      const normalized = parseAndFormatDate(rawValue);
      if (normalized) {
        setForm((current) => ({ ...current, [field]: storedDateDisplayValue(normalized, includesTime, rawValue) }));
        setError(null);
      } else if (rawValue.trim()) {
        setError(`Invalid date. Use ${includesTime ? "DD/MM/YYYY HH:mm:ss" : "DD/MM/YYYY"} or YYYY-MM-DD`);
      }
    };

    return (
      <div className="loan-form-row">
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
        <div className="relative">
          <input
            id={inputId}
            title={label}
            type="text"
            inputMode="numeric"
            placeholder={includesTime ? "DD/MM/YYYY HH:mm:ss" : "DD/MM/YYYY"}
            className={`${inputClass} pr-11`}
            value={value}
            onChange={changeDateFromKeyboard}
            onClick={toggleCalendarFromInput}
            onKeyDown={(event) => {
              if (event.key === "Escape") setOpenCalendarField(null);
              if (event.key === "Enter") {
                event.preventDefault();
                normalize(event.currentTarget.value);
                setOpenCalendarField(null);
              }
            }}
            onBlur={(event) => {
              normalize(event.currentTarget.value);
              window.setTimeout(() => setOpenCalendarField((current) => current === field ? null : current), 120);
            }}
          />
          <button type="button" onPointerDown={(event) => event.preventDefault()} onClick={showCalendar} title={`Select ${label}`} aria-label={`Select ${label}`} aria-expanded={openCalendarField === field} aria-controls={`date-calendar-${field}`} className="absolute inset-y-1 right-1 flex w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-emerald-700 dark:hover:bg-slate-800 dark:hover:text-emerald-300"><CalendarDays className="h-4 w-4" aria-hidden="true" /></button>
          {openCalendarField === field ? (
            <div id={`date-calendar-${field}`} onPointerDown={(event) => event.preventDefault()} className="absolute bottom-[calc(100%+0.5rem)] right-0 z-40 w-[22rem] max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xl dark:border-slate-700 dark:bg-slate-950">
              <span aria-hidden="true" className="absolute -bottom-2 right-5 h-4 w-4 rotate-45 border-b border-r border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950" />
              {calendarMode === "date" ? (
                <>
                  <div className="flex h-10 items-center justify-between border-b border-slate-200 px-2 dark:border-slate-800">
                    <button type="button" onClick={() => setCalendarMonth(new Date(year, month - 1, 1))} className="rounded-lg p-1.5 text-2xl font-semibold leading-none text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" aria-label="Previous month">‹</button>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">{calendarMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
                    <button type="button" onClick={() => setCalendarMonth(new Date(year, month + 1, 1))} className="rounded-lg p-1.5 text-2xl font-semibold leading-none text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" aria-label="Next month">›</button>
                  </div>
                  <div className="grid h-8 grid-cols-8 items-center border-b border-slate-200 text-center text-xs font-bold text-slate-600 dark:border-slate-800 dark:text-slate-300"><span>#</span>{["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => <span key={day}>{day}</span>)}</div>
                  <div>{calendarWeeks.map((week, weekIndex) => <div key={weekIndex} className="grid h-9 grid-cols-8 border-b border-slate-200 last:border-b-0 dark:border-slate-800"><span className="flex items-center justify-center text-xs font-semibold text-slate-400">{weekNumber(week[0])}</span>{week.map((date) => { const isCurrentMonth = date.getMonth() === month; const isSelected = calendarDraftDate.getFullYear() === date.getFullYear() && calendarDraftDate.getMonth() === date.getMonth() && calendarDraftDate.getDate() === date.getDate(); const isToday = dateInputValue(date) === dateInputValue(); return <button key={date.toISOString()} type="button" onClick={() => { setCalendarDraftDate(date); setCalendarMonth(new Date(date.getFullYear(), date.getMonth(), 1)); if (!includesTime) { setForm((current) => ({ ...current, [field]: dateDisplayValue(date) })); setError(null); setOpenCalendarField(null); } }} className={`m-0.5 flex items-center justify-center rounded-full text-sm font-semibold transition ${isSelected ? "bg-emerald-600 text-white" : isCurrentMonth ? `text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 dark:text-slate-200 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-300 ${isToday ? "ring-1 ring-emerald-500" : ""}` : "text-slate-400 hover:bg-slate-100 dark:text-slate-600 dark:hover:bg-slate-800"}`}>{date.getDate()}</button>; })}</div>)}</div>
                  {includesTime ? <div className="mt-1 flex h-14 items-center gap-1 border-t border-slate-200 pt-1 dark:border-slate-800"><button type="button" onClick={() => setCalendarMode("time")} title="Select Time" className="flex h-12 w-1/2 items-center justify-center rounded-lg bg-slate-100 text-emerald-600 transition hover:bg-slate-200 hover:text-emerald-700 dark:bg-slate-800 dark:text-emerald-400 dark:hover:bg-slate-700" aria-label="Select Time"><Clock className="h-5 w-5" /></button><button type="button" onClick={confirmCalendar} title="Apply Date" className="flex h-12 w-1/2 items-center justify-center rounded-lg bg-emerald-600 text-white transition hover:bg-emerald-700" aria-label="Apply selected date"><Check className="h-5 w-5" /></button></div> : null}
                </>
              ) : (
                <>
                  <div className="flex h-14 items-center gap-1">
                    <button type="button" onClick={() => setCalendarMode("date")} title="Select Date" className="flex h-12 w-1/2 items-center justify-center rounded-lg bg-white text-slate-700 transition hover:bg-slate-100 hover:text-emerald-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800" aria-label="Select Date"><CalendarDays className="h-5 w-5" /></button>
                    <button type="button" onClick={confirmCalendar} title="Apply Date and Time" className="flex h-12 w-1/2 items-center justify-center rounded-lg bg-emerald-600 text-white transition hover:bg-emerald-700" aria-label="Apply selected date and time"><Check className="h-5 w-5" /></button>
                  </div>
                  <div className="grid h-[16rem] grid-cols-[1fr_auto_1fr_auto_1fr] grid-rows-3 items-center gap-x-2 px-6 text-center text-slate-700 dark:text-slate-200">
                    {(["hours", "minutes", "seconds"] as const).flatMap((part, index) => [
                      <button key={`${part}-up`} type="button" onClick={() => adjustCalendarTime(part, 1)} title={`Increment ${part === "hours" ? "Hour" : part === "minutes" ? "Minute" : "Second"}`} className={`rounded-lg p-3 hover:bg-slate-100 dark:hover:bg-slate-800 ${index > 0 ? "col-start-auto" : ""}`} aria-label={`Increase ${part}`}><ChevronDown className="mx-auto h-6 w-6 rotate-180" /></button>,
                      index < 2 ? <span key={`${part}-up-gap`} aria-hidden="true" /> : null,
                    ])}
                    <span className="text-3xl font-bold">{String(calendarTime.hours).padStart(2, "0")}</span><span className="text-2xl text-slate-400">:</span><span className="text-3xl font-bold">{String(calendarTime.minutes).padStart(2, "0")}</span><span className="text-2xl text-slate-400">:</span><span className="text-3xl font-bold">{String(calendarTime.seconds).padStart(2, "0")}</span>
                    <button type="button" onClick={() => adjustCalendarTime("hours", -1)} title="Decrement Hour" className="rounded-lg p-3 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Decrease hours"><ChevronDown className="mx-auto h-6 w-6" /></button><span aria-hidden="true" /><button type="button" onClick={() => adjustCalendarTime("minutes", -1)} title="Decrement Minute" className="rounded-lg p-3 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Decrease minutes"><ChevronDown className="mx-auto h-6 w-6" /></button><span aria-hidden="true" /><button type="button" onClick={() => adjustCalendarTime("seconds", -1)} title="Decrement Second" className="rounded-lg p-3 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Decrease seconds"><ChevronDown className="mx-auto h-6 w-6" /></button>
                  </div>
                </>
              )}
            </div>
          ) : null}
        </div>
      </div>
    );
  };

  const renderDateOfBirthField = (field: string, label: string, value: string | undefined, onValueChange: (value: string) => void) => {
    const currentValue = value || "";
    const normalizedValue = parseAndFormatDate(currentValue) || "";
    const selectedDate = normalizedValue ? new Date(`${normalizedValue}T00:00:00`) : null;
    const year = customerDateCalendarMonth.getFullYear();
    const month = customerDateCalendarMonth.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const calendarDates = Array.from({ length: 42 }, (_, index) => new Date(year, month, 1 - firstWeekday + index));
    const calendarWeeks = Array.from({ length: 6 }, (_, index) => calendarDates.slice(index * 7, index * 7 + 7));
    const weekNumber = (date: Date) => {
      const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      const day = target.getUTCDay() || 7;
      target.setUTCDate(target.getUTCDate() + 4 - day);
      const start = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
      return Math.ceil((((target.getTime() - start.getTime()) / 86_400_000) + 1) / 7);
    };
    const showCalendar = () => {
      const nextDate = selectedDate || new Date();
      setCustomerDateCalendarMonth(nextDate);
      setCustomerDateCalendarDraft(nextDate);
      setCustomerDateCalendarField(field);
    };
    const toggleCalendarFromInput = () => {
      if (customerDateCalendarField === field) {
        setCustomerDateCalendarField(null);
        return;
      }
      showCalendar();
    };
    const normalizeBirthDate = (rawValue: string) => {
      if (!rawValue.trim()) {
        onValueChange("");
        setError(null);
        return;
      }
      const normalized = parseAndFormatDate(rawValue);
      if (normalized) {
        onValueChange(storedDateDisplayValue(normalized));
        setError(null);
      } else {
        setError(`Invalid ${label}. Use DD/MM/YYYY or YYYY-MM-DD.`);
      }
    };

    return (
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          className={`${inputClass} pr-11`}
          value={currentValue}
          onClick={toggleCalendarFromInput}
          onChange={(event) => {
            const nextValue = numericDateDisplayValue(event.target.value);
            onValueChange(nextValue);
            setCustomerDateCalendarField(null);
            const typedDate = parseAndFormatDate(nextValue);
            if (typedDate) {
              const nextDate = new Date(`${typedDate}T00:00:00`);
              setCustomerDateCalendarMonth(nextDate);
              setCustomerDateCalendarDraft(nextDate);
            }
          }}
          onBlur={(event) => {
            normalizeBirthDate(event.currentTarget.value);
            window.setTimeout(() => setCustomerDateCalendarField((current) => current === field ? null : current), 120);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") setCustomerDateCalendarField(null);
            if (event.key === "Enter") {
              event.preventDefault();
              normalizeBirthDate(event.currentTarget.value);
              setCustomerDateCalendarField(null);
            }
          }}
          placeholder="DD/MM/YYYY"
        />
        <button type="button" onPointerDown={(event) => event.preventDefault()} onClick={showCalendar} title={`Select ${label}`} aria-label={`Select ${label}`} aria-expanded={customerDateCalendarField === field} aria-controls={`customer-date-calendar-${field}`} className="absolute inset-y-1 right-1 flex w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-emerald-700 dark:hover:bg-slate-800 dark:hover:text-emerald-300"><CalendarDays className="h-4 w-4" aria-hidden="true" /></button>
        {customerDateCalendarField === field ? (
          <div id={`customer-date-calendar-${field}`} onPointerDown={(event) => event.preventDefault()} className="absolute bottom-[calc(100%+0.5rem)] right-0 z-[90] w-[22rem] max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xl dark:border-slate-700 dark:bg-slate-950">
            <span aria-hidden="true" className="absolute -bottom-2 right-5 h-4 w-4 rotate-45 border-b border-r border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950" />
            <div className="flex h-10 items-center justify-between border-b border-slate-200 px-2 dark:border-slate-800">
              <button type="button" onClick={() => setCustomerDateCalendarMonth(new Date(year, month - 1, 1))} className="rounded-lg p-1.5 text-2xl font-semibold leading-none text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" aria-label="Previous month">‹</button>
              <p className="text-lg font-bold text-slate-900 dark:text-white">{customerDateCalendarMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
              <button type="button" onClick={() => setCustomerDateCalendarMonth(new Date(year, month + 1, 1))} className="rounded-lg p-1.5 text-2xl font-semibold leading-none text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" aria-label="Next month">›</button>
            </div>
            <div className="grid h-8 grid-cols-8 items-center border-b border-slate-200 text-center text-xs font-bold text-slate-600 dark:border-slate-800 dark:text-slate-300"><span>#</span>{["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => <span key={day}>{day}</span>)}</div>
            <div>{calendarWeeks.map((week, weekIndex) => <div key={weekIndex} className="grid h-9 grid-cols-8 border-b border-slate-200 last:border-b-0 dark:border-slate-800"><span className="flex items-center justify-center text-xs font-semibold text-slate-400">{weekNumber(week[0])}</span>{week.map((date) => { const isCurrentMonth = date.getMonth() === month; const isSelected = customerDateCalendarDraft.getFullYear() === date.getFullYear() && customerDateCalendarDraft.getMonth() === date.getMonth() && customerDateCalendarDraft.getDate() === date.getDate(); const isToday = dateInputValue(date) === dateInputValue(); return <button key={date.toISOString()} type="button" onClick={() => { setCustomerDateCalendarDraft(date); setCustomerDateCalendarMonth(new Date(date.getFullYear(), date.getMonth(), 1)); onValueChange(dateDisplayValue(date)); setError(null); setCustomerDateCalendarField(null); }} className={`m-0.5 flex items-center justify-center rounded-full text-sm font-semibold transition ${isSelected ? "bg-emerald-600 text-white" : isCurrentMonth ? `text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 dark:text-slate-200 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-300 ${isToday ? "ring-1 ring-emerald-500" : ""}` : "text-slate-400 hover:bg-slate-100 dark:text-slate-600 dark:hover:bg-slate-800"}`}>{date.getDate()}</button>; })}</div>)}</div>
          </div>
        ) : null}
      </div>
    );
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const isRealEstate = form.loanType.trim().toLowerCase() === "real estate";
    const dateFields: ReadonlyArray<readonly ["startDate" | "contractDate" | "contractEndDate" | "firstPaymentDate", string]> = isRealEstate
      ? [["startDate", "Date"], ["firstPaymentDate", "First Pay Date"]]
      : [["startDate", "Date"], ["contractDate", "Contract Date"], ["contractEndDate", "Contract End Date"], ["firstPaymentDate", "First Pay Date"]];
    const normalizedDates: Partial<Record<"startDate" | "contractDate" | "contractEndDate" | "firstPaymentDate", string>> = {};
    for (const [key, label] of dateFields) {
      const normalized = parseAndFormatDate(form[key]);
      if (!normalized) {
        setError(`${label} is required. Type DD/MM/YYYY${key === "startDate" ? " HH:mm:ss" : ""}, YYYY-MM-DD, or select it from the calendar.`);
        return;
      }
      normalizedDates[key] = normalized;
    }
    if (isRealEstate) {
      normalizedDates.contractDate = normalizedDates.startDate;
      normalizedDates.contractEndDate = normalizedDates.firstPaymentDate;
    }
    if (!isRealEstate && normalizedDates.contractEndDate! < normalizedDates.contractDate!) {
      setError("Contract End Date cannot be before Contract Date.");
      return;
    }
    if (normalizedDates.firstPaymentDate! < normalizedDates.startDate!) {
      setError("First Pay Date cannot be before Date.");
      return;
    }
    const normalizedForm: EnhancedLoanFormState = { ...form, ...normalizedDates };
    setSaving(true);
    setError(null);
    try {
      const savedLoan = await api<LoanEntity>(loan ? "/api/loan/loans/" + loan.id : "/api/loan/loans", {
        method: loan ? "PUT" : "POST",
        body: JSON.stringify(toLoanPayload(normalizedForm)),
      });
      if (!loan && pendingActivities.length) {
        const results = await Promise.allSettled(pendingActivities.slice().reverse().map((activity) => api<LoanActivity>(`/api/loan/loans/${savedLoan.id}/activities`, {
          method: "POST",
          body: JSON.stringify({ type: activity.type, body: activity.body, scheduledFor: activity.scheduledFor, attachmentName: activity.attachmentName, attachmentUrl: activity.attachmentUrl }),
        })));
        if (results.some((result) => result.status === "rejected")) toastError("The loan was saved, but one or more activity items could not be saved.");
      }
      if (!loan && draftFollowing) {
        await api<{ followerCount: number; following: boolean }>(`/api/loan/loans/${savedLoan.id}/activities`, { method: "POST", body: JSON.stringify({ action: "follow", following: true }) });
      }
      await onSaved();
      toastSuccess("Loan saved successfully.");
      onClose();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Could not save the loan application";
      setError(message);
      toastError(message);
    } finally {
      setSaving(false);
    }
  };

  const visibleActivities = [...pendingActivities, ...activityFeed.activities];
  const activityAttachmentCount = visibleActivities.filter((item) => item.type === "attachment").length;
  const currentFormStatus = loan?.repaymentStatus || "Draft";
  const formStatusSteps: LoanEntity["repaymentStatus"][] = ["Draft", "Waiting", "Progress"];
  if (!formStatusSteps.includes(currentFormStatus)) formStatusSteps.push(currentFormStatus);
  const selectPopulatedField = (target: EventTarget) => {
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) || !target.value || target.disabled || target.readOnly) return;
    window.requestAnimationFrame(() => {
      if (document.activeElement !== target) return;
      try { target.select(); } catch { /* Some specialized input types do not expose a text selection. */ }
    });
  };

  return (
    <div className="overflow-visible rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <CountrySearchModal open={countrySearchModalOpen} onClose={closeCountrySearch} onSelect={selectCountryFromSearch} title={countrySearchModalTitle} />
      {customerCategoryEditorOpen ? (
        <div role="dialog" aria-modal="true" aria-labelledby="customer-category-editor-title" className="fixed inset-0 z-[110] flex items-start justify-center bg-slate-950/55 p-2 pt-8 sm:p-4 sm:pt-12">
          <div className="w-full max-w-7xl overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-800"><h3 id="customer-category-editor-title" className="text-2xl font-bold text-slate-900 dark:text-white">Create: Category</h3><button type="button" onClick={closeCustomerCategoryEditor} aria-label="Close category editor" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-6 w-6" /></button></div>
            <div className="loan-primary-fields min-h-64 px-6 py-10">
              <div className="grid gap-x-16 gap-y-6 lg:grid-cols-2">
                <div className="space-y-6">
                  <div className="loan-form-row"><label htmlFor="customer-category-name">Tag Name</label><div className="flex items-center gap-3"><input id="customer-category-name" autoFocus className={inputClass} value={customerCategoryDraft.name} onChange={(event) => setCustomerCategoryDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Tag Name" /><span className="shrink-0 text-base font-semibold text-slate-700 dark:text-slate-200">EN</span></div></div>
                  <div className="loan-form-row"><label>Parent Category</label><CustomerCategoryPicker value={customerCategoryDraft.parent} options={customerCategoryOptions.filter((category) => category.name !== customerCategoryDraft.name)} onChange={(value) => setCustomerCategoryDraft((current) => ({ ...current, parent: value }))} onCreate={openCustomerParentCategoryEditor} placeholder="Parent Category" /></div>
                </div>
                <label className="flex cursor-pointer items-start gap-5 text-base font-bold text-slate-700 dark:text-slate-200"><span>Active</span><input type="checkbox" checked={customerCategoryDraft.active} onChange={(event) => setCustomerCategoryDraft((current) => ({ ...current, active: event.target.checked }))} className="peer sr-only" /><span className={`flex h-7 w-7 items-center justify-center border-2 ${customerCategoryDraft.active ? "border-emerald-700 text-emerald-700" : "border-slate-500 text-transparent"} peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-emerald-600`}>{customerCategoryDraft.active ? <Check className="h-6 w-6 stroke-[2.5]" /> : null}</span></label>
              </div>
            </div>
            <div className="flex gap-2 border-t border-slate-200 px-6 py-5 dark:border-slate-800"><button type="button" disabled={!customerCategoryDraft.name.trim()} onClick={saveCustomerCategory} className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">Save</button><button type="button" onClick={closeCustomerCategoryEditor} className="rounded-full bg-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200">Discard</button></div>
          </div>
        </div>
      ) : null}
      {customerParentCategoryEditorOpen ? (
        <div role="dialog" aria-modal="true" aria-labelledby="customer-parent-category-editor-title" className="fixed inset-0 z-[120] flex items-start justify-center bg-slate-950/60 p-2 pt-8 sm:p-4 sm:pt-12">
          <div className="w-full max-w-7xl overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-800"><h3 id="customer-parent-category-editor-title" className="text-2xl font-bold text-slate-900 dark:text-white">Create: Parent Category</h3><button type="button" onClick={() => setCustomerParentCategoryEditorOpen(false)} aria-label="Close parent category editor" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-6 w-6" /></button></div>
            <div className="loan-primary-fields min-h-64 px-6 py-10">
              <div className="grid gap-x-16 gap-y-6 lg:grid-cols-2">
                <div className="space-y-6">
                  <div className="loan-form-row"><label htmlFor="customer-parent-category-name">Tag Name</label><div className="flex items-center gap-3"><input id="customer-parent-category-name" autoFocus className={inputClass} value={customerParentCategoryDraft.name} onChange={(event) => setCustomerParentCategoryDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Tag Name" /><span className="shrink-0 text-base font-semibold text-slate-700 dark:text-slate-200">EN</span></div></div>
                  <div className="loan-form-row"><label htmlFor="customer-parent-category-parent">Parent Category</label><div className="relative"><select id="customer-parent-category-parent" className={`${inputClass} appearance-none pr-10`} value={customerParentCategoryDraft.parent} onChange={(event) => setCustomerParentCategoryDraft((current) => ({ ...current, parent: event.target.value }))}><option value="">Parent Category</option>{customerCategoryOptions.filter((category) => category.active && category.name !== customerParentCategoryDraft.name).map((category) => <option key={category.name} value={category.name}>{category.name}</option>)}</select><ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /></div></div>
                </div>
                <label className="flex cursor-pointer items-start gap-5 text-base font-bold text-slate-700 dark:text-slate-200"><span>Active</span><input type="checkbox" checked={customerParentCategoryDraft.active} onChange={(event) => setCustomerParentCategoryDraft((current) => ({ ...current, active: event.target.checked }))} className="peer sr-only" /><span className={`flex h-7 w-7 items-center justify-center border-2 ${customerParentCategoryDraft.active ? "border-emerald-700 text-emerald-700" : "border-slate-500 text-transparent"} peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-emerald-600`}>{customerParentCategoryDraft.active ? <Check className="h-6 w-6 stroke-[2.5]" /> : null}</span></label>
              </div>
            </div>
            <div className="flex gap-2 border-t border-slate-200 px-6 py-5 dark:border-slate-800"><button type="button" disabled={!customerParentCategoryDraft.name.trim()} onClick={saveCustomerParentCategory} className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">Save</button><button type="button" onClick={() => setCustomerParentCategoryEditorOpen(false)} className="rounded-full bg-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200">Discard</button></div>
          </div>
        </div>
      ) : null}
      <div className="border-b border-slate-200 px-5 py-5 dark:border-slate-800 sm:px-7">
        <div className="flex flex-wrap items-center gap-2 text-2xl font-medium tracking-tight text-slate-800 dark:text-slate-100">
          <button type="button" onClick={onClose} className="hover:text-emerald-700 dark:hover:text-emerald-300">Dashboard Action</button><span className="text-slate-400">/</span><button type="button" onClick={onClose} className="hover:text-emerald-700 dark:hover:text-emerald-300">Loans</button><span className="text-slate-400">/</span><span>{loan?.loanNumber || "New"}</span>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button type="submit" form="loan-form" disabled={saving} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save</button>
          <button type="button" onClick={onClose} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"><RefreshCw className="h-4 w-4" /> Discard</button>
        </div>
      </div>

      <div className="p-5 sm:p-7">
        <div className="mb-12 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <button type="submit" form="loan-form" disabled={saving} className="inline-flex min-h-11 self-start items-center rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60">Submit</button>
          <div className="inline-flex self-start overflow-hidden rounded-full border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-950" aria-label={`Loan status: ${currentFormStatus}`}>
            {formStatusSteps.map((status) => <div key={status} className={`rounded-full px-5 py-2.5 text-sm font-semibold ${currentFormStatus === status ? "bg-emerald-600 text-white" : "text-slate-600 dark:text-slate-300"}`}>{status}</div>)}
          </div>
        </div>
        <h1 className="mb-8 text-3xl font-medium tracking-tight text-slate-900 dark:text-white">{loan ? loan.loanNumber || "Draft Loan" : "Draft Loan"}</h1>
        <form id="loan-form" onSubmit={submit} onFocusCapture={(event) => selectPopulatedField(event.target)} className="space-y-6">
          {error ? <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{error}</p> : null}

          <div className="loan-primary-fields">
            <div className="grid grid-cols-1 gap-x-16 gap-y-5 xl:grid-cols-2">
              <div className="grid grid-cols-1 content-start gap-5">
                <Field label="Customer" className="loan-form-row">
                  <div className="relative">
                    <input
                      className={`${inputClass} pr-10`}
                      value={form.fullName}
                      onChange={changeCustomer}
                      onFocus={() => { setCustomerSearchAll(true); setCustomerPickerOpen(true); }}
                      onBlur={() => window.setTimeout(() => setCustomerPickerOpen(false), 160)}
                      placeholder="Type a customer name or select a saved customer"
                      autoComplete="off"
                    />
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                    {customerPickerOpen ? (
                      <div className="absolute z-30 mt-1.5 flex max-h-72 w-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-950">
                        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                          {customerLoading ? <p className="flex items-center gap-2 px-3 py-2.5 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Finding saved customers…</p> : null}
                          {!customerLoading && customerSuggestions.map((borrower) => (
                            <button
                              key={borrower.id}
                              type="button"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => selectCustomer(borrower)}
                              className="block w-full rounded-lg px-3 py-2.5 text-left transition hover:bg-emerald-50 focus:bg-emerald-50 dark:hover:bg-emerald-500/10 dark:focus:bg-emerald-500/10"
                            >
                              <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">{borrower.fullName}</span>
                              <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">{[borrower.phone, borrower.email, borrower.nationalId].filter(Boolean).join(" · ") || "Saved customer"}</span>
                            </button>
                          ))}
                          {!customerLoading && customerSuggestions.length === 0 ? <p className="px-3 py-2.5 text-sm text-slate-500">No saved customer found. Keep typing to create a new customer.</p> : null}
                        </div>
                        <div className="mt-1 shrink-0 border-t border-slate-100 bg-white pt-1 dark:border-slate-800 dark:bg-slate-950">
                          <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { setCustomerPickerOpen(false); setCustomerSearchText(""); setCustomerSearchModalOpen(true); }} className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-500/10">Search More…</button>
                          {form.fullName.trim() ? <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => setCustomerPickerOpen(false)} className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-500/10">Use “{form.fullName.trim()}” as a new customer</button> : null}
                          <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={openCustomerEditor} className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-500/10">Create and Edit…</button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500">Type by hand or choose a remembered customer. Selecting one reuses their saved customer record.</p>
                </Field>
                <Field label="Transection No" className="loan-form-row"><input className={inputClass} value={form.transactionNo} onChange={set("transactionNo")} placeholder="Transection No" /></Field>
                <Field label="Loan Type" className="loan-form-row">
                  <div className="flex items-start gap-2">
                    <div className="relative min-w-0 flex-1">
                      <input
                        aria-label="Loan Type"
                        ref={loanTypeInputRef}
                        className={`${inputClass} pr-10`}
                        value={form.loanType}
                        onChange={(event) => { set("loanType")(event); setLoanTypeSearchAll(false); setLoanTypePickerOpen(true); }}
                        onFocus={() => { setLoanTypeSearchAll(true); setLoanTypePickerOpen(true); }}
                        onBlur={() => window.setTimeout(() => setLoanTypePickerOpen(false), 160)}
                        placeholder="Type or select a loan type"
                        autoComplete="off"
                      />
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                      {loanTypePickerOpen ? (
                        <div className="absolute z-20 mt-1.5 flex max-h-64 w-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-950">
                        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                          {loanTypeLoading ? <p className="flex items-center gap-2 px-3 py-2.5 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading loan types…</p> : null}
                          {!loanTypeLoading && loanTypeSuggestions.map((loanType) => <button key={loanType} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { setForm((current) => ({ ...current, loanType })); setLoanTypePickerOpen(false); }} className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-800 transition hover:bg-emerald-50 dark:text-slate-100 dark:hover:bg-emerald-500/10">{loanType}</button>)}
                          {!loanTypeLoading && loanTypeSuggestions.length === 0 ? <p className="px-3 py-2.5 text-sm text-slate-500">No saved loan type matches this text.</p> : null}
                        </div>
                        <div className="mt-1 shrink-0 border-t border-slate-100 bg-white pt-1 dark:border-slate-800 dark:bg-slate-950">
                          <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { setLoanTypePickerOpen(false); setLoanTypeSearchText(""); setLoanTypeSearchModalOpen(true); }} className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-500/10">Search More…</button>
                          {form.loanType.trim() && !loanTypeSuggestions.some((type) => type.toLowerCase() === form.loanType.trim().toLowerCase()) ? <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => setLoanTypePickerOpen(false)} className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-500/10">Use “{form.loanType.trim()}” as a new loan type</button> : null}
                          <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={openLoanTypeEditor} className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-500/10">Create and Edit…</button>
                        </div>
                        </div>
                      ) : null}
                    </div>
                    <button type="button" disabled={!form.loanType.trim()} onMouseDown={(event) => event.preventDefault()} onClick={(event) => { event.preventDefault(); event.stopPropagation(); void openSelectedLoanTypeEditor(); }} title="Open Loan Type" aria-label="Open selected loan type" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-300"><ArrowRight className="h-4 w-4" /></button>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500">Type a custom loan type or select one your organisation has used before.</p>
                </Field>
                {renderDateField("Date", "startDate")}
                {form.loanType.trim().toLowerCase() === "real estate" ? (
                  <Field label="Contract Date (Lunar)" className="loan-form-row">
                    <input className={inputClass} inputMode="numeric" value={form.contractDateLunar} onChange={(event) => setForm((current) => ({ ...current, contractDateLunar: numericDateDisplayValue(event.target.value) }))} placeholder="DD/MM/YYYY" />
                  </Field>
                ) : (
                  <>
                    {renderDateField("Contract Date", "contractDate")}
                    {renderDateField("Contract End Date", "contractEndDate")}
                  </>
                )}
                {renderDateField("First Pay Date", "firstPaymentDate")}
                <p className="pl-[calc(9rem+1.5rem)] text-xs text-slate-500">Type dates as <span className="font-semibold">DD/MM/YYYY</span>. The main Date also accepts and displays <span className="font-semibold">HH:mm:ss</span>.</p>
              </div>
              <div className="grid grid-cols-1 content-start gap-5">
                <Field label="Loan Amount" className="loan-form-row"><div className="relative"><CircleDollarSign className="pointer-events-none absolute left-1 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" /><input aria-label="Loan Amount USD" type="number" min="0" step="0.01" inputMode="decimal" className={`${inputClass} pl-7`} value={form.principal} onChange={set("principal")} placeholder="0.00" /></div></Field>
                <Field label="Loan Amount KHR" className="loan-form-row"><input aria-label="Loan Amount KHR in Khmer words" type="text" inputMode="text" lang="km" maxLength={500} className={inputClass} value={form.loanAmountKHR} onChange={set("loanAmountKHR")} placeholder="Loan Amount KHR" /></Field>
                <Field label="First Amount C-TR" className="loan-form-row"><input className={inputClass} value={form.firstAmountCTR} onChange={set("firstAmountCTR")} placeholder="0.00" /></Field>
                <Field label="Amount to Pay (KHR)" className="loan-form-row"><input className={inputClass} value={form.loanInformation.amountToPayKHR} onChange={setLoanInformation("amountToPayKHR")} placeholder="Amount to Pay (KHR)" /></Field>
                <Field label="Formula" className="loan-form-row">
                  <div className="relative"><input aria-label="Formula" list="loan-formula-options" className={`${inputClass} pr-10`} value={form.formula} onChange={set("formula")} placeholder="Select or type a formula" autoComplete="off" /><ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" /></div>
                  <datalist id="loan-formula-options">{FORMULA_OPTIONS.map((formula) => <option key={formula} value={formula} />)}</datalist>
                  <p className="mt-1.5 text-xs text-slate-500">Select an old formula or type a custom name. Custom formulas use the Fixed repayment calculation.</p>
                </Field>
                <div className="loan-form-row">
                  <span className="text-sm text-slate-700 dark:text-slate-300">Rate (%)</span>
                  <div className="grid grid-cols-2 gap-3"><input aria-label="Rate percentage" type="number" min="0" max="100" step="0.01" className={inputClass} value={form.interestRate} onChange={set("interestRate")} placeholder="0.00" /><div className="relative"><select aria-label="Rate period" className={`${inputClass} appearance-none pr-10`} value={form.ratePeriod} onChange={set("ratePeriod")}><option>Annually</option><option>Monthly</option><option>Weekly</option><option>Daily</option></select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" /></div></div>
                </div>
                <Field label="Rate KHR" className="loan-form-row"><input className={inputClass} value={form.rateKHR} onChange={set("rateKHR")} placeholder="Rate KHR" /></Field>
                <div className="loan-form-row">
                  <span className="text-sm text-slate-700 dark:text-slate-300">Loan Term</span>
                  <div className="grid grid-cols-2 gap-3"><input aria-label="Loan term" type="number" min="0" className={inputClass} value={form.termMonths} onChange={set("termMonths")} placeholder="0" /><div className="relative"><select aria-label="Term unit" className={`${inputClass} appearance-none pr-10`} value={form.termUnit} onChange={set("termUnit")}><option>Days</option><option>Weeks</option><option>Months</option><option>Years</option></select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" /></div></div>
                </div>
                <Field label="Payback" className="loan-form-row"><div className="relative"><select aria-label="Payback" className={`${inputClass} appearance-none pr-10`} value={form.payback} onChange={set("payback")}><option value="" disabled>Select payback frequency</option>{PAYBACK_OPTIONS.map((payback) => <option key={payback}>{payback}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" /></div></Field>
              </div>
            </div>
          </div>

          <div className="mt-12 bg-white dark:bg-slate-950">
            <div className="flex overflow-x-auto border-b border-slate-200 dark:border-slate-800">
              {[
                "Schedules",
                "Loan Informations",
                "Collaterals",
                "Approvals",
                "Contacts",
                "Accounting",
                "Other Info",
              ].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab as typeof activeTab)}
                  className={`whitespace-nowrap border px-4 py-3 text-sm font-medium transition ${activeTab === tab ? "-mb-px border-b-white border-emerald-600 bg-white text-slate-900 dark:border-b-slate-950 dark:bg-slate-950 dark:text-white" : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"}`}>
                  {tab}
                </button>
              ))}
            </div>
            <div className="overflow-hidden rounded-b-2xl border border-t-0 border-slate-200 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-500">
              {activeTab === "Schedules" ? (
                <div className="overflow-x-auto">
                  <table className="min-w-[860px] w-full table-fixed text-left">
                    <thead className="bg-slate-100 font-semibold text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                      <tr><th className="px-4 py-4">Date</th><th className="px-4 py-4">Number Of Days</th><th className="px-4 py-4 text-right">Outstanding</th><th className="px-4 py-4 text-right">Principle</th><th className="px-4 py-4 text-right">Interest</th><th className="px-4 py-4 text-right">Amount To Pay</th><th className="px-4 py-4 text-right">Balance</th><th className="w-10 px-3 py-4"><MoreVertical className="h-4 w-4" /></th></tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: 4 }, (_, index) => <tr key={index} className="h-11 border-t border-slate-100 dark:border-slate-800"><td colSpan={8} /></tr>)}
                    </tbody>
                    <tfoot className="border-t border-slate-200 bg-slate-50 font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                      <tr><td colSpan={3} className="px-4 py-3" /><td className="px-4 py-3 text-right">0.00</td><td className="px-4 py-3 text-right">0.00</td><td className="px-4 py-3 text-right">0.00</td><td colSpan={2} className="px-4 py-3" /></tr>
                    </tfoot>
                  </table>
                  <dl className="ml-auto grid max-w-sm grid-cols-[1fr_auto] gap-x-6 gap-y-2 border-t border-slate-200 px-5 py-5 text-sm dark:border-slate-800">
                    <dt className="text-right font-semibold text-slate-700 dark:text-slate-200">Orig. Amount Paid:</dt><dd className="text-right font-medium text-slate-700 dark:text-slate-200">{formatCurrency(loan ? Math.max(0, loan.totalPayable - loan.outstandingBalance) : 0)}</dd>
                    <dt className="text-right font-semibold text-slate-700 dark:text-slate-200">Orig. Balance:</dt><dd className="text-right font-medium text-slate-700 dark:text-slate-200">{formatCurrency(loan?.outstandingBalance || 0)}</dd>
                  </dl>
                </div>
              ) : activeTab === "Loan Informations" ? (
                <div className="space-y-5 bg-slate-50/60 p-4 dark:bg-slate-950/40 sm:p-5">
                  <div className="grid gap-5 xl:grid-cols-2">
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                      <div className="mb-4 border-b border-slate-100 pb-3 dark:border-slate-800"><h3 className="font-bold text-slate-900 dark:text-white">Loan</h3><p className="mt-1 text-xs text-slate-500">Base and refinanced amounts for this application.</p></div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Loan Amount"><div className="relative"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">$</span><input type="number" min="0" step="0.01" inputMode="decimal" className={`${inputClass} pl-7`} value={form.principal} onChange={set("principal")} placeholder="0.00" /></div></Field>
                        {renderLoanInformationAmount("Refinance Amount", "refinanceAmount")}
                      </div>
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                      <div className="mb-4 flex items-end justify-between gap-4 border-b border-slate-100 pb-3 dark:border-slate-800"><div><h3 className="font-bold text-slate-900 dark:text-white">Loan Fees</h3><p className="mt-1 text-xs text-slate-500">Charges included with this loan.</p></div><span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{formatCurrency(loanInformationFees)}</span></div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        {renderLoanInformationAmount("Road Tax Fee", "roadTaxFee")}
                        {renderLoanInformationAmount("Vehicle Inspection Fee", "vehicleInspectionFee")}
                        {renderLoanInformationAmount("Tax Stamp Fee", "taxStampFee")}
                        {renderLoanInformationAmount("Admin Fee", "adminFee")}
                        {renderLoanInformationAmount("Withholding Fee", "withholdingFee")}
                        {renderLoanInformationAmount("Collateral Check Fee", "collateralCheckFee")}
                        {renderLoanInformationAmount("Loan Fee", "loanFee")}
                        <Field label="Source Loan">
                          <div className="relative">
                            <input
                              className={`${inputClass} pr-10`}
                              value={form.loanInformation.sourceLoan}
                              onChange={(event) => { setLoanInformation("sourceLoan")(event); setSourceLoanPickerOpen(true); }}
                              onFocus={() => setSourceLoanPickerOpen(true)}
                              placeholder="Select or type a loan number"
                              autoComplete="off"
                              role="combobox"
                              aria-expanded={sourceLoanPickerOpen}
                              aria-controls="source-loan-options"
                            />
                            <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => setSourceLoanPickerOpen((open) => !open)} aria-label="Show source loans" className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><ChevronDown className="h-4 w-4" /></button>
                            {sourceLoanPickerOpen ? (
                              <div id="source-loan-options" role="listbox" className="absolute right-0 top-[calc(100%+0.35rem)] z-40 w-full min-w-[320px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950">
                                <div className="max-h-72 overflow-y-auto p-1">
                                  {sourceLoanLoading ? <p className="flex items-center justify-center px-3 py-5 text-sm text-slate-500"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading loans…</p> : null}
                                  {!sourceLoanLoading && sourceLoanOptions.slice(0, 7).map((source) => <button key={source.id} type="button" role="option" aria-selected={source.loanNumber === form.loanInformation.sourceLoan} onMouseDown={(event) => event.preventDefault()} onClick={() => selectSourceLoan(source)} className="block w-full rounded-lg px-3 py-2.5 text-left hover:bg-emerald-50 dark:hover:bg-emerald-500/10"><span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">{source.loanNumber}</span><span className="mt-0.5 block truncate text-xs text-slate-500">{source.borrower.fullName} · {formatCurrency(source.principal)}</span></button>)}
                                  {!sourceLoanLoading && sourceLoanOptions.length === 0 ? <p className="px-3 py-5 text-center text-sm text-slate-500">No matching source loans.</p> : null}
                                </div>
                                <div className="border-t border-slate-200 p-1 dark:border-slate-800">
                                  <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { setSourceLoanPickerOpen(false); setSourceLoanSearchText(form.loanInformation.sourceLoan); setSourceLoanSearchModalOpen(true); }} className="block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-500/10">Search More…</button>
                                  <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={openSourceLoanWorkspace} className="block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-500/10">Create and Edit…</button>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </Field>
                      </div>
                    </section>
                  </div>

                  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="mb-4 border-b border-slate-100 pb-3 dark:border-slate-800"><h3 className="font-bold text-slate-900 dark:text-white">Repayments</h3><p className="mt-1 text-xs text-slate-500">Calculated obligations and recorded payments.</p></div>
                    <div className="grid gap-5 lg:grid-cols-2">
                      <dl className="grid gap-2">
                        {loanInformationMetric("Principal", informationPrincipal)}
                        {loanInformationMetric("Interest", projectedInterest)}
                        {loanInformationMetric("Penalty", 0)}
                        {loanInformationMetric("Fee Charge", loanInformationFees)}
                        {loanInformationMetric("Total", informationTotal, true)}
                      </dl>
                      <dl className="grid gap-2">
                        {loanInformationMetric("Principal Paid", principalPaid)}
                        {loanInformationMetric("Interest Paid", interestPaid)}
                        {loanInformationMetric("Penalty Paid", 0)}
                        {loanInformationMetric("Fee Charge Paid", feePaid)}
                        {loanInformationMetric("Paid", informationPaid, true)}
                        {loanInformationMetric("Balance", informationBalance, true)}
                      </dl>
                    </div>
                  </section>

                  <div className="grid gap-5 xl:grid-cols-2">
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                      <div className="mb-4 border-b border-slate-100 pb-3 dark:border-slate-800"><h3 className="font-bold text-slate-900 dark:text-white">Balance</h3><p className="mt-1 text-xs text-slate-500">Remaining amount by component.</p></div>
                      <dl className="grid gap-2">
                        {loanInformationMetric("Principal Balance", principalBalance)}
                        {loanInformationMetric("Interest Balance", interestBalance)}
                        {loanInformationMetric("Penalty Balance", 0)}
                        {loanInformationMetric("Fee Balance", feeBalance)}
                        {loanInformationMetric("Balance", informationBalance, true)}
                      </dl>
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                      <div className="mb-4 border-b border-slate-100 pb-3 dark:border-slate-800"><h3 className="font-bold text-slate-900 dark:text-white">Configurations</h3><p className="mt-1 text-xs text-slate-500">Rules inherited from the selected loan type.</p></div>
                      <div className="grid gap-4">
                        <Field label="Contract Terms"><div className="flex items-center gap-2"><input readOnly className={`${inputClass} bg-slate-50 dark:bg-slate-950`} value={contractTerms} /><button type="button" onClick={() => void openSelectedLoanTypeEditor()} aria-label="Open contract terms" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:border-emerald-300 hover:text-emerald-700 dark:border-slate-700"><ArrowRight className="h-4 w-4" /></button></div></Field>
                        <Field label="Penalty Rule"><select className={`${inputClass} appearance-none`} value={form.loanInformation.penaltyRule} onChange={setLoanInformation("penaltyRule")}><option value="">No penalty rule</option><option>Fixed penalty</option><option>Daily percentage</option><option>Grace period penalty</option></select></Field>
                        <Field label="Fee Charge"><select className={`${inputClass} appearance-none`} value={form.loanInformation.feeCharge} onChange={setLoanInformation("feeCharge")}><option value="">No fee charge rule</option><option>Upfront</option><option>Finance with loan</option><option>Deduct from disbursement</option></select></Field>
                      </div>
                    </section>
                  </div>
                </div>
              ) : activeTab === "Contacts" ? (
                <div className="space-y-5 bg-slate-50/60 p-4 dark:bg-slate-950/40 sm:p-5">
                  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white">Loan team</h3>
                        <p className="mt-1 text-xs text-slate-500">Assign responsibility for approval, servicing, and collection.</p>
                      </div>
                      {loanContactsLoading ? <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500"><Loader2 className="h-3.5 w-3.5 animate-spin" />Loading contacts…</span> : null}
                    </div>
                    <div className="grid gap-4 md:grid-cols-3">
                      {([
                        ["BM", "bm", "Select branch manager"],
                        ["Collection Officer", "collectionOfficer", "Select collection officer"],
                        ["Loan Specialist", "loanSpecialist", "Select loan specialist"],
                      ] as const).map(([label, key, placeholder]) => (
                        <Field key={key} label={label}>
                          <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                            <input
                              className={`${inputClass} pl-9 pr-20`}
                              value={loanTeamPickerKey === key ? loanTeamSearch[key] : loanContactStaffOptions.find((option) => option.username === form.loanContacts[key]) ? loanTeamOptionLabel(loanContactStaffOptions.find((option) => option.username === form.loanContacts[key])!) : ""}
                              onFocus={(event) => {
                                const input = event.currentTarget;
                                const selected = loanContactStaffOptions.find((option) => option.username === form.loanContacts[key]);
                                setLoanTeamSearch((current) => ({ ...current, [key]: selected ? loanTeamOptionLabel(selected) : "" }));
                                setLoanTeamPickerKey(key);
                                window.requestAnimationFrame(() => input.select());
                              }}
                              onBlur={() => window.setTimeout(() => setLoanTeamPickerKey((current) => current === key ? null : current), 160)}
                              onChange={(event) => {
                                setLoanTeamSearch((current) => ({ ...current, [key]: event.target.value }));
                                setLoanTeamPickerKey(key);
                              }}
                              placeholder={placeholder}
                              autoComplete="off"
                              role="combobox"
                              aria-expanded={loanTeamPickerKey === key}
                              aria-controls={`loan-team-options-${key}`}
                            />
                            <ChevronDown className="pointer-events-none absolute right-11 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                            <button type="button" disabled={!form.loanContacts[key]} onMouseDown={(event) => event.preventDefault()} onClick={() => openLoanTeamMemberEditor(key)} title={`Open ${label}`} aria-label={`Open selected ${label}`} className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-300"><ArrowRight className="h-4 w-4" /></button>
                            {loanTeamPickerKey === key ? (
                              <div id={`loan-team-options-${key}`} className="absolute left-0 top-[calc(100%+0.4rem)] z-40 w-full min-w-72 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950">
                                <div className="max-h-64 overflow-y-auto p-1">
                                  {loanContactStaffOptions.filter((option) => {
                                    const query = loanTeamSearch[key].trim().toLowerCase();
                                    return !query || [option.full_name, option.username, option.role].some((value) => value?.toLowerCase().includes(query));
                                  }).map((option) => (
                                    <button key={`${key}-${option.username}`} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => selectLoanTeamMember(key, option)} className="block w-full rounded-lg px-3 py-2.5 text-left transition hover:bg-emerald-50 focus:bg-emerald-50 dark:hover:bg-emerald-500/10 dark:focus:bg-emerald-500/10">
                                      <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">{option.full_name?.trim() || option.username}</span>
                                      <span className="mt-0.5 block text-xs text-slate-500">{[option.username, option.role].filter(Boolean).join(" · ")}</span>
                                    </button>
                                  ))}
                                  {!loanContactStaffOptions.some((option) => {
                                    const query = loanTeamSearch[key].trim().toLowerCase();
                                    return !query || [option.full_name, option.username, option.role].some((value) => value?.toLowerCase().includes(query));
                                  }) ? <p className="px-3 py-5 text-center text-sm text-slate-500">No staff member matches your search.</p> : null}
                                </div>
                                {form.loanContacts[key] ? <div className="border-t border-slate-200 p-1 dark:border-slate-800"><button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { updateLoanContactAssignment(key, ""); setLoanTeamSearch((current) => ({ ...current, [key]: "" })); setLoanTeamPickerKey(null); }} className="block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900">Clear selection</button></div> : null}
                              </div>
                            ) : null}
                          </div>
                        </Field>
                      ))}
                    </div>
                  </section>

                  <datalist id="loan-related-contact-options">
                    {loanContactOptions.map((contact) => <option key={contact.id} value={contact.fullName}>{[contact.phone, contact.email].filter(Boolean).join(" · ")}</option>)}
                  </datalist>

                  <div className="grid gap-5 xl:grid-cols-2">
                    {renderRelatedContacts("Co-Borrower", "coBorrowers")}
                    {renderRelatedContacts("Broker", "brokers")}
                  </div>
                  {renderRelatedContacts("Guarantor", "guarantors", true)}
                </div>
              ) : (
                <p className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">{activeTab} content placeholder</p>
              )}
            </div>
          </div>

          <section aria-label="Loan activity" className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
            <div className="flex flex-col gap-3 border-b border-slate-200 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={activityBusy} onClick={() => { setActivityComposer("message"); setActivityBody(""); }} className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-300"><MessageCircle className="h-4 w-4" />Send Message</button>
                <button type="button" disabled={activityBusy} onClick={() => { setActivityComposer("note"); setActivityBody(""); }} className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-300"><Pencil className="h-4 w-4" />Log Note</button>
                <button type="button" disabled={activityBusy} onClick={() => { setActivityComposer("scheduled"); setActivityBody(""); setActivityScheduledFor(""); }} className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-300"><Clock className="h-4 w-4" />Schedule Activity</button>
              </div>
              <div className="flex items-center gap-5 text-sm font-semibold text-slate-500">
                <button type="button" disabled={activityBusy} onClick={() => activityAttachmentInputRef.current?.click()} title="Attach a file" className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 transition hover:bg-slate-100 hover:text-emerald-700 disabled:opacity-50 dark:hover:bg-slate-800"><Paperclip className="h-4 w-4" />{activityAttachmentCount}</button>
                <input ref={activityAttachmentInputRef} type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt" onChange={(event) => void uploadActivityAttachment(event)} className="hidden" />
                <button type="button" disabled={activityBusy} onClick={() => void toggleLoanFollowing()} className={`rounded-lg px-2 py-1 transition hover:bg-slate-100 dark:hover:bg-slate-800 ${activityFeed.following ? "text-emerald-700 dark:text-emerald-300" : ""}`}>{activityFeed.following ? "Following" : "Follow"}</button>
                <span className="inline-flex items-center gap-1.5"><UserRound className="h-4 w-4" />{activityFeed.followerCount}</span>
              </div>
            </div>
            {activityComposer ? (
              <div className="border-b border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                <div className="mx-auto max-w-3xl">
                  <div className="mb-2 flex items-center justify-between gap-3"><p className="text-sm font-bold text-slate-800 dark:text-slate-100">{activityComposer === "message" ? "Send message" : activityComposer === "note" ? "Log internal note" : "Schedule activity"}</p><button type="button" onClick={() => setActivityComposer(null)} aria-label="Close activity editor" className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800"><X className="h-4 w-4" /></button></div>
                  <textarea autoFocus rows={3} value={activityBody} onChange={(event) => setActivityBody(event.target.value)} placeholder={activityComposer === "message" ? "Write a message for this loan…" : activityComposer === "note" ? "Add an internal note…" : "What needs to be done?"} className={inputClass} />
                  {activityComposer === "scheduled" ? <div className="mt-3 max-w-sm"><Field label="Schedule date and time"><DateInput type="datetime-local" title="Schedule date and time" value={activityScheduledFor} onChange={setActivityScheduledFor} className={inputClass} /></Field></div> : null}
                  <div className="mt-3 flex justify-end gap-2"><button type="button" onClick={() => setActivityComposer(null)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white dark:border-slate-700 dark:text-slate-300">Cancel</button><button type="button" disabled={activityBusy} onClick={() => void saveActivityComposer()} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">{activityBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{activityComposer === "scheduled" ? "Schedule" : "Post"}</button></div>
                </div>
              </div>
            ) : null}
            <div className="px-5 py-6 sm:px-8">
              <div className="flex items-center gap-4 text-sm font-semibold text-slate-600 dark:text-slate-300"><span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" /><span>Today</span><span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" /></div>
              {activityLoading ? <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-emerald-600" /></div> : null}
              {!activityLoading && visibleActivities.length ? <div className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">{visibleActivities.map((item) => {
                const actor = item.actorName || item.createdBy || activityUserName;
                const initials = actor.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || activityInitials;
                return <div key={item.id} className="flex items-start gap-3 py-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-sm font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">{initials}</span><div className="min-w-0 flex-1"><p className="text-sm text-slate-600 dark:text-slate-300"><span className="font-bold text-slate-900 dark:text-white">{actor} ({item.actorRole || "User"})</span><span className="text-slate-400"> — {relativeActivityTime(item.createdAt)}</span>{item.id.startsWith("draft-") ? <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">Pending save</span> : null}</p>{item.type === "attachment" && item.attachmentUrl ? <a href={item.attachmentUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1.5 break-all text-sm font-semibold text-emerald-700 hover:underline dark:text-emerald-300"><Paperclip className="h-4 w-4 shrink-0" />{item.attachmentName || "Attachment"}</a> : <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-400">{item.type === "note" ? "Internal note: " : item.type === "scheduled" ? "Scheduled: " : ""}{item.body}</p>}{item.type === "scheduled" && item.scheduledFor ? <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300"><Clock className="h-3.5 w-3.5" />{new Date(item.scheduledFor).toLocaleString()}</p> : null}</div></div>;
              })}</div> : null}
              {!activityLoading && !visibleActivities.length ? <div className="mt-6 flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-sm font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">{activityInitials}</span><div className="min-w-0"><p className="text-sm text-slate-600 dark:text-slate-300"><span className="font-bold text-slate-900 dark:text-white">{activityUserName} ({activityUserRole})</span><span className="text-slate-400"> — just now</span></p><p className="mt-1 text-sm text-slate-500">{loan ? "Loan record created." : "Creating a new record..."}</p></div></div> : null}
            </div>
          </section>

          {loanTeamEditorKey && loanTeamMemberDraft ? (
            <div role="dialog" aria-modal="true" aria-labelledby="loan-team-editor-title" className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-3 sm:p-6">
              <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                  <div><h3 id="loan-team-editor-title" className="text-xl font-bold text-slate-900 dark:text-white">Open: {loanTeamFieldLabel(loanTeamEditorKey)}</h3><p className="mt-0.5 text-sm text-slate-500">Review or update the selected staff contact.</p></div>
                  <button type="button" onClick={() => { setLoanTeamEditorKey(null); setLoanTeamMemberDraft(null); }} aria-label="Close staff form" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"><X className="h-5 w-5" /></button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-7">
                  <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
                    <div className="grid gap-5 sm:grid-cols-2">
                      <Field label="Name" className="sm:col-span-2"><input autoFocus className={`${inputClass} text-lg font-semibold`} value={loanTeamMemberDraft.full_name} onChange={(event) => setLoanTeamMemberDraft((current) => current ? { ...current, full_name: event.target.value } : current)} placeholder="Staff name" /></Field>
                      <Field label="Email Address" className="sm:col-span-2"><input type="email" className={inputClass} value={loanTeamMemberDraft.email} onChange={(event) => setLoanTeamMemberDraft((current) => current ? { ...current, email: event.target.value } : current)} placeholder="Email address" /></Field>
                      <Field label="Phone"><input className={inputClass} value={loanTeamMemberDraft.phone} onChange={(event) => setLoanTeamMemberDraft((current) => current ? { ...current, phone: event.target.value } : current)} placeholder="Phone" /></Field>
                      <Field label="Mobile"><input className={inputClass} value={loanTeamMemberDraft.mobile} onChange={(event) => setLoanTeamMemberDraft((current) => current ? { ...current, mobile: event.target.value } : current)} placeholder="Mobile" /></Field>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <button type="button" disabled={loanTeamImageUploading} onClick={() => loanTeamImageInputRef.current?.click()} className="group relative flex h-36 w-36 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-400 transition hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-emerald-700" aria-label="Upload staff profile image">
                        {loanTeamMemberDraft.profile_picture ? <span className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${JSON.stringify(loanTeamMemberDraft.profile_picture).slice(1, -1)})` }} /> : <UserRound className="h-14 w-14" />}
                        {loanTeamImageUploading ? <span className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-slate-950/80"><Loader2 className="h-6 w-6 animate-spin text-emerald-600" /></span> : <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-slate-950/65 py-1.5 text-xs font-semibold text-white opacity-0 transition group-hover:opacity-100"><Pencil className="h-3.5 w-3.5" />Change image</span>}
                      </button>
                      <input ref={loanTeamImageInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => void uploadLoanTeamImage(event)} className="hidden" />
                      {loanTeamMemberDraft.profile_picture ? <button type="button" onClick={() => setLoanTeamMemberDraft((current) => current ? { ...current, profile_picture: "" } : current)} className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700"><Trash2 className="h-3.5 w-3.5" />Remove image</button> : <span className="text-xs text-slate-500">Maximum 500 KB</span>}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-800">
                  <button type="button" onClick={() => { setLoanTeamEditorKey(null); setLoanTeamMemberDraft(null); }} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Discard</button>
                  <button type="button" disabled={loanTeamMemberSaving || loanTeamImageUploading} onClick={() => void saveLoanTeamMember()} className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">{loanTeamMemberSaving ? "Saving…" : "Save"}</button>
                </div>
              </div>
            </div>
          ) : null}

          {relatedContactPickerKey && !relatedContactCreatorOpen ? (
            <div role="dialog" aria-modal="true" aria-labelledby="related-contact-picker-title" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-3 sm:p-6">
              <div className="flex max-h-[calc(100vh-1.5rem)] w-full max-w-7xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950 sm:max-h-[calc(100vh-3rem)]">
                <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                  <div><h3 id="related-contact-picker-title" className="text-xl font-bold text-slate-900 dark:text-white">Add: {relatedContactTitle(relatedContactPickerKey)}</h3><p className="mt-0.5 text-sm text-slate-500">Select one or more saved contacts for this loan.</p></div>
                  <button type="button" onClick={() => setRelatedContactPickerKey(null)} aria-label="Close contact selection" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"><X className="h-5 w-5" /></button>
                </div>
                <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-3 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
                  <div className="relative w-full max-w-2xl"><Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input autoFocus className="w-full rounded-full border border-slate-200 bg-white py-2.5 pl-11 pr-4 text-sm text-slate-900 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white" value={relatedContactSearch} onChange={(event) => setRelatedContactSearch(event.target.value)} placeholder="Search name, phone, email, address, or National ID" /></div>
                  <span className="shrink-0 text-sm font-semibold text-slate-500">{filteredRelatedContactOptions.length} contacts</span>
                </div>
                <div className="min-h-0 flex-1 overflow-auto overscroll-contain p-3 sm:p-5">
                  <table className="w-full min-w-[900px] border-separate border-spacing-0 text-left text-sm">
                    <thead className="sticky top-0 z-10 bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300"><tr><th className="w-14 rounded-l-xl px-4 py-3"><input aria-label="Select all visible contacts" type="checkbox" className="h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" checked={filteredRelatedContactOptions.length > 0 && filteredRelatedContactOptions.every((contact) => relatedContactSelection.includes(contact.id))} onChange={(event) => setRelatedContactSelection((current) => event.target.checked ? Array.from(new Set([...current, ...filteredRelatedContactOptions.map((contact) => contact.id)])) : current.filter((id) => !filteredRelatedContactOptions.some((contact) => contact.id === id)))} /></th><th className="px-4 py-3 font-semibold">Name</th><th className="px-4 py-3 font-semibold">Phone</th><th className="px-4 py-3 font-semibold">Email</th><th className="px-4 py-3 font-semibold">Address 1</th><th className="rounded-r-xl px-4 py-3 font-semibold">Address 2</th></tr></thead>
                    <tbody>
                      {loanContactsLoading ? <tr><td colSpan={6} className="px-4 py-14 text-center text-slate-500"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />Loading contacts…</td></tr> : null}
                      {!loanContactsLoading && filteredRelatedContactOptions.map((contact) => {
                        const checked = relatedContactSelection.includes(contact.id);
                        const alreadyAdded = form.loanContacts[relatedContactPickerKey].some((item) => item.contactId === contact.id);
                        return <tr key={contact.id} onClick={() => { if (!alreadyAdded) toggleRelatedContactSelection(contact.id); }} className={`${alreadyAdded ? "cursor-default opacity-55" : "cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-500/10"} text-slate-700 dark:text-slate-200`}><td className="border-b border-slate-200 px-4 py-3.5 dark:border-slate-800"><input aria-label={`Select ${contact.fullName}`} type="checkbox" className="h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" disabled={alreadyAdded} checked={checked || alreadyAdded} onChange={() => toggleRelatedContactSelection(contact.id)} onClick={(event) => event.stopPropagation()} /></td><td className="border-b border-slate-200 px-4 py-3.5 font-semibold dark:border-slate-800">{contact.fullName}{alreadyAdded ? <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500 dark:bg-slate-800">Added</span> : null}</td><td className="border-b border-slate-200 px-4 py-3.5 dark:border-slate-800">{contact.phone || contact.profile.mobile || "—"}</td><td className="border-b border-slate-200 px-4 py-3.5 dark:border-slate-800">{contact.email || "—"}</td><td className="max-w-xs truncate border-b border-slate-200 px-4 py-3.5 dark:border-slate-800">{contact.address || "—"}</td><td className="max-w-xs truncate border-b border-slate-200 px-4 py-3.5 dark:border-slate-800">{contact.profile.address2 || "—"}</td></tr>;
                      })}
                      {!loanContactsLoading && filteredRelatedContactOptions.length === 0 ? <tr><td colSpan={6} className="px-4 py-14 text-center text-slate-500">No contacts match your search.</td></tr> : null}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-slate-500">{relatedContactSelection.length} selected</p><div className="flex flex-wrap gap-2"><button type="button" disabled={relatedContactSelection.length === 0} onClick={selectRelatedContacts} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-45">Select</button><button type="button" onClick={() => openRelatedContactCreator()} className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"><Plus className="h-4 w-4" />Create</button><button type="button" onClick={() => setRelatedContactPickerKey(null)} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Cancel</button></div></div>
              </div>
            </div>
          ) : null}

          {relatedContactCreatorOpen && relatedContactPickerKey ? (
            <div role="dialog" aria-modal="true" aria-labelledby="related-contact-creator-title" className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-3 sm:p-6">
              <div className="flex max-h-[calc(100vh-1.5rem)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950 sm:max-h-[calc(100vh-3rem)]">
                <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800"><div><div className="flex flex-wrap items-center gap-2"><h3 id="related-contact-creator-title" className="text-xl font-bold text-slate-900 dark:text-white">Create contact</h3><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">{relatedContactTitle(relatedContactPickerKey)}</span></div><p className="mt-0.5 text-sm text-slate-500">Create a reusable {relatedContactTitle(relatedContactPickerKey).toLowerCase()} contact.</p></div><button type="button" onClick={closeRelatedContactCreator} aria-label="Close new contact form" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"><X className="h-5 w-5" /></button></div>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5">
                  <div className="grid gap-5 border-b border-slate-200 pb-5 dark:border-slate-800 lg:grid-cols-[1fr_auto]">
                    <div className="space-y-4"><div className="inline-flex w-fit rounded-xl bg-slate-100 p-1 dark:bg-slate-900">{[["customer", "Customer"], ["vendor", "Vendor"], ["customer_vendor", "Customer & Vendor"]].map(([value, label]) => <button key={value} type="button" onClick={() => setRelatedContactDraftProfile("relationship", value)} className={`rounded-lg px-3 py-2 text-sm font-semibold ${relatedContactDraft.profile.relationship === value ? "bg-emerald-600 text-white" : "text-slate-600 dark:text-slate-300"}`}>{label}</button>)}</div><div className="flex gap-5 text-sm font-semibold text-slate-700 dark:text-slate-200"><label className="flex items-center gap-2"><input type="radio" checked={(relatedContactDraft.profile.entityType || "individual") === "individual"} onChange={() => setRelatedContactDraftProfile("entityType", "individual")} />Individual</label><label className="flex items-center gap-2"><input type="radio" checked={relatedContactDraft.profile.entityType === "company"} onChange={() => setRelatedContactDraftProfile("entityType", "company")} />Company</label></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Name"><input className={inputClass} value={relatedContactDraft.fullName} onChange={(event) => setRelatedContactDraft((current) => ({ ...current, fullName: event.target.value }))} placeholder="Contact name" /></Field><Field label="Name (Khmer)"><input className={inputClass} value={relatedContactDraft.profile.nameKhmer || ""} onChange={(event) => setRelatedContactDraftProfile("nameKhmer", event.target.value)} placeholder="ឈ្មោះជាភាសាខ្មែរ" /></Field></div></div>
                    <div className="flex flex-col items-center gap-2"><button type="button" disabled={relatedContactImageUploading} onClick={() => relatedContactImageInputRef.current?.click()} className="group relative flex h-32 w-32 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-400 transition hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-emerald-700" aria-label="Upload contact image">{relatedContactDraft.profile.imageUrl ? <span className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${JSON.stringify(relatedContactDraft.profile.imageUrl).slice(1, -1)})` }} /> : <Camera className="h-9 w-9" />}{relatedContactImageUploading ? <span className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-slate-950/80"><Loader2 className="h-6 w-6 animate-spin text-emerald-600" /></span> : <span className="absolute inset-x-0 bottom-0 bg-slate-950/65 py-1.5 text-center text-xs font-semibold text-white opacity-0 transition group-hover:opacity-100">Choose image</span>}</button><input ref={relatedContactImageInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => void uploadRelatedContactImage(event)} className="hidden" />{relatedContactDraft.profile.imageUrl ? <button type="button" onClick={() => { setRelatedContactDraftProfile("imageUrl", ""); setRelatedContactDraftProfile("imagePublicId", ""); }} className="text-xs font-semibold text-rose-600 hover:text-rose-700">Remove image</button> : <span className="text-xs text-slate-500">JPG, PNG, WebP · max 5 MB</span>}</div>
                  </div>
                  <div className="mt-5 flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-800">{([['general', 'General Information'], ['contacts', 'Contacts & Addresses'], ['sales', 'Sales & Purchase'], ['invoicing', 'Invoicing'], ['map', 'Map'], ['notes', 'Internal Notes']] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setRelatedContactCreatorTab(value)} className={`shrink-0 border-b-2 px-3 py-2.5 text-sm font-semibold ${relatedContactCreatorTab === value ? "border-emerald-600 text-emerald-700 dark:text-emerald-300" : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"}`}>{label}</button>)}</div>
                  {relatedContactCreatorTab === "general" ? <div className="mt-5 grid gap-5 lg:grid-cols-2">
                    <section className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800"><h4 className="mb-4 border-b border-slate-100 pb-3 font-bold text-slate-900 dark:border-slate-800 dark:text-white">General information</h4><div className="grid gap-4 sm:grid-cols-2"><Field label="Company"><div className="relative"><input className={`${inputClass} pr-10`} value={relatedContactDraft.profile.company || ""} onChange={(event) => { setRelatedContactDraftProfile("company", event.target.value); setRelatedCompanyPickerOpen(true); }} onFocus={() => setRelatedCompanyPickerOpen(true)} placeholder="Company" autoComplete="off" role="combobox" aria-expanded={relatedCompanyPickerOpen} aria-controls="related-company-options" /><button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => setRelatedCompanyPickerOpen((open) => !open)} aria-label="Show saved companies" className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><ChevronDown className="h-4 w-4" /></button>{relatedCompanyPickerOpen ? <div id="related-company-options" className="absolute left-0 top-[calc(100%+0.35rem)] z-40 w-full min-w-[320px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950"><div className="max-h-64 overflow-y-auto p-1">{filteredRelatedCompanyOptions.slice(0, 7).map((company) => <button key={company.id} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => selectRelatedCompany(company)} className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 dark:text-slate-200 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-200">{company.fullName}</button>)}{filteredRelatedCompanyOptions.length === 0 ? <p className="px-3 py-4 text-center text-sm text-slate-500">No matching companies.</p> : null}</div><div className="border-t border-slate-200 p-1 dark:border-slate-800"><button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { setRelatedCompanyPickerOpen(false); setRelatedCompanySearchOpen(true); }} className="block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-500/10">Search More…</button><button type="button" onMouseDown={(event) => event.preventDefault()} onClick={openRelatedCompanyCreator} className="block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-500/10">Create and Edit…</button></div></div> : null}</div></Field><Field label="Job position"><input className={inputClass} value={relatedContactDraft.profile.jobPosition || ""} onChange={(event) => setRelatedContactDraftProfile("jobPosition", event.target.value)} placeholder="Job position" /></Field><Field label="Phone"><input className={inputClass} value={relatedContactDraft.phone || ""} onChange={(event) => setRelatedContactDraftField("phone", event.target.value)} placeholder="Phone" /></Field><Field label="Mobile"><input className={inputClass} value={relatedContactDraft.profile.mobile || ""} onChange={(event) => setRelatedContactDraftProfile("mobile", event.target.value)} placeholder="Mobile" /></Field><Field label="Email"><input type="email" className={inputClass} value={relatedContactDraft.email || ""} onChange={(event) => setRelatedContactDraftField("email", event.target.value)} placeholder="Email" /></Field><Field label="Website"><input className={inputClass} value={relatedContactDraft.profile.website || ""} onChange={(event) => setRelatedContactDraftProfile("website", event.target.value)} placeholder="https://example.com" /></Field></div></section>
                    <section className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800"><h4 className="mb-4 border-b border-slate-100 pb-3 font-bold text-slate-900 dark:border-slate-800 dark:text-white">Address & identification</h4><div className="grid gap-4 sm:grid-cols-2"><Field label="Address 1" className="sm:col-span-2"><textarea rows={2} className={inputClass} value={relatedContactDraft.address || ""} onChange={(event) => setRelatedContactDraftField("address", event.target.value)} placeholder="Address 1" /></Field><Field label="Address 2" className="sm:col-span-2"><textarea rows={2} className={inputClass} value={relatedContactDraft.profile.address2 || ""} onChange={(event) => setRelatedContactDraftProfile("address2", event.target.value)} placeholder="Address 2" /></Field><Field label="Country"><input className={inputClass} value={relatedContactDraft.profile.country || ""} onChange={(event) => setRelatedContactDraftProfile("country", event.target.value)} placeholder="Country" /></Field><Field label="National ID"><input className={inputClass} value={relatedContactDraft.nationalId || ""} onChange={(event) => setRelatedContactDraftField("nationalId", event.target.value)} placeholder="Identity card" /></Field><Field label="Date of birth">{renderDateOfBirthField("related-dateOfBirth", "Date of birth", relatedContactDraft.profile.dateOfBirth, (value) => setRelatedContactDraftProfile("dateOfBirth", value))}</Field><Field label="Gender"><select className={inputClass} value={relatedContactDraft.profile.gender || ""} onChange={(event) => setRelatedContactDraftProfile("gender", event.target.value)}><option value="">Select gender</option><option>Female</option><option>Male</option><option>Other</option></select></Field><Field label="Passport"><input className={inputClass} value={relatedContactDraft.profile.passport || ""} onChange={(event) => setRelatedContactDraftProfile("passport", event.target.value)} placeholder="Passport" /></Field><Field label="Nationality"><input className={inputClass} value={relatedContactDraft.profile.nationality || ""} onChange={(event) => setRelatedContactDraftProfile("nationality", event.target.value)} placeholder="Nationality" /></Field><Field label="Tax ID"><input className={inputClass} value={relatedContactDraft.profile.taxId || ""} onChange={(event) => setRelatedContactDraftProfile("taxId", event.target.value)} placeholder="Tax ID" /></Field><Field label="Tax type"><input className={inputClass} value={relatedContactDraft.profile.taxType || ""} onChange={(event) => setRelatedContactDraftProfile("taxType", event.target.value)} placeholder="Tax type" /></Field></div></section>
                  </div> : null}

                  {relatedContactCreatorTab === "contacts" ? <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800"><div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800"><div><h4 className="font-bold text-slate-900 dark:text-white">Contacts & Addresses</h4><p className="mt-0.5 text-xs text-slate-500">Additional people and locations related to this contact.</p></div><button type="button" onClick={() => setRelatedContactProfileRows("additionalContacts", [...relatedAddressRows, { name: "", phone: "", email: "", address: "" }])} className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300"><Plus className="h-4 w-4" />Add</button></div><div className="space-y-3 p-4">{relatedAddressRows.map((row, index) => <div key={`contact-address-${index}`} className="grid gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-900 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1.4fr_auto]"><input aria-label="Contact name" className={inputClass} value={row.name} onChange={(event) => setRelatedContactProfileRows("additionalContacts", relatedAddressRows.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item))} placeholder="Name" /><input aria-label="Contact phone" className={inputClass} value={row.phone} onChange={(event) => setRelatedContactProfileRows("additionalContacts", relatedAddressRows.map((item, itemIndex) => itemIndex === index ? { ...item, phone: event.target.value } : item))} placeholder="Phone" /><input aria-label="Contact email" type="email" className={inputClass} value={row.email} onChange={(event) => setRelatedContactProfileRows("additionalContacts", relatedAddressRows.map((item, itemIndex) => itemIndex === index ? { ...item, email: event.target.value } : item))} placeholder="Email" /><input aria-label="Contact address" className={inputClass} value={row.address} onChange={(event) => setRelatedContactProfileRows("additionalContacts", relatedAddressRows.map((item, itemIndex) => itemIndex === index ? { ...item, address: event.target.value } : item))} placeholder="Address" /><button type="button" onClick={() => setRelatedContactProfileRows("additionalContacts", relatedAddressRows.filter((_, itemIndex) => itemIndex !== index))} aria-label="Remove contact address" className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button></div>)}{relatedAddressRows.length === 0 ? <div className="py-12 text-center text-sm text-slate-500">No additional contacts or addresses.</div> : null}</div></section> : null}

                  {relatedContactCreatorTab === "sales" ? <SalesPurchaseTab profile={relatedContactDraft.profile} onChange={setRelatedContactDraftProfile} salespersonOptions={loanContactStaffOptions.map((option) => option.full_name?.trim() || option.username)} /> : null}

                  {relatedContactCreatorTab === "invoicing" ? <div className="mt-5 grid gap-5 lg:grid-cols-2"><section className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800"><div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800"><h4 className="font-bold text-slate-900 dark:text-white">Bank Accounts</h4><button type="button" onClick={() => setRelatedContactProfileRows("bankAccounts", [...relatedBankRows, { bank: "", accountNumber: "" }])} className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700"><Plus className="h-4 w-4" />Add a line</button></div><div className="p-3">{relatedBankRows.map((row, index) => <div key={`bank-${index}`} className="grid grid-cols-[1fr_1fr_auto] gap-2 border-b border-slate-100 py-2 last:border-0 dark:border-slate-800"><input aria-label="Bank name" className={inputClass} value={row.bank} onChange={(event) => setRelatedContactProfileRows("bankAccounts", relatedBankRows.map((item, itemIndex) => itemIndex === index ? { ...item, bank: event.target.value } : item))} placeholder="Bank" /><input aria-label="Account number" className={inputClass} value={row.accountNumber} onChange={(event) => setRelatedContactProfileRows("bankAccounts", relatedBankRows.map((item, itemIndex) => itemIndex === index ? { ...item, accountNumber: event.target.value } : item))} placeholder="Account number" /><button type="button" onClick={() => setRelatedContactProfileRows("bankAccounts", relatedBankRows.filter((_, itemIndex) => itemIndex !== index))} aria-label="Remove bank account" className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button></div>)}{relatedBankRows.length === 0 ? <p className="py-10 text-center text-sm text-slate-500">No bank accounts added.</p> : null}</div></section><section className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800"><h4 className="mb-4 border-b border-slate-100 pb-3 font-bold text-slate-900 dark:border-slate-800 dark:text-white">Accounting Entries</h4><div className="grid gap-4"><Field label="Account Receivable"><input className={inputClass} value={relatedContactDraft.profile.accountReceivable || ""} onChange={(event) => setRelatedContactDraftProfile("accountReceivable", event.target.value)} placeholder="103100 Accounts Receivable" /></Field><Field label="Account Payable"><input className={inputClass} value={relatedContactDraft.profile.accountPayable || ""} onChange={(event) => setRelatedContactDraftProfile("accountPayable", event.target.value)} placeholder="201100 Accounts Payable" /></Field></div></section></div> : null}

                  {relatedContactCreatorTab === "map" ? <section className="mt-5 rounded-2xl border border-slate-200 p-5 dark:border-slate-800"><h4 className="mb-4 border-b border-slate-100 pb-3 font-bold text-slate-900 dark:border-slate-800 dark:text-white">Google Maps</h4><Field label="Google Maps Link"><div className="flex gap-2"><input type="url" className={inputClass} value={relatedContactDraft.profile.googleMapsLink || ""} onChange={(event) => setRelatedContactDraftProfile("googleMapsLink", event.target.value)} placeholder="https://maps.google.com/…" /><a href={relatedContactDraft.profile.googleMapsLink || undefined} target="_blank" rel="noreferrer" aria-disabled={!relatedContactDraft.profile.googleMapsLink} className={`inline-flex shrink-0 items-center rounded-xl border px-4 text-sm font-semibold ${relatedContactDraft.profile.googleMapsLink ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50" : "pointer-events-none border-slate-200 text-slate-300"}`}>Open map</a></div></Field></section> : null}

                  {relatedContactCreatorTab === "notes" ? <section className="mt-5 rounded-2xl border border-slate-200 p-5 dark:border-slate-800"><h4 className="mb-4 border-b border-slate-100 pb-3 font-bold text-slate-900 dark:border-slate-800 dark:text-white">Internal Notes</h4><textarea className={`${inputClass} min-h-52 resize-y`} value={relatedContactDraft.profile.internalNotes || ""} onChange={(event) => setRelatedContactDraftProfile("internalNotes", event.target.value)} placeholder="Internal note…" /></section> : null}
                </div>
                <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-800"><button type="button" disabled={relatedContactSaving || relatedContactImageUploading} onClick={() => void saveRelatedContact(false)} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">{relatedContactSaving ? "Saving…" : "Save & Close"}</button><button type="button" disabled={relatedContactSaving || relatedContactImageUploading} onClick={() => void saveRelatedContact(true)} className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">Save & New</button><button type="button" onClick={closeRelatedContactCreator} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Discard</button></div>
              </div>
            </div>
          ) : null}

          {relatedCompanySearchOpen ? (
            <div role="dialog" aria-modal="true" aria-labelledby="related-company-search-title" className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-3 sm:p-6">
              <div className="flex max-h-[calc(100vh-3rem)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800"><div><h3 id="related-company-search-title" className="text-xl font-bold text-slate-900 dark:text-white">Search: Company</h3><p className="mt-0.5 text-sm text-slate-500">Select a saved company or contact.</p></div><button type="button" onClick={() => setRelatedCompanySearchOpen(false)} aria-label="Close company search" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button></div>
                <div className="border-b border-slate-200 p-4 dark:border-slate-800"><div className="relative max-w-xl"><Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input autoFocus value={relatedContactDraft.profile.company || ""} onChange={(event) => setRelatedContactDraftProfile("company", event.target.value)} placeholder="Search company" className="w-full rounded-full border border-slate-200 bg-white py-2.5 pl-11 pr-4 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900" /></div></div>
                <div className="min-h-0 flex-1 overflow-y-auto p-4"><table className="w-full min-w-[680px] text-left text-sm"><thead className="sticky top-0 bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300"><tr><th className="rounded-l-xl px-4 py-3">Name</th><th className="px-4 py-3">Phone</th><th className="px-4 py-3">Email</th><th className="rounded-r-xl px-4 py-3">Type</th></tr></thead><tbody>{filteredRelatedCompanyOptions.map((company) => <tr key={company.id} onClick={() => selectRelatedCompany(company)} className="cursor-pointer border-b border-slate-200 text-slate-700 hover:bg-emerald-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-emerald-500/10"><td className="px-4 py-3.5 font-semibold">{company.fullName}</td><td className="px-4 py-3.5">{company.phone || company.profile.mobile || "—"}</td><td className="px-4 py-3.5">{company.email || "—"}</td><td className="px-4 py-3.5 capitalize">{company.profile.entityType || "individual"}</td></tr>)}{filteredRelatedCompanyOptions.length === 0 ? <tr><td colSpan={4} className="px-4 py-12 text-center text-slate-500">No companies found.</td></tr> : null}</tbody></table></div>
                <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-800"><button type="button" onClick={openRelatedCompanyCreator} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"><Plus className="h-4 w-4" />Create and Edit</button><button type="button" onClick={() => setRelatedCompanySearchOpen(false)} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300">Cancel</button></div>
              </div>
            </div>
          ) : null}

          {relatedCompanyCreatorOpen ? (
            <div role="dialog" aria-modal="true" aria-labelledby="related-company-creator-title" className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 p-3 sm:p-6">
              <div className="flex max-h-[calc(100vh-3rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800"><div><h3 id="related-company-creator-title" className="text-xl font-bold text-slate-900 dark:text-white">Create: Company</h3><p className="mt-0.5 text-sm text-slate-500">The company will be saved as a reusable contact.</p></div><button type="button" onClick={() => setRelatedCompanyCreatorOpen(false)} aria-label="Close company form" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button></div>
                <div className="min-h-0 flex-1 overflow-y-auto p-5"><div className="grid gap-4 sm:grid-cols-2"><Field label="Company name" className="sm:col-span-2"><input autoFocus className={inputClass} value={relatedCompanyDraft.fullName} onChange={(event) => setRelatedCompanyDraft((current) => ({ ...current, fullName: event.target.value }))} placeholder="Company name" /></Field><Field label="Name (Khmer)" className="sm:col-span-2"><input className={inputClass} value={relatedCompanyDraft.profile.nameKhmer || ""} onChange={(event) => setRelatedCompanyDraft((current) => ({ ...current, profile: { ...current.profile, nameKhmer: event.target.value } }))} placeholder="ឈ្មោះក្រុមហ៊ុន" /></Field><Field label="Phone"><input className={inputClass} value={relatedCompanyDraft.phone || ""} onChange={(event) => setRelatedCompanyDraft((current) => ({ ...current, phone: event.target.value || null }))} placeholder="Phone" /></Field><Field label="Email"><input type="email" className={inputClass} value={relatedCompanyDraft.email || ""} onChange={(event) => setRelatedCompanyDraft((current) => ({ ...current, email: event.target.value || null }))} placeholder="Email" /></Field><Field label="Address" className="sm:col-span-2"><textarea rows={3} className={inputClass} value={relatedCompanyDraft.address || ""} onChange={(event) => setRelatedCompanyDraft((current) => ({ ...current, address: event.target.value || null }))} placeholder="Company address" /></Field></div></div>
                <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-800"><button type="button" disabled={relatedCompanySaving} onClick={() => void saveRelatedCompany()} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">{relatedCompanySaving ? "Saving…" : "Save"}</button><button type="button" onClick={() => setRelatedCompanyCreatorOpen(false)} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300">Discard</button></div>
              </div>
            </div>
          ) : null}

          {customerEditorOpen ? (
            <div role="dialog" aria-modal="true" aria-labelledby="customer-editor-title" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-1 sm:p-3">
              <div className="flex h-[calc(100vh-1rem)] w-full max-w-[122rem] flex-col overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950 sm:h-[calc(100vh-1.5rem)]">
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-800">
                  <h3 id="customer-editor-title" className="text-2xl font-bold text-slate-900 dark:text-white">{form.borrowerId ? "Edit: Customer" : "Create: Customer"}</h3>
                  <button type="button" onClick={() => closeCustomerEditor(true)} aria-label="Close customer editor" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"><X className="h-6 w-6" /></button>
                </div>
                <div className="customer-reference-form loan-primary-fields min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-3">
                  <div className="flex justify-end">
                    <div className="inline-flex cursor-not-allowed rounded-full border border-slate-200 p-0.5 dark:border-slate-700" aria-label="Customer and vendor status" title="Read only — use the Customer and Vendor checkboxes below">{[["customer", "Customer"], ["vendor", "Vendor"], ["customer_vendor", "Customer & Vendor"]].map(([value, label]) => <span key={value} className={`cursor-not-allowed select-none rounded-full px-5 py-2.5 text-sm font-semibold ${form.customerProfile.relationship === value ? "bg-emerald-600 text-white" : "text-slate-700 dark:text-slate-200"}`}>{label}</span>)}</div>
                  </div>
                  <div className="mt-4 flex flex-col-reverse gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex gap-10 text-sm font-semibold text-slate-700 dark:text-slate-200"><label className="flex cursor-pointer items-center gap-3"><input className="h-5 w-5 accent-emerald-600" type="radio" checked={(form.customerProfile.entityType || "individual") === "individual"} onChange={() => setForm((current) => ({ ...current, customerProfile: { ...current.customerProfile, entityType: "individual" } }))} />Individual</label><label className="flex cursor-pointer items-center gap-3"><input className="h-5 w-5 accent-emerald-600" type="radio" checked={form.customerProfile.entityType === "company"} onChange={() => setForm((current) => ({ ...current, customerProfile: { ...current.customerProfile, entityType: "company" } }))} />Company</label></div>
                    <div className="flex flex-wrap justify-end gap-2">
                      {([
                        ["Sales", "0", CircleDollarSign],
                        ["Purchases", "0", CreditCard],
                        ["Invoiced", "0.00", FilePlus2],
                        ["Vendor Bills", "0", FilePlus2],
                        ["Loans", form.borrowerId ? "1.00" : "0.00", HandCoins],
                      ] as const).map(([label, value, Icon]) => <div key={label} className="flex min-w-36 items-center gap-3 rounded-full border border-slate-200 px-4 py-2 dark:border-slate-700"><Icon className="h-7 w-7 text-slate-400" /><div><p className="text-sm font-bold text-slate-600 dark:text-slate-300">{value}</p><p className="text-xs font-semibold text-slate-500">{label}</p></div></div>)}
                    </div>
                  </div>
                  <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_9rem]">
                    <div className="max-w-4xl space-y-4"><input className={`${inputClass} text-3xl font-medium`} value={form.fullName} onChange={set("fullName")} placeholder="Name" autoFocus /><input className={`${inputClass} text-xl`} value={form.customerProfile.nameKhmer || ""} onChange={setCustomerProfile("nameKhmer")} placeholder="Name (Khmer)" /></div>
                    <div className="flex flex-col items-center gap-2 lg:row-span-2">
                      <button type="button" disabled={customerImageUploading} onClick={() => customerImageInputRef.current?.click()} className="group relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-400 transition hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-600 disabled:cursor-wait dark:border-slate-700 dark:bg-slate-900 dark:hover:border-emerald-700" aria-label="Upload customer profile image">
                        {form.customerProfile.imageUrl ? <span className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${JSON.stringify(form.customerProfile.imageUrl).slice(1, -1)})` }} /> : <Camera className="h-8 w-8" />}
                        {customerImageUploading ? <span className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-slate-950/80"><Loader2 className="h-6 w-6 animate-spin text-emerald-600" /></span> : <span className="absolute inset-x-0 bottom-0 bg-slate-950/65 py-1.5 text-center text-xs font-semibold text-white opacity-0 transition group-hover:opacity-100">Choose image</span>}
                      </button>
                      <input ref={customerImageInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => void uploadCustomerImage(event)} className="hidden" />
                      {form.customerProfile.imageUrl ? <button type="button" onClick={() => { setCustomerProfileValue("imageUrl", ""); setCustomerProfileValue("imagePublicId", ""); }} className="text-xs font-semibold text-rose-600 hover:text-rose-700">Remove image</button> : <span className="text-xs text-slate-500">JPG, PNG, WebP · max 5 MB</span>}
                    </div>
                  </div>
                  <div className="mt-5 max-w-4xl space-y-4">
                    <div className="flex flex-wrap gap-10 text-sm font-semibold text-slate-800 dark:text-slate-100">
                      <label className="flex cursor-pointer items-center gap-3"><input type="checkbox" className="h-5 w-5 rounded accent-emerald-600" checked={form.customerProfile.relationship === "customer" || form.customerProfile.relationship === "customer_vendor"} onChange={(event) => setCustomerProfileValue("relationship", toggleCustomerVendorRelationship(form.customerProfile.relationship, "customer", event.target.checked))} />Customer</label>
                      <label className="flex cursor-pointer items-center gap-3"><input type="checkbox" className="h-5 w-5 rounded accent-emerald-600" checked={form.customerProfile.relationship === "vendor" || form.customerProfile.relationship === "customer_vendor"} onChange={(event) => setCustomerProfileValue("relationship", toggleCustomerVendorRelationship(form.customerProfile.relationship, "vendor", event.target.checked))} />Vendor</label>
                    </div>
                    {form.customerProfile.entityType === "company" ? <div className="relative"><input className={`${inputClass} pr-10`} value={form.customerProfile.company || ""} onChange={(event) => { setCustomerProfileValue("company", event.target.value); setCustomerCompanyShowAll(false); setCustomerCompanyPickerOpen(true); }} onFocus={() => setCustomerCompanyPickerOpen(true)} onBlur={() => window.setTimeout(() => setCustomerCompanyPickerOpen(false), 160)} placeholder="Company" autoComplete="off" role="combobox" aria-expanded={customerCompanyPickerOpen} aria-controls="customer-company-options" /><button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => setCustomerCompanyPickerOpen((open) => !open)} aria-label="Show saved companies" className="absolute right-0 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center text-slate-500 hover:text-emerald-700"><ChevronDown className="h-4 w-4" /></button>{customerCompanyPickerOpen ? <div id="customer-company-options" className="absolute left-0 top-[calc(100%+0.25rem)] z-40 w-full overflow-hidden border border-slate-300 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950"><div className="max-h-80 overflow-y-auto py-1">{filteredCustomerCompanyOptions.slice(0, customerCompanyShowAll ? undefined : 7).map((company) => <button key={company.id} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => selectCustomerCompany(company)} className="block w-full px-5 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">{company.fullName}</button>)}{filteredCustomerCompanyOptions.length === 0 ? <p className="px-5 py-5 text-sm text-slate-500">No matching companies.</p> : null}</div><div className="border-t border-slate-200 py-1 dark:border-slate-800"><button type="button" onMouseDown={(event) => event.preventDefault()} onClick={openCustomerCompanySearch} className="block w-full px-5 py-2.5 text-left text-sm font-semibold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300">Search More...</button><button type="button" onMouseDown={(event) => event.preventDefault()} onClick={openCustomerCompanyCreator} className="block w-full px-5 py-2.5 text-left text-sm font-semibold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300">Create and Edit...</button></div></div> : null}</div> : null}
                  </div>
                  <div className="mt-8 flex flex-wrap border-b border-slate-300 dark:border-slate-700">{[["general", "General Information"], ["contacts", "Contacts & Addresses"], ["sales", "Sales & Purchase"], ["invoicing", "Invoicing"], ["map", "Map"], ["notes", "Internal Notes"]].map(([value, label]) => <button key={value} type="button" onClick={() => setCustomerEditorTab(value as CustomerEditorTab)} className={`border border-b-0 px-5 py-3 text-sm font-semibold transition ${customerEditorTab === value ? "rounded-t-lg border-slate-300 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white" : "border-transparent text-slate-500 hover:text-slate-800"}`}>{label}</button>)}</div>
                  {customerEditorTab === "general" ? <div className="mt-7 space-y-10 pb-8">
                    <div className="grid gap-x-16 gap-y-8 lg:grid-cols-2">
                      <section><h4 className="mb-5 border-l-4 border-emerald-600 pl-3 text-2xl font-medium text-slate-700 dark:text-slate-200">Address</h4><div className="space-y-4">
                        <label className="loan-form-row"><span>Address 1</span><input className={inputClass} value={form.address} onChange={set("address")} placeholder="Address 1" /></label>
                        <label className="loan-form-row"><span>Address 2</span><input className={inputClass} value={form.customerProfile.address2 || ""} onChange={setCustomerProfile("address2")} placeholder="Address 2" /></label>
                        <label className="loan-form-row"><span>Country</span><CountryPicker value={form.customerProfile.country || ""} onChange={(value) => setCustomerProfileValue("country", value)} onSearchMore={() => openCountrySearch((value) => setCustomerProfileValue("country", value))} /></label>
                      </div></section>
                      <section><h4 className="mb-5 border-l-4 border-emerald-600 pl-3 text-2xl font-medium text-slate-700 dark:text-slate-200">Contact</h4><div className="space-y-4">
                        <label className="loan-form-row"><span>Job Position</span><input className={inputClass} value={form.customerProfile.jobPosition || ""} onChange={setCustomerProfile("jobPosition")} placeholder="e.g. Sales Director" /></label>
                        <label className="loan-form-row"><span>Phone</span><input className={inputClass} value={form.phone} onChange={set("phone")} placeholder="Phone" /></label>
                        <label className="loan-form-row"><span>Mobile</span><input className={inputClass} value={form.customerProfile.mobile || ""} onChange={setCustomerProfile("mobile")} placeholder="Mobile" /></label>
                        <label className="loan-form-row"><span>Email</span><input type="email" className={inputClass} value={form.email} onChange={set("email")} placeholder="Email" /></label>
                        <label className="loan-form-row"><span>Website Link</span><input className={inputClass} value={form.customerProfile.website || ""} onChange={setCustomerProfile("website")} placeholder="e.g. https://www.example.com" /></label>
                        <label className="loan-form-row"><span>Tags</span><CustomerTagsPicker value={form.customerProfile.tags || ""} options={customerTagOptions} onChange={(value) => setCustomerProfileValue("tags", value)} onAdd={addCustomerTagOption} /></label>
                        <label className="loan-form-row"><span>Category</span><CustomerCategoryPicker value={form.customerProfile.category || ""} options={customerCategoryOptions} onChange={(value) => setCustomerProfileValue("category", value)} onCreate={() => openCustomerCategoryEditor((value) => setCustomerProfileValue("category", value))} /></label>
                      </div></section>
                    </div>
                    <div className="grid gap-x-16 gap-y-8 lg:grid-cols-2">
                      <section><h4 className="mb-5 border-l-4 border-emerald-600 pl-3 text-2xl font-medium text-slate-700 dark:text-slate-200">Compliance</h4><div className="space-y-4">
                        <label className="loan-form-row"><span>Tax ID</span><input className={inputClass} value={form.customerProfile.taxId || ""} onChange={setCustomerProfile("taxId")} placeholder="Tax ID" /></label>
                        <label className="loan-form-row"><span>Tax Type</span><div className="relative"><select className={`${inputClass} appearance-none pr-10`} value={form.customerProfile.taxType || ""} onChange={setCustomerProfile("taxType")}><option value="">Tax Type</option><option>Non-Taxable Person</option><option>Taxable Person</option><option>Overseas Company</option></select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /></div></label>
                        <label className="loan-form-row"><span>Code</span><input className={inputClass} value={form.customerProfile.code || ""} onChange={setCustomerProfile("code")} placeholder="Code" /></label>
                      </div></section>
                      <section><h4 className="mb-5 border-l-4 border-emerald-600 pl-3 text-2xl font-medium text-slate-700 dark:text-slate-200">Identification</h4><div className="space-y-4">
                        <label className="loan-form-row"><span>Title</span><CustomerTitlePicker value={form.customerProfile.title || ""} options={customerTitleOptions} onChange={(title) => setCustomerProfileValue("title", title)} onCreate={() => openCustomerTitleEditor("profile")} /></label>
                        <label className="loan-form-row"><span>Name in Latin</span><input className={inputClass} value={form.customerProfile.nameLatin || ""} onChange={setCustomerProfile("nameLatin")} placeholder="Name in Latin" /></label>
                        <label className="loan-form-row"><span>Name in Khmer</span><input className={inputClass} value={form.customerProfile.nameKhmer || ""} onChange={setCustomerProfile("nameKhmer")} placeholder="Name in Khmer" /></label>
                        <label className="loan-form-row"><span>Identity Card</span><input className={inputClass} value={form.nationalId} onChange={set("nationalId")} placeholder="Identity Card" /></label>
                        <div className="loan-form-row"><span>Valid Date</span>{renderDateOfBirthField("customer-validDate", "Valid Date", form.customerProfile.validDate, (value) => setCustomerProfileValue("validDate", value))}</div>
                        <div className="loan-form-row"><span>Expire Date</span>{renderDateOfBirthField("customer-expireDate", "Expire Date", form.customerProfile.expireDate, (value) => setCustomerProfileValue("expireDate", value))}</div>
                        <div className="loan-form-row"><span>Date of Birth</span>{renderDateOfBirthField("customer-dateOfBirth", "Date of Birth", form.customerProfile.dateOfBirth, setCustomerBirthDate)}</div>
                        <label className="loan-form-row"><span>Age</span><input type="number" min="0" readOnly aria-readonly="true" className={`${inputClass} cursor-default`} value={form.customerProfile.age || ""} placeholder="0" /></label>
                        <label className="loan-form-row"><span>Partner</span><input className={inputClass} value={form.customerProfile.partner || ""} onChange={setCustomerProfile("partner")} placeholder="Partner" /></label>
                        <label className="loan-form-row"><span>Gender</span><select className={inputClass} value={form.customerProfile.gender || ""} onChange={setCustomerProfile("gender")}><option value="">Select gender</option><option>Female</option><option>Male</option><option>Other</option></select></label>
                        <label className="loan-form-row"><span>Passport</span><input className={inputClass} value={form.customerProfile.passport || ""} onChange={setCustomerProfile("passport")} placeholder="Passport" /></label>
                        <label className="loan-form-row"><span>Nationality</span><CountryPicker value={form.customerProfile.nationality || ""} onChange={(value) => setCustomerProfileValue("nationality", value)} onSearchMore={() => openCountrySearch((value) => setCustomerProfileValue("nationality", value), "Search: Nationality")} placeholder="Nationality" /></label>
                      </div></section>
                    </div>
                  </div> : null}
                  {customerEditorTab === "contacts" ? <div className="customer-contact-list min-h-72 py-8">
                    <button type="button" onClick={() => openCustomerContactEditor("customer")} className="inline-flex items-center gap-2 rounded-full bg-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200"><SquarePlus className="h-4 w-4" />Add</button>
                    {customerContactRows.length ? <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{customerContactRows.map((contact, index) => <article key={`saved-customer-contact-${index}`} className="relative rounded-2xl border border-slate-200 p-4 dark:border-slate-800"><p className="font-semibold text-slate-900 dark:text-white">{contact.name || contact.type || `Contact ${index + 1}`}</p><p className="mt-1 text-xs font-medium text-slate-500">{contact.type || "Other Address"}</p><p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{[contact.address1, contact.address2, contact.country].filter(Boolean).join(", ") || "No address"}</p><p className="mt-1 text-sm text-slate-500">{[contact.email, contact.phone, contact.mobile].filter(Boolean).join(" · ") || "No contact details"}</p><button type="button" onClick={() => setCustomerProfileRows("additionalContacts", customerContactRows.filter((_, rowIndex) => rowIndex !== index))} aria-label={`Remove ${contact.name || "contact"}`} className="absolute right-3 top-3 rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button></article>)}</div> : null}
                  </div> : null}
                  {customerEditorTab === "sales" ? <SalesPurchaseTab profile={form.customerProfile} onChange={setCustomerProfileValue} salespersonOptions={loanContactStaffOptions.map((option) => option.full_name?.trim() || option.username)} /> : null}
                  {customerEditorTab === "invoicing" ? <div className="mt-5 grid gap-5 lg:grid-cols-2"><section className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800"><div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800"><h4 className="font-bold text-slate-900 dark:text-white">Bank Accounts</h4><button type="button" onClick={() => setCustomerProfileRows("bankAccounts", [...customerBankRows, { bank: "", accountNumber: "" }])} className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700"><Plus className="h-4 w-4" />Add a line</button></div><div className="p-3">{customerBankRows.map((row, index) => <div key={`customer-bank-${index}`} className="grid grid-cols-[1fr_1fr_auto] gap-2 border-b border-slate-100 py-2 last:border-0 dark:border-slate-800"><input aria-label="Bank name" className={inputClass} value={row.bank} onChange={(event) => setCustomerProfileRows("bankAccounts", customerBankRows.map((item, itemIndex) => itemIndex === index ? { ...item, bank: event.target.value } : item))} placeholder="Bank" /><input aria-label="Account number" className={inputClass} value={row.accountNumber} onChange={(event) => setCustomerProfileRows("bankAccounts", customerBankRows.map((item, itemIndex) => itemIndex === index ? { ...item, accountNumber: event.target.value } : item))} placeholder="Account number" /><button type="button" onClick={() => setCustomerProfileRows("bankAccounts", customerBankRows.filter((_, itemIndex) => itemIndex !== index))} aria-label="Remove bank account" className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button></div>)}{customerBankRows.length === 0 ? <p className="py-10 text-center text-sm text-slate-500">No bank accounts added.</p> : null}</div></section><section className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800"><h4 className="mb-4 font-bold text-slate-900 dark:text-white">Accounting Entries</h4><div className="grid gap-4"><Field label="Account Receivable"><input className={inputClass} value={form.customerProfile.accountReceivable || ""} onChange={setCustomerProfile("accountReceivable")} placeholder="103100 Accounts Receivable" /></Field><Field label="Account Payable"><input className={inputClass} value={form.customerProfile.accountPayable || ""} onChange={setCustomerProfile("accountPayable")} placeholder="201100 Accounts Payable" /></Field></div></section></div> : null}
                  {customerEditorTab === "map" ? <section className="mt-5 rounded-2xl border border-slate-200 p-5 dark:border-slate-800"><h4 className="mb-4 font-bold text-slate-900 dark:text-white">Google Maps</h4><Field label="Google Maps Link"><div className="flex gap-2"><input type="url" className={inputClass} value={form.customerProfile.googleMapsLink || ""} onChange={setCustomerProfile("googleMapsLink")} placeholder="https://maps.google.com/..." /><a href={form.customerProfile.googleMapsLink || undefined} target="_blank" rel="noreferrer" aria-disabled={!form.customerProfile.googleMapsLink} className={`inline-flex shrink-0 items-center rounded-xl border px-4 text-sm font-semibold ${form.customerProfile.googleMapsLink ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50" : "pointer-events-none border-slate-200 text-slate-300"}`}>Open map</a></div></Field></section> : null}
                  {customerEditorTab === "notes" ? <section className="mt-5 rounded-2xl border border-slate-200 p-5 dark:border-slate-800"><h4 className="mb-4 font-bold text-slate-900 dark:text-white">Internal Notes</h4><textarea className={`${inputClass} min-h-52 resize-y`} value={form.customerProfile.internalNotes || ""} onChange={setCustomerProfile("internalNotes")} placeholder="Internal note..." /></section> : null}
                  {customerEditorTab === "compliance" ? <div className="mt-5 grid gap-4 md:grid-cols-2"><Field label="Tax ID"><input className={inputClass} value={form.customerProfile.taxId || ""} onChange={setCustomerProfile("taxId")} placeholder="Tax ID" /></Field><Field label="Tax type"><input className={inputClass} value={form.customerProfile.taxType || ""} onChange={setCustomerProfile("taxType")} placeholder="Tax type" /></Field><Field label="Code"><input className={inputClass} value={form.customerProfile.code || ""} onChange={setCustomerProfile("code")} placeholder="Code" /></Field><Field label="Title"><input className={inputClass} value={form.customerProfile.title || ""} onChange={setCustomerProfile("title")} placeholder="Title" /></Field><Field label="Name in Latin"><input className={inputClass} value={form.customerProfile.nameLatin || ""} onChange={setCustomerProfile("nameLatin")} placeholder="Name in Latin" /></Field><Field label="Name in Khmer"><input className={inputClass} value={form.customerProfile.nameKhmer || ""} onChange={setCustomerProfile("nameKhmer")} placeholder="ឈ្មោះជាភាសាខ្មែរ" /></Field><Field label="Identity Card"><input className={inputClass} value={form.nationalId} onChange={set("nationalId")} placeholder="Identity card" /></Field><Field label="Valid Date">{renderDateOfBirthField("customer-validDate", "Valid Date", form.customerProfile.validDate, (value) => setCustomerProfileValue("validDate", value))}</Field><Field label="Expire Date">{renderDateOfBirthField("customer-expireDate", "Expire Date", form.customerProfile.expireDate, (value) => setCustomerProfileValue("expireDate", value))}</Field><Field label="Date of Birth">{renderDateOfBirthField("customer-dateOfBirth", "Date of Birth", form.customerProfile.dateOfBirth, (value) => setCustomerProfileValue("dateOfBirth", value))}</Field><Field label="Age"><input type="number" min="0" className={inputClass} value={form.customerProfile.age || ""} onChange={setCustomerProfile("age")} placeholder="0" /></Field><Field label="Partner"><input className={inputClass} value={form.customerProfile.partner || ""} onChange={setCustomerProfile("partner")} placeholder="Partner" /></Field><Field label="Gender"><select className={inputClass} value={form.customerProfile.gender || ""} onChange={setCustomerProfile("gender")}><option value="">Select gender</option><option>Female</option><option>Male</option><option>Other</option></select></Field><Field label="Passport"><input className={inputClass} value={form.customerProfile.passport || ""} onChange={setCustomerProfile("passport")} placeholder="Passport" /></Field><Field label="Nationality"><input className={inputClass} value={form.customerProfile.nationality || ""} onChange={setCustomerProfile("nationality")} placeholder="Nationality" /></Field></div> : null}
                </div>
                <div className="flex gap-2 border-t border-slate-200 px-6 py-4 dark:border-slate-800"><button type="button" onClick={() => closeCustomerEditor()} className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">Save</button><button type="button" onClick={() => closeCustomerEditor(true)} className="rounded-full bg-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200">Discard</button></div>
              </div>
            </div>
          ) : null}

          {customerEditorOpen && customerCompanySearchModalOpen ? (
            <div role="dialog" aria-modal="true" aria-labelledby="customer-company-search-title" className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-1 sm:p-3">
              <div className="flex h-[calc(100vh-1rem)] w-full max-w-[122rem] flex-col overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950 sm:h-[calc(100vh-1.5rem)]">
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-800">
                  <h3 id="customer-company-search-title" className="text-2xl font-bold text-slate-900 dark:text-white">Search: Related Company</h3>
                  <button type="button" onClick={() => setCustomerCompanySearchModalOpen(false)} aria-label="Close related company search" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-6 w-6" /></button>
                </div>
                <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
                      <div className="relative shrink-0">
                        <button type="button" aria-haspopup="menu" aria-expanded={customerCompanySearchBookmarksOpen} onClick={() => { setCustomerCompanySearchBookmarksOpen((current) => !current); setCustomerCompanySearchFiltersOpen(false); setCustomerCompanySearchGroupOpen(false); }} className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm"><CalendarDays className="h-5 w-5" />Bookmarks<ChevronDown className="h-4 w-4" /></button>
                        {customerCompanySearchBookmarksOpen ? <div role="menu" className="absolute left-0 top-[calc(100%+0.35rem)] z-40 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white py-2 shadow-2xl dark:border-slate-700 dark:bg-slate-950"><button type="button" role="menuitem" onClick={() => { try { window.localStorage.setItem("loan-related-company-saved-search", JSON.stringify({ query: customerCompanySearchText, groupBy: customerCompanySearchGroup, savedAt: new Date().toISOString() })); } catch { /* Local storage can be disabled. */ } setCustomerCompanySearchBookmarksOpen(false); }} className="block w-full px-5 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">Save Current Search</button><button type="button" role="menuitem" onClick={() => { try { window.localStorage.setItem("loan-related-company-dashboard-search", JSON.stringify({ query: customerCompanySearchText, groupBy: customerCompanySearchGroup, savedAt: new Date().toISOString() })); } catch { /* Local storage can be disabled. */ } setCustomerCompanySearchBookmarksOpen(false); }} className="block w-full border-t border-slate-100 px-5 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800">Add to My Dashboard</button></div> : null}
                      </div>
                      {customerCompanySearchFilterChips.map((chip) => <div key={chip.key} className="inline-flex shrink-0 items-center overflow-hidden rounded-full bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-600 text-white"><Filter className="h-4 w-4" /></span><span className="pl-3 text-sm font-semibold">{chip.label}</span><button type="button" onClick={() => { setCustomerCompanySearchFilters((current) => current.filter((filter) => !chip.filters.includes(filter))); setCustomerCompanySearchPage(0); }} aria-label={`Remove ${chip.label} filter`} className="flex h-11 w-10 items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white"><X className="h-4 w-4" /></button></div>)}
                      <div className="relative min-w-[12rem] flex-1"><Search className="pointer-events-none absolute left-1 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" /><input autoFocus value={customerCompanySearchText} onChange={(event) => { setCustomerCompanySearchText(event.target.value); setCustomerCompanySearchPage(0); }} className="w-full border-0 border-b border-slate-300 bg-transparent py-3 pl-8 pr-3 text-base text-slate-800 outline-none placeholder:text-slate-400 focus:border-emerald-600 focus:ring-0 dark:border-slate-700 dark:text-slate-100" placeholder="Type to search" /></div>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-3">
                      <span className="px-2 text-sm font-medium text-slate-700 dark:text-slate-200">{customerCompanySearchStart}-{customerCompanySearchEnd} <span className="mx-2 text-slate-400">|</span> {customerCompanySearchResults.length}</span>
                      <button type="button" disabled={customerCompanySearchSafePage === 0} onClick={() => stepCustomerCompanySearchPage(-1)} className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-200 text-2xl text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-slate-800 dark:text-slate-200" aria-label="Previous 80 companies" title="Previous page">‹</button>
                      <button type="button" disabled={customerCompanySearchSafePage >= customerCompanySearchPageCount - 1} onClick={() => stepCustomerCompanySearchPage(1)} className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-200 text-2xl text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-slate-800 dark:text-slate-200" aria-label="Next 80 companies" title="Next page">›</button>
                      <div className="relative">
                        <button type="button" onClick={() => { setCustomerCompanySearchFiltersOpen((current) => !current); setCustomerCompanySearchGroupOpen(false); setCustomerCompanySearchBookmarksOpen(false); }} className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold ${customerCompanySearchFiltersOpen || customerCompanySearchFilters.length ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}><Filter className="h-4 w-4" />Filters<ChevronDown className="h-4 w-4" /></button>
                        {customerCompanySearchFiltersOpen ? <div role="menu" className="absolute right-0 top-[calc(100%+0.35rem)] z-40 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950">{([['individuals', 'Individuals'], ['companies', 'Companies'], ['customers', 'Customers'], ['vendors', 'Vendors'], ['archived', 'Archived']] as const).map(([value, label]) => { const selected = customerCompanySearchFilters.includes(value); return <button key={value} type="button" role="menuitemcheckbox" aria-checked={selected} onClick={() => { setCustomerCompanySearchFilters((current) => current.includes(value) ? current.filter((filter) => filter !== value) : [...current, value]); setCustomerCompanySearchPage(0); }} className="flex w-full items-center gap-2 border-b border-slate-200 px-6 py-4 text-left text-base font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"><span className="flex w-5 shrink-0 items-center justify-center">{selected ? <Check className="h-5 w-5 text-emerald-600" /> : null}</span><span className={selected ? "font-bold" : ""}>{label}</span></button>; })}<button type="button" role="menuitem" onClick={() => { setCustomerCompanySearchFilters([]); setCustomerCompanySearchPage(0); setCustomerCompanySearchFiltersOpen(false); }} className="block w-full px-6 py-4 pl-[3.25rem] text-left text-base font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Add Custom Filter</button></div> : null}
                      </div>
                      <div className="relative">
                        <button type="button" onClick={() => { setCustomerCompanySearchGroupOpen((current) => !current); setCustomerCompanySearchFiltersOpen(false); setCustomerCompanySearchBookmarksOpen(false); }} className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold ${customerCompanySearchGroupOpen ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}><FolderOpen className="h-4 w-4" />Group By<ChevronDown className="h-4 w-4" /></button>
                        {customerCompanySearchGroupOpen ? <div role="menu" className="absolute right-0 top-[calc(100%+0.35rem)] z-40 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950">{([['salesperson', 'Salesperson'], ['company', 'Company'], ['country', 'Country']] as const).map(([value, label]) => <button key={value} type="button" role="menuitemradio" aria-checked={customerCompanySearchGroup === value} onClick={() => { setCustomerCompanySearchGroup((current) => current === value ? "" : value); setCustomerCompanySearchPage(0); setCustomerCompanySort(null); setCustomerCompanySearchGroupOpen(false); }} className="flex w-full items-center justify-between border-b border-slate-200 px-6 py-4 text-left text-base font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"><span>{label}</span>{customerCompanySearchGroup === value ? <Check className="h-5 w-5 text-emerald-600" /> : null}</button>)}<button type="button" role="menuitem" onClick={() => { setCustomerCompanySearchGroup(""); setCustomerCompanySearchPage(0); setCustomerCompanySort(null); setCustomerCompanySearchGroupOpen(false); }} className="block w-full px-6 py-4 text-left text-base font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Add Custom Group</button></div> : null}
                      </div>
                    </div>
                  </div>
                </div>
                <div ref={customerCompanySearchTableRef} className="min-h-0 flex-1 overflow-auto px-6 py-4">
                  <table className="w-full min-w-[1050px] border-separate border-spacing-0 text-left">
                    <thead className="sticky top-0 z-10 bg-slate-100 text-sm font-bold text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                      <tr>
                        <th className="rounded-l-2xl px-6 py-5"><button type="button" onClick={() => toggleCustomerCompanySort("name")} className="inline-flex items-center gap-2 hover:text-slate-900 dark:hover:text-white">Name{customerCompanySort?.key === "name" ? <span aria-label={customerCompanySort.direction === "asc" ? "Sorted ascending" : "Sorted descending"} className="text-xs">{customerCompanySort.direction === "asc" ? "▲" : "▼"}</span> : null}</button></th>
                        {customerCompanyVisibleColumns.nameKhmer ? <th className="px-6 py-5">Customer Name (Khmer)</th> : null}
                        {customerCompanyVisibleColumns.phone ? <th className="px-6 py-5"><button type="button" onClick={() => toggleCustomerCompanySort("phone")} className="inline-flex items-center gap-2 hover:text-slate-900 dark:hover:text-white">Phone{customerCompanySort?.key === "phone" ? <span aria-label={customerCompanySort.direction === "asc" ? "Sorted ascending" : "Sorted descending"} className="text-xs">{customerCompanySort.direction === "asc" ? "▲" : "▼"}</span> : null}</button></th> : null}
                        {customerCompanyVisibleColumns.email ? <th className="px-6 py-5"><button type="button" onClick={() => toggleCustomerCompanySort("email")} className="inline-flex items-center gap-2 hover:text-slate-900 dark:hover:text-white">Email{customerCompanySort?.key === "email" ? <span aria-label={customerCompanySort.direction === "asc" ? "Sorted ascending" : "Sorted descending"} className="text-xs">{customerCompanySort.direction === "asc" ? "▲" : "▼"}</span> : null}</button></th> : null}
                        {customerCompanyVisibleColumns.address1 ? <th className="px-6 py-5"><button type="button" onClick={() => toggleCustomerCompanySort("address1")} className="inline-flex items-center gap-2 hover:text-slate-900 dark:hover:text-white">Address 1{customerCompanySort?.key === "address1" ? <span aria-label={customerCompanySort.direction === "asc" ? "Sorted ascending" : "Sorted descending"} className="text-xs">{customerCompanySort.direction === "asc" ? "▲" : "▼"}</span> : null}</button></th> : null}
                        {customerCompanyVisibleColumns.address2 ? <th className="px-6 py-5"><button type="button" onClick={() => toggleCustomerCompanySort("address2")} className="inline-flex items-center gap-2 hover:text-slate-900 dark:hover:text-white">Address 2{customerCompanySort?.key === "address2" ? <span aria-label={customerCompanySort.direction === "asc" ? "Sorted ascending" : "Sorted descending"} className="text-xs">{customerCompanySort.direction === "asc" ? "▲" : "▼"}</span> : null}</button></th> : null}
                        {customerCompanyVisibleColumns.country ? <th className="px-6 py-5">Country</th> : null}
                        {customerCompanyVisibleColumns.taxId ? <th className="px-6 py-5">Tax ID</th> : null}
                        <th className="relative w-16 rounded-r-2xl px-3 py-5 text-right">
                          <button type="button" aria-label="Choose related company columns" aria-haspopup="menu" aria-expanded={customerCompanyColumnsOpen} onClick={() => setCustomerCompanyColumnsOpen((current) => !current)} className="inline-flex h-8 w-8 items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white"><MoreVertical className="h-5 w-5" /></button>
                          {customerCompanyColumnsOpen ? <div role="menu" className="absolute right-0 top-[calc(100%+0.25rem)] z-50 w-72 border border-slate-300 bg-white py-2 text-left shadow-2xl dark:border-slate-700 dark:bg-slate-950">{([
                            ["nameKhmer", "Customer Name (Khmer)"],
                            ["phone", "Phone"],
                            ["email", "Email"],
                            ["address1", "Address 1"],
                            ["address2", "Address 2"],
                            ["country", "Country"],
                            ["taxId", "Tax ID"],
                          ] as const).map(([key, label]) => <label key={key} className="flex cursor-pointer items-center gap-4 px-6 py-3 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"><input type="checkbox" checked={customerCompanyVisibleColumns[key]} onChange={(event) => setCustomerCompanyVisibleColumns((current) => ({ ...current, [key]: event.target.checked }))} className="h-5 w-5 accent-emerald-600" /><span>{label}</span></label>)}</div> : null}
                        </th>
                      </tr>
                    </thead>
                    <tbody>{customerCompanySearchPageRows.map((company) => <tr key={company.id} tabIndex={0} onClick={() => selectCustomerCompany(company)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectCustomerCompany(company); } }} className="cursor-pointer border-b border-slate-200 text-sm text-slate-600 hover:bg-emerald-50 focus:bg-emerald-50 focus:outline-none dark:border-slate-800 dark:text-slate-300 dark:hover:bg-emerald-500/10"><td className="border-b border-slate-200 px-6 py-5 font-medium dark:border-slate-800">{company.fullName}</td>{customerCompanyVisibleColumns.nameKhmer ? <td className="border-b border-slate-200 px-6 py-5 dark:border-slate-800">{company.profile.nameKhmer || ""}</td> : null}{customerCompanyVisibleColumns.phone ? <td className="border-b border-slate-200 px-6 py-5 dark:border-slate-800">{company.phone || company.profile.mobile || ""}</td> : null}{customerCompanyVisibleColumns.email ? <td className="border-b border-slate-200 px-6 py-5 dark:border-slate-800">{company.email || ""}</td> : null}{customerCompanyVisibleColumns.address1 ? <td className="border-b border-slate-200 px-6 py-5 dark:border-slate-800">{company.address || ""}</td> : null}{customerCompanyVisibleColumns.address2 ? <td className="border-b border-slate-200 px-6 py-5 dark:border-slate-800">{company.profile.address2 || ""}</td> : null}{customerCompanyVisibleColumns.country ? <td className="border-b border-slate-200 px-6 py-5 dark:border-slate-800">{company.profile.country || ""}</td> : null}{customerCompanyVisibleColumns.taxId ? <td className="border-b border-slate-200 px-6 py-5 dark:border-slate-800">{company.profile.taxId || ""}</td> : null}<td className="border-b border-slate-200 px-3 py-5 dark:border-slate-800" /></tr>)}{customerCompanySearchPageRows.length === 0 ? <tr><td colSpan={2 + Object.values(customerCompanyVisibleColumns).filter(Boolean).length} className="px-6 py-16 text-center text-sm text-slate-500">No related companies found.</td></tr> : null}</tbody>
                  </table>
                </div>
                <div className="flex gap-2 border-t border-slate-200 px-6 py-4 dark:border-slate-800"><button type="button" onClick={openCustomerCompanyCreator} className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">Create</button><button type="button" onClick={() => setCustomerCompanySearchModalOpen(false)} className="rounded-full bg-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200">Cancel</button></div>
              </div>
            </div>
          ) : null}

          {customerEditorOpen && customerCompanyCreatorOpen ? (
            <div role="dialog" aria-modal="true" aria-labelledby="customer-company-creator-title" className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-1 sm:p-3">
              <div className="flex h-[calc(100vh-1rem)] w-full max-w-[122rem] flex-col overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950 sm:h-[calc(100vh-1.5rem)]">
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-800"><h3 id="customer-company-creator-title" className="text-2xl font-bold text-slate-900 dark:text-white">Create: Related Company</h3><button type="button" onClick={() => setCustomerCompanyCreatorOpen(false)} aria-label="Close company form" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-6 w-6" /></button></div>
                <div className="loan-primary-fields min-h-0 flex-1 overflow-y-auto px-6 py-3">
                  <div className="flex justify-end"><div className="inline-flex cursor-not-allowed rounded-full border border-slate-200 p-0.5 dark:border-slate-700" aria-label="Customer and vendor status" title="Read only — use the Customer and Vendor checkboxes below">{[["customer", "Customer"], ["vendor", "Vendor"], ["customer_vendor", "Customer & Vendor"]].map(([value, label]) => <span key={value} className={`cursor-not-allowed select-none rounded-full px-5 py-2.5 text-sm font-semibold ${customerCompanyDraft.profile.relationship === value ? "bg-emerald-600 text-white" : "text-slate-700 dark:text-slate-200"}`}>{label}</span>)}</div></div>
                  <div className="mt-4 flex flex-col-reverse gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex gap-10 text-sm font-semibold text-slate-700 dark:text-slate-200"><label className="flex items-center gap-3"><input type="radio" className="h-5 w-5 accent-emerald-600" checked={customerCompanyDraft.profile.entityType === "individual"} onChange={() => setCustomerCompanyProfile("entityType", "individual")} />Individual</label><label className="flex items-center gap-3"><input type="radio" className="h-5 w-5 accent-emerald-600" checked={(customerCompanyDraft.profile.entityType || "company") === "company"} onChange={() => setCustomerCompanyProfile("entityType", "company")} />Company</label></div>
                    <div className="flex flex-wrap justify-end gap-2">{([["Sales", "0", CircleDollarSign], ["Purchases", "0", CreditCard], ["Invoiced", "0.00", FilePlus2], ["Vendor Bills", "0", FilePlus2], ["Loans", "0.00", HandCoins]] as const).map(([label, value, Icon]) => <div key={label} className="flex min-w-36 items-center gap-3 rounded-full border border-slate-200 px-4 py-2 dark:border-slate-700"><Icon className="h-7 w-7 text-slate-400" /><div><p className="text-sm font-bold text-slate-600 dark:text-slate-300">{value}</p><p className="text-xs font-semibold text-slate-500">{label}</p></div></div>)}</div>
                  </div>
                  <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_9rem]">
                    <div className="max-w-4xl space-y-4"><input autoFocus className={`${inputClass} text-3xl font-medium`} value={customerCompanyDraft.fullName} onChange={(event) => setCustomerCompanyDraft((current) => ({ ...current, fullName: event.target.value }))} placeholder="Name" /><input className={`${inputClass} text-xl`} value={customerCompanyDraft.profile.nameKhmer || ""} onChange={(event) => setCustomerCompanyProfile("nameKhmer", event.target.value)} placeholder="Name (Khmer)" /></div>
                    <div className="flex flex-col items-center gap-2"><button type="button" disabled={customerCompanyImageUploading} onClick={() => customerCompanyImageInputRef.current?.click()} className="relative flex h-28 w-28 items-center justify-center overflow-hidden border border-slate-300 bg-slate-50 text-slate-400 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900">{customerCompanyDraft.profile.imageUrl ? <span className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${JSON.stringify(customerCompanyDraft.profile.imageUrl).slice(1, -1)})` }} /> : <Camera className="h-10 w-10" />}{customerCompanyImageUploading ? <span className="absolute inset-0 flex items-center justify-center bg-white/80"><Loader2 className="h-6 w-6 animate-spin text-emerald-600" /></span> : null}</button><input ref={customerCompanyImageInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(event) => void uploadCustomerCompanyImage(event)} /><span className="text-xs text-slate-500">Binary file</span></div>
                  </div>
                  <div className="mt-6 flex gap-10 text-sm font-semibold text-slate-800 dark:text-slate-100"><label className="flex items-center gap-3"><input type="checkbox" className="h-5 w-5 accent-emerald-600" checked={customerCompanyDraft.profile.relationship === "customer" || customerCompanyDraft.profile.relationship === "customer_vendor"} onChange={(event) => setCustomerCompanyProfile("relationship", toggleCustomerVendorRelationship(customerCompanyDraft.profile.relationship, "customer", event.target.checked))} />Customer</label><label className="flex items-center gap-3"><input type="checkbox" className="h-5 w-5 accent-emerald-600" checked={customerCompanyDraft.profile.relationship === "vendor" || customerCompanyDraft.profile.relationship === "customer_vendor"} onChange={(event) => setCustomerCompanyProfile("relationship", toggleCustomerVendorRelationship(customerCompanyDraft.profile.relationship, "vendor", event.target.checked))} />Vendor</label></div>
                  <div className="mt-8 flex flex-wrap border-b border-slate-300 dark:border-slate-700">{[["general", "General Information"], ["contacts", "Contacts & Addresses"], ["sales", "Sales & Purchase"], ["invoicing", "Invoicing"], ["map", "Map"], ["notes", "Internal Notes"]].map(([value, label]) => <button key={value} type="button" onClick={() => setCustomerCompanyEditorTab(value as RelatedContactEditorTab)} className={`border border-b-0 px-5 py-3 text-sm font-semibold ${customerCompanyEditorTab === value ? "rounded-t-lg border-slate-300 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white" : "border-transparent text-slate-500"}`}>{label}</button>)}</div>
                  {customerCompanyEditorTab === "general" ? <div className="mt-7 grid gap-x-16 gap-y-10 lg:grid-cols-2">
                    <section><h4 className="mb-5 border-l-4 border-emerald-600 pl-3 text-2xl font-medium text-slate-700 dark:text-slate-200">Address</h4><div className="space-y-4"><label className="loan-form-row"><span>Address 1</span><input className={inputClass} value={customerCompanyDraft.address || ""} onChange={(event) => setCustomerCompanyDraft((current) => ({ ...current, address: event.target.value || null }))} placeholder="Address 1" /></label><label className="loan-form-row"><span>Address 2</span><input className={inputClass} value={customerCompanyDraft.profile.address2 || ""} onChange={(event) => setCustomerCompanyProfile("address2", event.target.value)} placeholder="Address 2" /></label><label className="loan-form-row"><span>Country</span><CountryPicker value={customerCompanyDraft.profile.country || ""} onChange={(value) => setCustomerCompanyProfile("country", value)} onSearchMore={() => openCountrySearch((value) => setCustomerCompanyProfile("country", value))} /></label></div></section>
                    <section><h4 className="mb-5 border-l-4 border-emerald-600 pl-3 text-2xl font-medium text-slate-700 dark:text-slate-200">Contact</h4><div className="space-y-4"><label className="loan-form-row"><span>Phone</span><input className={inputClass} value={customerCompanyDraft.phone || ""} onChange={(event) => setCustomerCompanyDraft((current) => ({ ...current, phone: event.target.value || null }))} placeholder="Phone" /></label><label className="loan-form-row"><span>Mobile</span><input className={inputClass} value={customerCompanyDraft.profile.mobile || ""} onChange={(event) => setCustomerCompanyProfile("mobile", event.target.value)} placeholder="Mobile" /></label><label className="loan-form-row"><span>Email</span><input type="email" className={inputClass} value={customerCompanyDraft.email || ""} onChange={(event) => setCustomerCompanyDraft((current) => ({ ...current, email: event.target.value || null }))} placeholder="Email" /></label><label className="loan-form-row"><span>Website Link</span><input className={inputClass} value={customerCompanyDraft.profile.website || ""} onChange={(event) => setCustomerCompanyProfile("website", event.target.value)} placeholder="e.g. https://www.example.com" /></label><label className="loan-form-row"><span>Tags</span><CustomerTagsPicker value={customerCompanyDraft.profile.tags || ""} options={customerTagOptions} onChange={(value) => setCustomerCompanyProfile("tags", value)} onAdd={addCustomerTagOption} /></label><label className="loan-form-row"><span>Category</span><CustomerCategoryPicker value={customerCompanyDraft.profile.category || ""} options={customerCategoryOptions} onChange={(value) => setCustomerCompanyProfile("category", value)} onCreate={() => openCustomerCategoryEditor((value) => setCustomerCompanyProfile("category", value))} /></label></div></section>
                    <section className="pb-8"><h4 className="mb-5 border-l-4 border-emerald-600 pl-3 text-2xl font-medium text-slate-700 dark:text-slate-200">Compliance</h4><div className="space-y-4"><label className="loan-form-row"><span>Tax ID</span><input className={inputClass} value={customerCompanyDraft.profile.taxId || ""} onChange={(event) => setCustomerCompanyProfile("taxId", event.target.value)} placeholder="e.g. KXXX-XXXXXXXXX" /></label><label className="loan-form-row"><span>Tax Type</span><div className="relative"><select className={`${inputClass} appearance-none pr-10`} value={customerCompanyDraft.profile.taxType || ""} onChange={(event) => setCustomerCompanyProfile("taxType", event.target.value)}><option value="">Tax Type</option><option>Non-Taxable Person</option><option>Taxable Person</option><option>Overseas Company</option></select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /></div></label><label className="loan-form-row"><span>Code</span><input className={inputClass} value={customerCompanyDraft.profile.code || ""} onChange={(event) => setCustomerCompanyProfile("code", event.target.value)} placeholder="Code" /></label></div></section>
                  </div> : null}
                  {customerCompanyEditorTab === "contacts" ? <div className="customer-contact-list min-h-72 py-8"><button type="button" onClick={() => openCustomerContactEditor("company")} className="inline-flex items-center gap-2 rounded-full bg-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200"><SquarePlus className="h-4 w-4" />Add</button>{customerCompanyContactRows.length ? <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{customerCompanyContactRows.map((contact, index) => <article key={`saved-company-contact-${index}`} className="relative rounded-2xl border border-slate-200 p-4 dark:border-slate-800"><p className="font-semibold text-slate-900 dark:text-white">{contact.name || contact.type || `Contact ${index + 1}`}</p><p className="mt-1 text-xs font-medium text-slate-500">{contact.type || "Other Address"}</p><p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{[contact.address1, contact.address2, contact.country].filter(Boolean).join(", ") || "No address"}</p><p className="mt-1 text-sm text-slate-500">{[contact.email, contact.phone, contact.mobile].filter(Boolean).join(" · ") || "No contact details"}</p><button type="button" onClick={() => setCustomerCompanyProfile("additionalContacts", JSON.stringify(customerCompanyContactRows.filter((_, rowIndex) => rowIndex !== index)))} aria-label={`Remove ${contact.name || "contact"}`} className="absolute right-3 top-3 rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button></article>)}</div> : <p className="mt-10 text-center text-sm text-slate-500">No additional contacts added.</p>}</div> : null}
                  {customerCompanyEditorTab === "sales" ? <SalesPurchaseTab profile={customerCompanyDraft.profile} onChange={setCustomerCompanyProfile} salespersonOptions={loanContactStaffOptions.map((option) => option.full_name?.trim() || option.username)} /> : null}
                  {customerCompanyEditorTab === "invoicing" ? <div className="mt-7 grid gap-5 md:grid-cols-2"><Field label="Account Receivable"><input className={inputClass} value={customerCompanyDraft.profile.accountReceivable || ""} onChange={(event) => setCustomerCompanyProfile("accountReceivable", event.target.value)} /></Field><Field label="Account Payable"><input className={inputClass} value={customerCompanyDraft.profile.accountPayable || ""} onChange={(event) => setCustomerCompanyProfile("accountPayable", event.target.value)} /></Field></div> : null}
                  {customerCompanyEditorTab === "map" ? <div className="mt-7"><Field label="Google Maps Link"><input className={inputClass} value={customerCompanyDraft.profile.googleMapsLink || ""} onChange={(event) => setCustomerCompanyProfile("googleMapsLink", event.target.value)} placeholder="https://maps.google.com/..." /></Field></div> : null}
                  {customerCompanyEditorTab === "notes" ? <div className="mt-7"><textarea className={`${inputClass} min-h-52 resize-y`} value={customerCompanyDraft.profile.internalNotes || ""} onChange={(event) => setCustomerCompanyProfile("internalNotes", event.target.value)} placeholder="Internal notes..." /></div> : null}
                </div>
                <div className="flex gap-2 border-t border-slate-200 px-6 py-4 dark:border-slate-800"><button type="button" disabled={customerCompanySaving} onClick={() => void saveCustomerCompany()} className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">{customerCompanySaving ? "Saving..." : "Save"}</button><button type="button" onClick={() => setCustomerCompanyCreatorOpen(false)} className="rounded-full bg-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200">Discard</button></div>
              </div>
            </div>
          ) : null}

          {customerEditorOpen && customerContactEditorOpen ? (
            <div role="dialog" aria-modal="true" aria-labelledby="customer-contact-editor-title" className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-1 sm:p-3">
              <div className="flex h-[calc(100vh-1rem)] w-full max-w-[122rem] flex-col overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950 sm:h-[calc(100vh-1.5rem)]">
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-800"><h3 id="customer-contact-editor-title" className="text-2xl font-bold text-slate-900 dark:text-white">Create Contact</h3><button type="button" onClick={() => setCustomerContactEditorOpen(false)} aria-label="Close contact editor" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-6 w-6" /></button></div>
                <div className="loan-primary-fields min-h-0 flex-1 overflow-y-auto px-6 py-6">
                  <div className="flex flex-wrap gap-x-12 gap-y-4 text-sm font-semibold text-slate-700 dark:text-slate-200">{["Contact", "Invoice Address", "Delivery Address", "Other Address", "Private Address"].map((type) => <label key={type} className="flex cursor-pointer items-center gap-3"><input type="radio" className="h-5 w-5 accent-emerald-600" checked={(customerContactDraft.type || "Contact") === type} onChange={() => setCustomerContactDraft((current) => ({ ...current, type }))} />{type}</label>)}</div>
                  <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_10rem]">
                    <div className="max-w-4xl space-y-5"><input autoFocus className={`${inputClass} text-2xl`} value={customerContactDraft.name || ""} onChange={(event) => setCustomerContactDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Name" /><input className={`${inputClass} text-xl`} value={customerContactDraft.nameKhmer || ""} onChange={(event) => setCustomerContactDraft((current) => ({ ...current, nameKhmer: event.target.value }))} placeholder="Name (Khmer)" /></div>
                    <div className="flex flex-col items-center gap-2"><button type="button" disabled={customerContactImageUploading} onClick={() => customerContactImageInputRef.current?.click()} className="relative flex h-32 w-32 items-center justify-center overflow-hidden border border-slate-300 bg-slate-50 text-slate-400 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900" aria-label="Upload contact image">{customerContactDraft.imageUrl ? <span className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${JSON.stringify(customerContactDraft.imageUrl).slice(1, -1)})` }} /> : <Camera className="h-12 w-12" />}{customerContactImageUploading ? <span className="absolute inset-0 flex items-center justify-center bg-white/80"><Loader2 className="h-6 w-6 animate-spin text-emerald-600" /></span> : null}</button><input ref={customerContactImageInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(event) => void uploadCustomerContactImage(event)} /><span className="text-xs text-slate-500">Binary file</span></div>
                  </div>
                  <div className="mt-10 grid gap-x-16 gap-y-5 lg:grid-cols-2">
                    <div className="space-y-5">
                      {(customerContactDraft.type || "Contact") === "Contact" ? <>
                        <div className="loan-form-row">
                          <span>Title</span>
                          <div className="relative">
                            <input className={`${inputClass} pr-10`} value={customerContactDraft.title || ""} onChange={(event) => { setCustomerContactDraft((current) => ({ ...current, title: event.target.value, titleAbbreviation: "" })); setCustomerTitlePickerOpen(true); }} onFocus={() => setCustomerTitlePickerOpen(true)} onBlur={() => window.setTimeout(() => setCustomerTitlePickerOpen(false), 150)} placeholder="e.g. Mr." autoComplete="off" role="combobox" aria-expanded={customerTitlePickerOpen} aria-controls="customer-title-options" />
                            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                            {customerTitlePickerOpen ? <div id="customer-title-options" className="absolute left-0 top-[calc(100%+0.2rem)] z-30 w-full overflow-hidden border border-slate-300 bg-white py-2 shadow-xl dark:border-slate-700 dark:bg-slate-950">{customerTitleOptions.filter((option) => !customerContactDraft.title || option.title.toLowerCase().includes((customerContactDraft.title || "").toLowerCase()) || option.abbreviation.toLowerCase().includes((customerContactDraft.title || "").toLowerCase())).map((option) => <button key={option.title} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { setCustomerContactDraft((current) => ({ ...current, title: option.title, titleAbbreviation: option.abbreviation })); setCustomerTitlePickerOpen(false); }} className="flex w-full items-center justify-between px-5 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"><span>{option.title}</span><span className="text-xs text-slate-400">{option.abbreviation}</span></button>)}<button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => openCustomerTitleEditor("contact")} className="mt-1 block w-full border-t border-slate-200 px-5 py-3 text-center text-sm font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-slate-800 dark:text-emerald-300">Create and Edit...</button></div> : null}
                          </div>
                        </div>
                        <label className="loan-form-row"><span>Job Position</span><input className={inputClass} value={customerContactDraft.jobPosition || ""} onChange={(event) => setCustomerContactDraft((current) => ({ ...current, jobPosition: event.target.value }))} placeholder="e.g. Sales Director" /></label>
                      </> : <>
                        <label className="loan-form-row"><span>Address 1</span><input className={inputClass} value={customerContactDraft.address1} onChange={(event) => setCustomerContactDraft((current) => ({ ...current, address1: event.target.value }))} placeholder="Address 1" /></label>
                        <label className="loan-form-row"><span>Address 2</span><input className={inputClass} value={customerContactDraft.address2} onChange={(event) => setCustomerContactDraft((current) => ({ ...current, address2: event.target.value }))} placeholder="Address 2" /></label>
                        <label className="loan-form-row"><span>Country</span><CountryPicker value={customerContactDraft.country} onChange={(value) => setCustomerContactDraft((current) => ({ ...current, country: value }))} onSearchMore={() => openCountrySearch((value) => setCustomerContactDraft((current) => ({ ...current, country: value })))} /></label>
                      </>}
                    </div>
                    <div className="space-y-5">
                      <label className="loan-form-row"><span>Email</span><input type="email" className={inputClass} value={customerContactDraft.email} onChange={(event) => setCustomerContactDraft((current) => ({ ...current, email: event.target.value }))} placeholder="Email" /></label>
                      <label className="loan-form-row"><span>Phone</span><input className={inputClass} value={customerContactDraft.phone} onChange={(event) => setCustomerContactDraft((current) => ({ ...current, phone: event.target.value }))} placeholder="Phone" /></label>
                      <label className="loan-form-row"><span>Mobile</span><input className={inputClass} value={customerContactDraft.mobile} onChange={(event) => setCustomerContactDraft((current) => ({ ...current, mobile: event.target.value }))} placeholder="Mobile" /></label>
                      <label className="loan-form-row"><span>Notes</span><textarea rows={3} className={`${inputClass} resize-y`} value={customerContactDraft.notes} onChange={(event) => setCustomerContactDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Internal notes..." /></label>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 border-t border-slate-200 px-6 py-4 dark:border-slate-800"><button type="button" onClick={() => saveCustomerContact(false)} className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">Save &amp; Close</button><button type="button" onClick={() => saveCustomerContact(true)} className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">Save &amp; New</button><button type="button" onClick={() => setCustomerContactEditorOpen(false)} className="rounded-full bg-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200">Discard</button></div>
              </div>
            </div>
          ) : null}

          {customerTitleEditorOpen ? (
            <div role="dialog" aria-modal="true" aria-labelledby="customer-title-editor-title" className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 p-4">
              <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950">
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-800"><h3 id="customer-title-editor-title" className="text-2xl font-bold text-slate-900 dark:text-white">Create: Title</h3><button type="button" onClick={() => setCustomerTitleEditorOpen(false)} aria-label="Close title editor" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-6 w-6" /></button></div>
                <div className="loan-primary-fields space-y-6 px-6 py-10">
                  <div className="loan-form-row"><label htmlFor="customer-title-name" className="text-sm font-semibold text-slate-700 dark:text-slate-200">Title</label><div className="flex items-center gap-3"><input id="customer-title-name" autoFocus className={inputClass} value={customerTitleDraft.title} onChange={(event) => setCustomerTitleDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Title" /><span className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">EN</span></div></div>
                  <div className="loan-form-row"><label htmlFor="customer-title-abbreviation" className="text-sm font-semibold text-slate-700 dark:text-slate-200">Abbreviation</label><div className="flex items-center gap-3"><input id="customer-title-abbreviation" className={inputClass} value={customerTitleDraft.abbreviation} onChange={(event) => setCustomerTitleDraft((current) => ({ ...current, abbreviation: event.target.value }))} placeholder="Abbreviation" /><span className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">EN</span></div></div>
                </div>
                <div className="flex gap-2 border-t border-slate-200 px-6 py-4 dark:border-slate-800"><button type="button" disabled={!customerTitleDraft.title.trim()} onClick={saveCustomerTitle} className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">Save</button><button type="button" onClick={() => setCustomerTitleEditorOpen(false)} className="rounded-full bg-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200">Discard</button></div>
              </div>
            </div>
          ) : null}

          {customerSearchModalOpen ? (
            <div role="dialog" aria-modal="true" aria-labelledby="customer-search-title" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-3 sm:p-6">
              <div className="flex max-h-[calc(100vh-1.5rem)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950 sm:max-h-[calc(100vh-3rem)]">
                <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800"><div><h3 id="customer-search-title" className="text-xl font-bold text-slate-900 dark:text-white">Search: Customer</h3><p className="mt-0.5 text-sm text-slate-500">Choose a saved customer for this loan.</p></div><button type="button" onClick={() => setCustomerSearchModalOpen(false)} aria-label="Close customer search" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"><X className="h-5 w-5" /></button></div>
                <div className="border-b border-slate-200 px-5 py-3 dark:border-slate-800"><div className="relative max-w-xl"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input autoFocus className={`${inputClass} pl-9`} value={customerSearchText} onChange={(event) => setCustomerSearchText(event.target.value)} placeholder="Type to search name, phone, email, or National ID" /></div></div>
                <div className="min-h-0 flex-1 overflow-auto overscroll-contain p-3 sm:p-5">
                  <table className="w-full min-w-[720px] border-separate border-spacing-0 text-left text-sm"><thead className="sticky top-0 z-10 bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300"><tr><th className="rounded-l-xl px-4 py-3 font-semibold">Name</th><th className="px-4 py-3 font-semibold">Phone</th><th className="px-4 py-3 font-semibold">Email</th><th className="rounded-r-xl px-4 py-3 font-semibold">Address</th></tr></thead><tbody>{customerSearchLoading ? <tr><td colSpan={4} className="px-4 py-12 text-center text-slate-500"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />Loading customers…</td></tr> : null}{!customerSearchLoading && customerSearchResults.map((borrower) => <tr key={borrower.id} onClick={() => { selectCustomer(borrower); setCustomerSearchModalOpen(false); }} className="cursor-pointer text-slate-700 transition hover:bg-emerald-50 dark:text-slate-200 dark:hover:bg-emerald-500/10"><td className="border-b border-slate-200 px-4 py-3.5 font-medium dark:border-slate-800">{borrower.fullName}</td><td className="border-b border-slate-200 px-4 py-3.5 dark:border-slate-800">{borrower.phone || "—"}</td><td className="border-b border-slate-200 px-4 py-3.5 dark:border-slate-800">{borrower.email || "—"}</td><td className="max-w-sm truncate border-b border-slate-200 px-4 py-3.5 dark:border-slate-800">{borrower.address || "—"}</td></tr>)}{!customerSearchLoading && customerSearchResults.length === 0 ? <tr><td colSpan={4} className="px-4 py-12 text-center text-slate-500">No customers found.</td></tr> : null}</tbody></table>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-5 py-4 dark:border-slate-800"><p className="text-sm text-slate-500">{customerSearchResults.length} customer{customerSearchResults.length === 1 ? "" : "s"} shown</p><div className="flex gap-2"><button type="button" onClick={() => { setCustomerSearchModalOpen(false); openCustomerEditor(); }} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"><Plus className="h-4 w-4" />Create</button><button type="button" onClick={() => setCustomerSearchModalOpen(false)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Cancel</button></div></div>
              </div>
            </div>
          ) : null}

          {loanTypeEditorOpen ? (
            <div role="dialog" aria-modal="true" aria-labelledby="loan-type-editor-title" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-3 sm:p-6">
              <div className="flex max-h-[calc(100vh-1.5rem)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950 sm:max-h-[calc(100vh-3rem)]">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                  <div><h3 id="loan-type-editor-title" className="text-xl font-bold text-slate-900 dark:text-white">{loanTypeEditorMode === "open" ? "Open: Loan Type" : "Create: Loan Type"}</h3><p className="mt-0.5 text-sm text-slate-500">{loanTypeEditorMode === "open" ? "Review or update the selected loan product." : "Set up a reusable loan product for the organisation."}</p></div>
                  <button type="button" onClick={() => { setLoanTypeTranslationOpen(false); setLoanTypeEditorOpen(false); }} aria-label="Close loan type editor" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"><X className="h-5 w-5" /></button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5">
                  {loanTypeEditorLoading ? <p className="mb-4 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-500 dark:bg-slate-900"><Loader2 className="h-4 w-4 animate-spin" />Loading loan type…</p> : null}
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Name" className="md:col-span-2"><div className="flex items-center gap-3"><input autoFocus className={inputClass} value={loanTypeEditor.name} onChange={(event) => setLoanTypeEditor((current) => ({ ...current, name: event.target.value }))} placeholder="Loan type name" /><button type="button" onClick={openLoanTypeTranslation} aria-haspopup="dialog" aria-label="Translate loan type name" className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-300">EN</button></div></Field>
                    <Field label="Amount Offer"><div className="relative"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span><input type="number" min="0" step="0.01" className={`${inputClass} pl-7`} value={loanTypeEditor.amountOffer} onChange={(event) => setLoanTypeEditor((current) => ({ ...current, amountOffer: Number(event.target.value) || 0 }))} /></div></Field>
                    <Field label="Min Offer"><div className="relative"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span><input type="number" min="0" step="0.01" className={`${inputClass} pl-7`} value={loanTypeEditor.minOffer} onChange={(event) => setLoanTypeEditor((current) => ({ ...current, minOffer: Number(event.target.value) || 0 }))} /></div></Field>
                    <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"><input type="checkbox" checked={loanTypeEditor.approverRequired} onChange={(event) => setLoanTypeEditor((current) => ({ ...current, approverRequired: event.target.checked }))} className="h-5 w-5 rounded border-slate-300 text-emerald-600" />Approver</label>
                    <Field label="Max Offer"><div className="relative"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span><input type="number" min="0" step="0.01" className={`${inputClass} pl-7`} value={loanTypeEditor.maxOffer} onChange={(event) => setLoanTypeEditor((current) => ({ ...current, maxOffer: Number(event.target.value) || 0 }))} /></div></Field>
                  </div>
                  <div className="mt-6 flex gap-1 border-b border-slate-200 dark:border-slate-800"><button type="button" onClick={() => setLoanTypeEditorTab("general")} className={`border-b-2 px-4 py-2.5 text-sm font-semibold ${loanTypeEditorTab === "general" ? "border-emerald-600 text-emerald-700 dark:text-emerald-300" : "border-transparent text-slate-500"}`}>General Information</button><button type="button" onClick={() => setLoanTypeEditorTab("approvers")} className={`border-b-2 px-4 py-2.5 text-sm font-semibold ${loanTypeEditorTab === "approvers" ? "border-emerald-600 text-emerald-700 dark:text-emerald-300" : "border-transparent text-slate-500"}`}>Approvers</button></div>
                  {loanTypeEditorTab === "general" ? <div className="mt-5 grid gap-4 md:grid-cols-2"><div className="grid content-start gap-4"><Field label="Contract Terms"><input className={inputClass} value={loanTypeEditor.contractTerms || ""} onChange={(event) => setLoanTypeEditor((current) => ({ ...current, contractTerms: event.target.value }))} placeholder="Contract terms" /></Field><Field label="Currency"><div className="relative"><select className={`${inputClass} appearance-none pr-10`} value={loanTypeEditor.currency} onChange={(event) => setLoanTypeEditor((current) => ({ ...current, currency: event.target.value }))}><option>USD</option><option>KHR</option></select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /></div></Field><Field label="Sequence Code"><input className={inputClass} value={loanTypeEditor.sequenceCode || ""} onChange={(event) => setLoanTypeEditor((current) => ({ ...current, sequenceCode: event.target.value }))} placeholder="LOAN" /></Field></div><div className="grid gap-4">{renderLoanAccountField("Income Account", "incomeAccount")}{renderLoanAccountField("Penalty Account", "penaltyAccount")}{renderLoanAccountField("Fee Account", "feeAccount")}{renderLoanAccountField("Bad Debt Account", "badDebtAccount")}</div></div> : (
                    <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                      <div className="grid grid-cols-[minmax(0,1fr)_110px_48px] items-center bg-slate-100 px-4 py-3 text-sm font-bold text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                        <span>Approvers</span><span className="text-center">Required</span><span aria-hidden="true" />
                      </div>
                      {loanTypeEditor.approvers.map((approver) => (
                        <div key={approver.username} className="grid min-h-14 grid-cols-[minmax(0,1fr)_110px_48px] items-center border-t border-slate-200 px-4 py-2 text-sm text-slate-700 dark:border-slate-800 dark:text-slate-200">
                          <span className="truncate pr-3 font-medium" title={approver.name}>{approver.name}</span>
                          <label className="flex justify-center" title={`Required approval from ${approver.name}`}><span className="sr-only">Required approval from {approver.name}</span><input type="checkbox" checked={approver.required} onChange={(event) => setLoanTypeApproverRequired(approver.username, event.target.checked)} className="h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" /></label>
                          <button type="button" onClick={() => removeLoanTypeApprover(approver.username)} aria-label={`Remove ${approver.name}`} title="Remove approver" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      ))}
                      {loanTypeEditor.approvers.length === 0 && !loanTypeApproverPickerOpen ? <p className="border-t border-slate-200 px-4 py-5 text-sm text-slate-500 dark:border-slate-800">No approvers added yet.</p> : null}
                      {loanTypeApproverPickerOpen ? (
                        <div className="border-t border-slate-200 p-3 dark:border-slate-800">
                          <div className="flex items-center gap-2">
                            <div className="relative min-w-0 flex-1">
                              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                              <input autoFocus value={loanTypeApproverSearch} onChange={(event) => setLoanTypeApproverSearch(event.target.value)} className={`${inputClass} pl-9`} placeholder="Search approver by name, username, or role" role="combobox" aria-expanded="true" aria-controls="loan-type-approver-results" />
                            </div>
                            <button type="button" onClick={() => { setLoanTypeApproverPickerOpen(false); setLoanTypeApproverSearch(""); }} aria-label="Cancel adding approver" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-4 w-4" /></button>
                          </div>
                          <div id="loan-type-approver-results" role="listbox" className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-950">
                            {loanTypeApproversLoading ? <p className="flex items-center gap-2 px-3 py-3 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Loading users…</p> : null}
                            {!loanTypeApproversLoading && filteredLoanTypeApproverOptions.map((user) => (
                              <button key={user.username} type="button" role="option" aria-selected="false" onClick={() => addLoanTypeApprover(user.username)} className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-800 dark:text-slate-200 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-200">
                                <span className="min-w-0"><span className="block truncate font-semibold">{user.full_name?.trim() || user.username}</span><span className="block truncate text-xs text-slate-500">@{user.username}</span></span>
                                {user.role ? <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold capitalize text-slate-600 dark:bg-slate-800 dark:text-slate-300">{user.role.replace(/[_-]+/g, " ")}</span> : null}
                              </button>
                            ))}
                            {!loanTypeApproversLoading && filteredLoanTypeApproverOptions.length === 0 ? <p className="px-3 py-4 text-center text-sm text-slate-500">No matching approvers found.</p> : null}
                          </div>
                        </div>
                      ) : (
                        <button type="button" onClick={() => { setLoanTypeApproverSearch(""); setLoanTypeApproverPickerOpen(true); }} className="flex w-full items-center gap-2 border-t border-slate-200 px-4 py-3 text-left text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 dark:border-slate-800 dark:text-emerald-300 dark:hover:bg-emerald-500/10"><Plus className="h-4 w-4" />Add a line</button>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-800"><button type="button" onClick={() => { setLoanTypeTranslationOpen(false); setLoanTypeEditorOpen(false); }} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Discard</button><button type="button" disabled={loanTypeSaving || loanTypeEditorLoading} onClick={saveLoanTypeEditor} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">{loanTypeSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Save</button></div>
              </div>
            </div>
          ) : null}

          {loanTypeEditorOpen && loanTypeTranslationOpen ? (
            <div role="dialog" aria-modal="true" aria-labelledby="loan-type-translation-title" className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/35 p-3 sm:p-6">
              <div className="w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                  <h3 id="loan-type-translation-title" className="text-xl font-bold text-slate-900 dark:text-white">Translate: name</h3>
                  <button type="button" onClick={() => setLoanTypeTranslationOpen(false)} aria-label="Close name translation" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"><X className="h-5 w-5" /></button>
                </div>
                <div className="grid gap-x-6 gap-y-4 p-5 md:grid-cols-[220px_minmax(0,1fr)] md:p-6">
                  <label htmlFor="loan-type-name-en" className="self-center text-sm font-semibold text-slate-700 dark:text-slate-200">English (US)</label>
                  <input id="loan-type-name-en" autoFocus className={inputClass} value={loanTypeTranslationDraft.english} onChange={(event) => setLoanTypeTranslationDraft((current) => ({ ...current, english: event.target.value }))} placeholder="English loan type name" />
                  <label htmlFor="loan-type-name-km" className="self-center text-sm font-semibold text-slate-700 dark:text-slate-200">Khmer / ភាសាខ្មែរ</label>
                  <input id="loan-type-name-km" className={inputClass} value={loanTypeTranslationDraft.khmer} onChange={(event) => setLoanTypeTranslationDraft((current) => ({ ...current, khmer: event.target.value }))} placeholder="ឈ្មោះប្រភេទកម្ចីជាភាសាខ្មែរ" />
                </div>
                <div className="flex gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-800">
                  <button type="button" onClick={saveLoanTypeTranslation} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Save</button>
                  <button type="button" onClick={() => setLoanTypeTranslationOpen(false)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Discard</button>
                </div>
              </div>
            </div>
          ) : null}

          {loanTypeEditorOpen && loanAccountSearchModalOpen ? (
            <div role="dialog" aria-modal="true" aria-labelledby="loan-account-search-title" className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 p-3 sm:p-6">
              <div className="flex max-h-[calc(100vh-3rem)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800"><div><h3 id="loan-account-search-title" className="text-xl font-bold text-slate-900 dark:text-white">Search: Account</h3><p className="mt-0.5 text-sm text-slate-500">Find an account by code or name.</p></div><button type="button" onClick={() => setLoanAccountSearchModalOpen(false)} aria-label="Close account search" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button></div>
                <div className="border-b border-slate-200 p-4 dark:border-slate-800"><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input autoFocus className={`${inputClass} pl-9`} value={loanAccountSearch} onChange={(event) => setLoanAccountSearch(event.target.value)} placeholder="Search account code or name" /></div></div>
                <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5"><table className="w-full text-left text-sm"><thead className="sticky top-0 bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300"><tr><th className="rounded-l-xl px-4 py-3">Code</th><th className="px-4 py-3">Account Name</th><th className="rounded-r-xl px-4 py-3">Type</th></tr></thead><tbody>{filteredLoanChartAccounts.map((account) => <tr key={account.id || account.code} onClick={() => selectLoanChartAccount(account)} className="cursor-pointer text-slate-700 hover:bg-emerald-50 dark:text-slate-200 dark:hover:bg-emerald-500/10"><td className="border-b border-slate-200 px-4 py-3 font-semibold dark:border-slate-800">{account.code}</td><td className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">{account.name}</td><td className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">{account.type}</td></tr>)}{filteredLoanChartAccounts.length === 0 ? <tr><td colSpan={3} className="px-4 py-12 text-center text-slate-500">No matching accounts found.</td></tr> : null}</tbody></table></div>
                <div className="flex justify-between gap-3 border-t border-slate-200 px-5 py-4 dark:border-slate-800"><button type="button" onClick={() => loanAccountPickerField && openLoanAccountEditor(loanAccountPickerField)} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Create and Edit…</button><button type="button" onClick={() => setLoanAccountSearchModalOpen(false)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-300">Cancel</button></div>
              </div>
            </div>
          ) : null}

          {loanTypeEditorOpen && loanAccountEditorOpen ? (
            <div role="dialog" aria-modal="true" aria-labelledby="loan-account-editor-title" className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-3 sm:p-6">
              <div className="flex max-h-[calc(100vh-1.5rem)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950 sm:max-h-[calc(100vh-3rem)]">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800"><h3 id="loan-account-editor-title" className="text-xl font-bold text-slate-900 dark:text-white">{loanAccountEditorMode === "open" ? "Open: Account" : "Create: Account"}</h3><button type="button" onClick={() => setLoanAccountEditorOpen(false)} aria-label="Close account editor" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button></div>
                <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
                  <div className="mb-5 flex justify-end"><button type="button" onClick={openLoanAccountJournal} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"><List className="h-4 w-4" />Journal Items</button></div>
                  <div className="grid max-w-3xl gap-4 md:grid-cols-[210px_minmax(0,1fr)]">
                    <label htmlFor="loan-account-code" className="self-center text-sm font-semibold text-slate-700 dark:text-slate-200">Code</label><input id="loan-account-code" autoFocus className={inputClass} value={loanAccountEditor.code} onChange={(event) => setLoanAccountEditor((current) => ({ ...current, code: event.target.value }))} />
                    <label htmlFor="loan-account-name" className="self-center text-sm font-semibold text-slate-700 dark:text-slate-200">Name</label><input id="loan-account-name" className={inputClass} value={loanAccountEditor.name} onChange={(event) => setLoanAccountEditor((current) => ({ ...current, name: event.target.value }))} />
                    <label htmlFor="loan-account-type" className="self-center text-sm font-semibold text-slate-700 dark:text-slate-200">Type</label><div className="relative"><select id="loan-account-type" className={`${inputClass} appearance-none pr-10`} value={loanAccountEditor.type} onChange={(event) => setLoanAccountEditor((current) => ({ ...current, type: event.target.value }))}>
                      <optgroup label="Assets"><option>Bank and Cash</option><option>Receivable</option><option>Current Assets</option><option>Non-current Assets</option><option>Prepayments</option><option>Fixed Assets</option><option>Accumulated Depreciation</option></optgroup>
                      <optgroup label="Liabilities"><option>Credit Card</option><option>Current Liabilities</option><option>Payable</option><option>Non-current Liabilities</option></optgroup>
                      <optgroup label="Equity"><option>Equity</option><option>Current Year Earnings</option><option>Dividend</option></optgroup>
                      <optgroup label="Profit & Loss"><option>Income</option><option>Other Income</option><option>Cost of Revenue</option><option value="Expense">Expenses</option><option>Depreciation</option><option>Tax</option></optgroup>
                      <optgroup label="Other"><option>Off-Balance Sheet</option></optgroup>
                    </select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /></div>
                    <label htmlFor="loan-account-taxes" className="self-center text-sm font-semibold text-slate-700 dark:text-slate-200">Default Taxes</label><input id="loan-account-taxes" className={inputClass} value={loanAccountEditor.defaultTaxes || ""} onChange={(event) => setLoanAccountEditor((current) => ({ ...current, defaultTaxes: event.target.value }))} placeholder="Default Taxes" />
                    <label htmlFor="loan-account-tags" className="self-center text-sm font-semibold text-slate-700 dark:text-slate-200">Tags</label><input id="loan-account-tags" className={inputClass} value={loanAccountEditor.tags || ""} onChange={(event) => setLoanAccountEditor((current) => ({ ...current, tags: event.target.value }))} placeholder="Tags" />
                    <label htmlFor="loan-account-group" className="self-center text-sm font-semibold text-slate-700 dark:text-slate-200">Account Group</label><input id="loan-account-group" className={inputClass} value={loanAccountEditor.accountGroup || ""} onChange={(event) => setLoanAccountEditor((current) => ({ ...current, accountGroup: event.target.value }))} placeholder="Account Group" />
                    <label htmlFor="loan-account-currency" className="self-center text-sm font-semibold text-slate-700 dark:text-slate-200">Account Currency</label><div className="relative"><select id="loan-account-currency" className={`${inputClass} appearance-none pr-10`} value={loanAccountEditor.accountCurrency || ""} onChange={(event) => setLoanAccountEditor((current) => ({ ...current, accountCurrency: event.target.value }))}><option value="">Any currency</option><option>USD</option><option>KHR</option></select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /></div>
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Allow Reconciliation</span><label className="flex items-center"><input type="checkbox" checked={loanAccountEditor.allowReconciliation} onChange={(event) => setLoanAccountEditor((current) => ({ ...current, allowReconciliation: event.target.checked }))} className="h-5 w-5 rounded border-slate-300 text-emerald-600" /><span className="sr-only">Allow Reconciliation</span></label>
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Inactive</span><label className="flex items-center"><input type="checkbox" checked={loanAccountEditor.inactive} onChange={(event) => setLoanAccountEditor((current) => ({ ...current, inactive: event.target.checked }))} className="h-5 w-5 rounded border-slate-300 text-emerald-600" /><span className="sr-only">Inactive</span></label>
                  </div>
                </div>
                <div className="flex gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-800"><button type="button" disabled={loanAccountSaving} onClick={saveLoanAccount} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">{loanAccountSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Save</button><button type="button" onClick={() => setLoanAccountEditorOpen(false)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-300">Discard</button></div>
              </div>
            </div>
          ) : null}

          {loanTypeSearchModalOpen ? (() => {
            const savedTypes = loanTypeSuggestions.filter((name) => !DEFAULT_LOAN_TYPE_CATALOG.some((item) => item.name === name)).map((name) => ({ name, minOffer: "—", maxOffer: "—", contractTerms: "Custom", currency: "USD" }));
            const catalog = [...DEFAULT_LOAN_TYPE_CATALOG, ...savedTypes].filter((item) => item.name.toLowerCase().includes(loanTypeSearchText.trim().toLowerCase()));
            return <div role="dialog" aria-modal="true" aria-labelledby="loan-type-search-title" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-3 sm:p-6"><div className="flex max-h-[calc(100vh-1.5rem)] w-full max-w-7xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950 sm:max-h-[calc(100vh-3rem)]"><div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800"><div><h3 id="loan-type-search-title" className="text-xl font-bold text-slate-900 dark:text-white">Search: Loan Type</h3><p className="mt-0.5 text-sm text-slate-500">Choose the loan product for this application.</p></div><button type="button" onClick={() => setLoanTypeSearchModalOpen(false)} aria-label="Close loan type search" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"><X className="h-5 w-5" /></button></div><div className="border-b border-slate-200 px-5 py-3 dark:border-slate-800"><div className="relative max-w-xl"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input autoFocus className={`${inputClass} pl-9`} value={loanTypeSearchText} onChange={(event) => setLoanTypeSearchText(event.target.value)} placeholder="Type to search loan types" /></div></div><div className="min-h-0 flex-1 overflow-auto overscroll-contain p-3 sm:p-5"><table className="w-full min-w-[760px] border-separate border-spacing-0 text-left text-sm"><thead className="sticky top-0 z-10 bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300"><tr><th className="rounded-l-xl px-4 py-3 font-semibold">Name</th><th className="px-4 py-3 font-semibold">Minimum Offer</th><th className="px-4 py-3 font-semibold">Maximum Offer</th><th className="px-4 py-3 font-semibold">Contract Terms</th><th className="rounded-r-xl px-4 py-3 font-semibold">Currency</th></tr></thead><tbody>{catalog.map((item) => <tr key={item.name} onClick={() => { setForm((current) => ({ ...current, loanType: item.name })); setLoanTypeSearchModalOpen(false); }} className="cursor-pointer text-slate-700 transition hover:bg-emerald-50 dark:text-slate-200 dark:hover:bg-emerald-500/10"><td className="border-b border-slate-200 px-4 py-3.5 font-semibold dark:border-slate-800">{item.name}</td><td className="border-b border-slate-200 px-4 py-3.5 dark:border-slate-800">{item.minOffer}</td><td className="border-b border-slate-200 px-4 py-3.5 dark:border-slate-800">{item.maxOffer}</td><td className="border-b border-slate-200 px-4 py-3.5 dark:border-slate-800">{item.contractTerms}</td><td className="border-b border-slate-200 px-4 py-3.5 dark:border-slate-800">{item.currency}</td></tr>)}{catalog.length === 0 ? <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-500">No loan types found.</td></tr> : null}</tbody></table></div><div className="flex items-center justify-between gap-3 border-t border-slate-200 px-5 py-4 dark:border-slate-800"><p className="text-sm text-slate-500">{catalog.length} loan type{catalog.length === 1 ? "" : "s"} shown</p><div className="flex gap-2"><button type="button" onClick={openLoanTypeEditor} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"><Plus className="h-4 w-4" />Create</button><button type="button" onClick={() => setLoanTypeSearchModalOpen(false)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Cancel</button></div></div></div></div>;
          })() : null}

          {sourceLoanSearchModalOpen ? (
            <div role="dialog" aria-modal="true" aria-labelledby="source-loan-search-title" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-3 sm:p-6">
              <div className="flex max-h-[calc(100vh-1.5rem)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950 sm:max-h-[calc(100vh-3rem)]">
                <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800"><div><h3 id="source-loan-search-title" className="text-xl font-bold text-slate-900 dark:text-white">Search: Source Loan</h3><p className="mt-0.5 text-sm text-slate-500">Select the existing loan that this application refinances or replaces.</p></div><button type="button" onClick={() => setSourceLoanSearchModalOpen(false)} aria-label="Close source loan search" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button></div>
                <div className="border-b border-slate-200 px-5 py-3 dark:border-slate-800"><div className="relative max-w-xl"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input autoFocus className={`${inputClass} pl-9`} value={sourceLoanSearchText} onChange={(event) => setSourceLoanSearchText(event.target.value)} placeholder="Search loan number, customer, or loan type" /></div></div>
                <div className="min-h-0 flex-1 overflow-auto overscroll-contain p-3 sm:p-5">
                  <table className="w-full min-w-[760px] border-separate border-spacing-0 text-left text-sm"><thead className="sticky top-0 z-10 bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300"><tr><th className="rounded-l-xl px-4 py-3 font-semibold">Loan Number</th><th className="px-4 py-3 font-semibold">Customer</th><th className="px-4 py-3 font-semibold">Loan Type</th><th className="px-4 py-3 text-right font-semibold">Amount</th><th className="rounded-r-xl px-4 py-3 font-semibold">Status</th></tr></thead><tbody>{sourceLoanSearchLoading ? <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-500"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />Loading loans…</td></tr> : null}{!sourceLoanSearchLoading && sourceLoanSearchResults.map((source) => <tr key={source.id} onClick={() => selectSourceLoan(source)} className="cursor-pointer text-slate-700 transition hover:bg-emerald-50 dark:text-slate-200 dark:hover:bg-emerald-500/10"><td className="border-b border-slate-200 px-4 py-3.5 font-semibold dark:border-slate-800">{source.loanNumber}</td><td className="border-b border-slate-200 px-4 py-3.5 dark:border-slate-800">{source.borrower.fullName}</td><td className="border-b border-slate-200 px-4 py-3.5 dark:border-slate-800">{source.loanType}</td><td className="border-b border-slate-200 px-4 py-3.5 text-right font-medium dark:border-slate-800">{formatCurrency(source.principal)}</td><td className="border-b border-slate-200 px-4 py-3.5 dark:border-slate-800"><StatusBadge status={source.repaymentStatus} /></td></tr>)}{!sourceLoanSearchLoading && sourceLoanSearchResults.length === 0 ? <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-500">No source loans found.</td></tr> : null}</tbody></table>
                </div>
                <div className="flex flex-col-reverse gap-3 border-t border-slate-200 px-5 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-slate-500">{sourceLoanSearchResults.length} loan{sourceLoanSearchResults.length === 1 ? "" : "s"} shown</p><div className="flex gap-2"><button type="button" onClick={openSourceLoanWorkspace} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Create and Edit…</button><button type="button" onClick={() => setSourceLoanSearchModalOpen(false)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300">Cancel</button></div></div>
              </div>
            </div>
          ) : null}
        </form>
      </div>
    </div>
  );
}

type LoanDetailTab = "schedule" | "information" | "collateral" | "approvals" | "customer" | "payments" | "other";
const LOAN_PRINT_OPTIONS = [
  "Contract",
  "កាលវីភាគបង់ប្រាក់",
  "កិច្ចសន្យាប្រាតិភោគដោយអនុប្បទាន (បញ្ចាំផ្តាច់)",
  "កិច្ចសន្យាលក់ទិញ",
  "កិច្ចសន្យាជួល",
  "កិច្ចព្រមព្រៀងវិសោធនកម្មលើកិច្ចសន្យាខ្ចីបរិភោគ",
  "កិច្ចសន្យាខ្ចីបរិភោគ",
  "កិច្ចសន្យាបង្កើតហ៊ីប៉ូតែក",
  "ពាក្យសុំចុះបញ្ជីអំពីការបង្កើតហ៊ីប៉ូតែក",
  "ពាក្យស្នើសុំរក្សាទុកវិញ្ញាបនបត្រសម្គាល់ម្ចាស់អចលនវត្ថុ",
] as const;

function LoanDetailPanel({
  loan,
  canApprove,
  canDisburse,
  canRepay,
  canEdit,
  canDelete,
  onClose,
  onEdit,
  onCreate,
  recordPosition,
  recordTotal,
  onPrevious,
  onNext,
  onDelete,
  onChanged,
}: {
  loan: LoanEntity;
  canApprove: boolean;
  canDisburse: boolean;
  canRepay: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onClose: () => void;
  onEdit: () => void;
  onCreate: () => void;
  recordPosition: number;
  recordTotal: number;
  onPrevious: () => void;
  onNext: () => void;
  onDelete: () => void;
  onChanged: () => void;
}) {
  const { success: toastSuccess, error: toastError } = useToast();
  const currentUser = useAuthUser();
  const [detail, setDetail] = useState<LoanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<LoanDetailTab>("schedule");
  const [processing, setProcessing] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(dateInputValue());
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [printMenuOpen, setPrintMenuOpen] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState<string | null>(null);
  const [showCollateralForm, setShowCollateralForm] = useState(false);
  const [collateral, setCollateral] = useState({ type: "", value: "", marketValue: "", reference: "", description: "" });

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api<LoanDetail>(`/api/loan/loans/${loan.id}`);
      setDetail(data);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Could not load loan details";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [loan.id]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const runApproval = async (action: "approve" | "reject" | "return" | "disburse") => {
    const comment = action === "reject" || action === "return" ? window.prompt(`${action === "reject" ? "Rejection" : "Return"} reason (required):`) : null;
    if ((action === "reject" || action === "return") && !comment?.trim()) return;
    if (action !== "reject" && action !== "return" && !window.confirm(`${action === "disburse" ? "Disburse" : "Approve"} ${detail?.loan.loanNumber || loan.loanNumber || "this loan"}?`)) return;
    setProcessing(true);
    try {
      const updated = await api<LoanDetail>(`/api/loan/loans/${loan.id}/approval`, { method: "POST", body: JSON.stringify({ action, comment }) });
      setDetail(updated);
      const messages = { approve: updated.loan.status === "approved" ? "All required approvals are complete." : "Your approval was recorded. The loan moved to the next approval step.", reject: "Loan application rejected.", return: "Loan returned to the employee for correction.", disburse: "Loan disbursed, schedule created, and accounting entry posted." };
      toastSuccess(messages[action]);
      onChanged();
    } catch (caught) {
      toastError(caught instanceof Error ? caught.message : "Could not update loan approval");
    } finally {
      setProcessing(false);
    }
  };

  const recordPayment = async (event: FormEvent) => {
    event.preventDefault();
    const amount = Number(paymentAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toastError("Enter a payment amount greater than zero.");
      return;
    }
    setProcessing(true);
    try {
      await api<LoanDetail>(`/api/loan/loans/${loan.id}/payments`, {
        method: "POST",
        body: JSON.stringify({ amount, paymentDate, method: paymentMethod, reference: paymentReference || null }),
      });
      toastSuccess("Repayment recorded successfully.");
      setPaymentAmount("");
      setPaymentReference("");
      setShowPaymentForm(false);
      onChanged();
      await loadDetail();
    } catch (caught) {
      toastError(caught instanceof Error ? caught.message : "Could not record repayment");
    } finally {
      setProcessing(false);
    }
  };

  const addCollateral = async (event: FormEvent) => {
    event.preventDefault();
    const value = Number(collateral.value);
    const marketValue = Number(collateral.marketValue);
    if (!collateral.type.trim() || !Number.isFinite(value) || value < 0 || !Number.isFinite(marketValue) || marketValue < 0) {
      toastError("Enter a collateral type, declared value, and market value.");
      return;
    }
    setProcessing(true);
    try {
      await api<unknown>(`/api/loan/loans/${loan.id}/collaterals`, {
        method: "POST",
        body: JSON.stringify({ type: collateral.type, value, marketValue, reference: collateral.reference || null, description: collateral.description || null }),
      });
      toastSuccess("Collateral added successfully.");
      setCollateral({ type: "", value: "", marketValue: "", reference: "", description: "" });
      setShowCollateralForm(false);
      onChanged();
      await loadDetail();
    } catch (caught) {
      toastError(caught instanceof Error ? caught.message : "Could not add collateral");
    } finally {
      setProcessing(false);
    }
  };

  const duplicateLoan = async () => {
    if (!detail || !window.confirm(`Duplicate ${detail.loan.loanNumber || "this loan"} as a new draft?`)) return;
    setProcessing(true);
    try {
      await api<LoanEntity>("/api/loan/loans", {
        method: "POST",
        body: JSON.stringify({
          isDraft: true,
          borrower: detail.loan.borrower,
          loanType: detail.loan.loanType,
          principal: detail.loan.principal,
          loanAmountKHR: detail.loan.loanAmountKHR,
          interestRate: detail.loan.interestRate,
          termMonths: detail.loan.termMonths,
          repaymentFrequency: detail.loan.repaymentFrequency,
          interestModel: detail.loan.interestModel,
          formula: detail.loan.formula,
          branchLocation: detail.loan.branchLocation,
          loanOfficer: detail.loan.loanOfficer,
          approvalStage: "draft",
          creditScore: detail.loan.creditScore,
          startDate: detail.loan.startDate,
          contractDate: detail.loan.contractDate,
          contractDateLunar: detail.loan.contractDateLunar,
          contractEndDate: detail.loan.contractEndDate,
          firstPaymentDate: detail.loan.firstPaymentDate,
          purpose: detail.loan.purpose,
          notes: detail.loan.notes,
          loanInformation: detail.loan.loanInformation,
          loanContacts: detail.loan.loanContacts,
        }),
      });
      setShowActionMenu(false);
      toastSuccess("Loan duplicated as a new draft.");
      onChanged();
    } catch (caught) {
      toastError(caught instanceof Error ? caught.message : "Could not duplicate loan");
    } finally {
      setProcessing(false);
    }
  };

  const currentLoan = detail?.loan ?? loan;
  const isAwaitingApproval = currentLoan.status === "pending" || currentLoan.status === "waiting";
  const currentApprovalStep = detail?.approvalWorkflow.currentStep || null;
  const isNamedApprover = Boolean(currentApprovalStep?.eligibleUsernames.some((username) => username.toLowerCase() === currentUser.username?.toLowerCase()));
  const normalizeApprovalRole = (role: string) => {
    const normalized = role.trim().toLowerCase();
    if (["loan officer", "loan specialist", "collateral checker"].includes(normalized)) return "loan operations";
    if (["branch manager", "bm", "credit manager"].includes(normalized)) return "manager / approver";
    if (["accounting", "finance manager"].includes(normalized)) return "finance";
    if (normalized === "ceo") return "executive viewer";
    return normalized;
  };
  const isRoleApprover = Boolean(currentApprovalStep?.roles.some((role) => normalizeApprovalRole(role) === normalizeApprovalRole(currentUser.role || "")));
  const canActOnCurrentStep = isNamedApprover || (canApprove && (currentUser.role === "Admin" || isRoleApprover));
  const printLoanDocument = async (documentTitle: string) => {
    if (!detail) {
      toastError("Loan details are still loading.");
      return;
    }
    const escapeHtml = (value: unknown) => String(value ?? "—").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[char] || char));
    const money = (value: number) => escapeHtml(formatCurrency(value));
    const date = (value: string | null | undefined) => escapeHtml(formatDate(value));
    const loanNumber = detail.loan.loanNumber || "Loan";
    const pdfTitle = `${documentTitle}-${loanNumber.replace(/[\\/]/g, "_")}.pdf`;
    const isScheduleDocument = documentTitle.includes("កាល") || documentTitle === "Schedule";
    const borrower = detail.loan.borrower;
    const borrowerProfile = borrower.profile || {};
    const borrowerPhone = borrower.phone || borrowerProfile.mobile || "012 345 678";
    const borrowerAddress = borrower.address || borrowerProfile.address2 || "Phnom Penh, Cambodia";
    const borrowerId = borrower.nationalId || borrowerProfile.passport || "Sample ID 000000";
    const firstCollateral = detail.collaterals[0];
    const collateralName = firstCollateral?.type || "Vehicle / Land collateral";
    const collateralReference = firstCollateral?.reference || "Sample collateral reference";
    const collateralValue = firstCollateral?.marketValue || firstCollateral?.value || detail.loan.principal;
    const contractSections: Record<string, string[]> = {
      Contract: [
        "This contract records the loan agreement between Emerald Cash and the customer named below.",
        "The customer agrees to repay principal, interest, fees, and related obligations according to the repayment schedule and signed loan terms.",
        "Both parties confirm that the information in this document is generated from the current loan record.",
      ],
      "កិច្ចសន្យាប្រាតិភោគដោយអនុប្បទាន (បញ្ចាំផ្តាច់)": [
        "ភាគីទាំងពីរយល់ព្រមប្រើប្រាស់ទ្រព្យបញ្ចាំ ដើម្បីធានាការសងប្រាក់កម្ចី និងកាតព្វកិច្ចពាក់ព័ន្ធ។",
        "អតិថិជនត្រូវគោរពតាមកាលវិភាគបង់ប្រាក់ អត្រាការប្រាក់ និងលក្ខខណ្ឌដែលបានកំណត់ក្នុងប្រព័ន្ធ។",
      ],
      "កិច្ចសន្យាលក់ទិញ": [
        "ឯកសារនេះកត់ត្រាព័ត៌មានលក់ទិញ និងកាតព្វកិច្ចទូទាត់ដែលភ្ជាប់ជាមួយប្រាក់កម្ចី។",
        "ព័ត៌មានអតិថិជន ប្រភេទកម្ចី និងតម្លៃត្រូវបានយកពីទិន្នន័យកម្ចីបច្ចុប្បន្ន។",
      ],
      "កិច្ចសន្យាជួល": [
        "កិច្ចសន្យាជួលនេះត្រូវបានរៀបចំសម្រាប់កំណត់លក្ខខណ្ឌប្រើប្រាស់ទ្រព្យ និងការទូទាត់ប្រចាំកាលកំណត់។",
        "ភាគីជួលត្រូវបង់ប្រាក់តាមកាលវិភាគ និងថែរក្សាទ្រព្យតាមលក្ខខណ្ឌដែលបានព្រមព្រៀង។",
      ],
      "កិច្ចព្រមព្រៀងវិសោធនកម្មលើកិច្ចសន្យាខ្ចីបរិភោគ": [
        "ឯកសារនេះប្រើសម្រាប់កត់ត្រាការកែប្រែលក្ខខណ្ឌលើកិច្ចសន្យាខ្ចីបរិភោគដើម។",
        "លក្ខខណ្ឌដែលមិនបានកែប្រែ នៅតែមានសុពលភាពដូចបានចុះហត្ថលេខាដំបូង។",
      ],
      "កិច្ចសន្យាខ្ចីបរិភោគ": [
        "អតិថិជនទទួលស្គាល់ការទទួលប្រាក់កម្ចី និងយល់ព្រមសងតាមចំនួន ថ្ងៃកំណត់ និងអត្រាការប្រាក់ខាងក្រោម។",
        "ការខកខានបង់ប្រាក់អាចបង្កឱ្យមានការពិន័យ ឬវិធានការផ្សេងៗតាមលក្ខខណ្ឌកម្ចី។",
      ],
      "កិច្ចសន្យាបង្កើតហ៊ីប៉ូតែក": [
        "ឯកសារនេះបង្កើតសិទ្ធិហ៊ីប៉ូតែកលើទ្រព្យសម្បត្តិ ដើម្បីធានាការសងប្រាក់កម្ចី។",
        "ព័ត៌មានទ្រព្យ និងតម្លៃធានាត្រូវបានបង្ហាញក្នុងផ្នែក Collaterals ប្រសិនបើបានបញ្ចូលក្នុងប្រព័ន្ធ។",
      ],
      "ពាក្យសុំចុះបញ្ជីអំពីការបង្កើតហ៊ីប៉ូតែក": [
        "ពាក្យសុំនេះត្រូវបានរៀបចំសម្រាប់ប្រើក្នុងដំណើរការចុះបញ្ជីការបង្កើតហ៊ីប៉ូតែក។",
        "ព័ត៌មានកម្ចី និងអតិថិជនខាងក្រោម ត្រូវបានយកពីប្រព័ន្ធកម្ចីបច្ចុប្បន្ន។",
      ],
      "ពាក្យស្នើសុំរក្សាទុកវិញ្ញាបនបត្រសម្គាល់ម្ចាស់អចលនវត្ថុ": [
        "ពាក្យស្នើសុំនេះប្រើសម្រាប់រក្សាទុកវិញ្ញាបនបត្រសម្គាល់ម្ចាស់អចលនវត្ថុពាក់ព័ន្ធនឹងការធានាកម្ចី។",
        "អតិថិជនយល់ព្រមឱ្យរក្សាទុកឯកសារដែលពាក់ព័ន្ធរហូតដល់កាតព្វកិច្ចត្រូវបានបំពេញ។",
      ],
    };
    const agreementText = (contractSections[documentTitle] || contractSections.Contract).map((line) => `<p>${escapeHtml(line)}</p>`).join("");
    const partyDetails = `
      <h2>ព័ត៌មានភាគី / Party Details</h2>
      <div class="grid">
        <div class="row"><span class="label">ម្ចាស់បំណុល</span><span class="value">Emerald Cash</span></div>
        <div class="row"><span class="label">អាសយដ្ឋានក្រុមហ៊ុន</span><span class="value">Phnom Penh, Kingdom of Cambodia</span></div>
        <div class="row"><span class="label">កូនបំណុល</span><span class="value">${escapeHtml(borrower.fullName)}</span></div>
        <div class="row"><span class="label">ទូរស័ព្ទ</span><span class="value">${escapeHtml(borrowerPhone)}</span></div>
        <div class="row"><span class="label">អត្តសញ្ញាណបណ្ណ</span><span class="value">${escapeHtml(borrowerId)}</span></div>
        <div class="row"><span class="label">អាសយដ្ឋាន</span><span class="value">${escapeHtml(borrowerAddress)}</span></div>
      </div>`;
    const loanTerms = `
      <h2>ព័ត៌មានកម្ចី / Loan Terms</h2>
      <div class="terms">
        <div><strong>ប្រាក់ដើម:</strong> ${money(detail.loan.principal)}</div>
        <div><strong>អត្រាការប្រាក់:</strong> ${escapeHtml(detail.loan.interestRate)}%</div>
        <div><strong>រយៈពេល:</strong> ${escapeHtml(detail.loan.termMonths)} months</div>
        <div><strong>របៀបបង់ប្រាក់:</strong> ${escapeHtml(detail.loan.repaymentFrequency)}</div>
        <div><strong>ថ្ងៃចាប់ផ្តើម:</strong> ${date(detail.loan.startDate)}</div>
        <div><strong>ថ្ងៃបង់ដំបូង:</strong> ${date(detail.loan.firstPaymentDate)}</div>
      </div>`;
    const collateralSummary = `
      <h2>ទ្រព្យធានា / Collateral Summary</h2>
      <div class="grid">
        <div class="row"><span class="label">ប្រភេទទ្រព្យ</span><span class="value">${escapeHtml(collateralName)}</span></div>
        <div class="row"><span class="label">លេខយោង</span><span class="value">${escapeHtml(collateralReference)}</span></div>
        <div class="row"><span class="label">តម្លៃប៉ាន់ស្មាន</span><span class="value">${money(collateralValue)}</span></div>
        <div class="row"><span class="label">ស្ថានភាពរក្សាទុក</span><span class="value">រក្សាទុកសម្រាប់ធានាកម្ចី</span></div>
      </div>`;
    const documentSpecificBlock = isScheduleDocument ? "" : `
      ${partyDetails}
      ${loanTerms}
      ${documentTitle.includes("ហ៊ីប៉ូតែក") || documentTitle.includes("វិញ្ញាបនបត្រ") || documentTitle.includes("បញ្ចាំ") ? collateralSummary : ""}
      <h2>លក្ខខណ្ឌសំខាន់ៗ / Main Clauses</h2>
      <ol class="clauses">
        <li>ភាគីកូនបំណុលយល់ព្រមទទួលខុសត្រូវលើប្រាក់ដើម ការប្រាក់ និងថ្លៃសេវាផ្សេងៗតាមកំណត់។</li>
        <li>ការបង់ប្រាក់ត្រូវអនុវត្តតាមកាលវិភាគបង់ប្រាក់ដែលបានភ្ជាប់ជាមួយឯកសារនេះ។</li>
        <li>ប្រសិនបើមានការខកខានបង់ប្រាក់ ក្រុមហ៊ុនអាចអនុវត្តវិធានការតាមលក្ខខណ្ឌកម្ចី និងច្បាប់ជាធរមាន។</li>
        <li>ឯកសារនេះត្រូវបានបង្កើតដោយប្រព័ន្ធ ដោយប្រើទិន្នន័យកម្ចីបច្ចុប្បន្ន និងអាចរក្សាទុកជា PDF សម្រាប់ប្រើប្រាស់ជាផ្លូវការ។</li>
      </ol>`;
    const documentIntro = isScheduleDocument
      ? "This repayment schedule is prepared from the live loan record and lists the expected payment dates, principal, interest, and amount due."
      : "This loan document is prepared from the live loan record for review, signature, and PDF saving from the browser print dialog.";
    const scheduleSource = detail.schedule.length ? detail.schedule : [
      { id: "sample-1", installmentNumber: 1, dueDate: detail.loan.startDate, principalDue: 0, interestDue: 0, amountDue: 181, amountPaid: 0, status: "scheduled" as const },
      { id: "sample-2", installmentNumber: 2, dueDate: detail.loan.firstPaymentDate, principalDue: 0, interestDue: 119.35, amountDue: 119.35, amountPaid: 0, status: "scheduled" as const },
      { id: "sample-3", installmentNumber: 3, dueDate: "2026-09-01", principalDue: 0, interestDue: 115.5, amountDue: 115.5, amountPaid: 115.5, status: "scheduled" as const },
      { id: "sample-4", installmentNumber: 4, dueDate: "2026-10-01", principalDue: 0, interestDue: 115.5, amountDue: 115.5, amountPaid: 115.5, status: "scheduled" as const },
      { id: "sample-5", installmentNumber: 5, dueDate: "2026-11-01", principalDue: 0, interestDue: 115.5, amountDue: 115.5, amountPaid: 115.5, status: "scheduled" as const },
      { id: "sample-6", installmentNumber: 6, dueDate: "2026-12-01", principalDue: detail.loan.principal, interestDue: 0, amountDue: detail.loan.principal, amountPaid: detail.loan.principal, status: "scheduled" as const },
    ];
    const scheduleRows = scheduleSource.map((item) => {
      const paid = item.amountPaid || 0;
      return `<tr><td>${date(item.dueDate)}</td><td class="num">${money(item.principalDue)}</td><td class="num">${money(item.interestDue)}</td><td class="num">${money(Math.max(0, item.amountDue - item.principalDue - item.interestDue))}</td><td class="num">${money(item.amountDue)}</td><td class="num">${money(paid)}</td></tr>`;
    }).join("");
    const schedulePrincipalTotal = scheduleSource.reduce((total, item) => total + item.principalDue, 0);
    const scheduleInterestTotal = scheduleSource.reduce((total, item) => total + item.interestDue, 0);
    const scheduleFeeTotal = scheduleSource.reduce((total, item) => total + Math.max(0, item.amountDue - item.principalDue - item.interestDue), 0);
    const scheduleAmountTotal = scheduleSource.reduce((total, item) => total + item.amountDue, 0);
    const schedulePaidTotal = scheduleSource.reduce((total, item) => total + (item.amountPaid || 0), 0);
    const collateralRows = detail.collaterals.length
      ? detail.collaterals.map((item) => `<tr><td>${escapeHtml(item.type)}</td><td>${escapeHtml(item.reference || "")}</td><td class="num">${money(item.value)}</td><td class="num">${money(item.marketValue)}</td></tr>`).join("")
      : `<tr><td colspan="4" class="empty">No collateral records.</td></tr>`;
    const paymentRows = detail.payments.length
      ? detail.payments.map((item) => `<tr><td>${date(item.paymentDate)}</td><td>${escapeHtml(item.method.replace("_", " "))}</td><td>${escapeHtml(item.reference || "")}</td><td class="num">${money(item.principalAmount)}</td><td class="num">${money(item.interestAmount)}</td><td class="num">${money(item.amount)}</td></tr>`).join("")
      : `<tr><td colspan="6" class="empty">No payments recorded.</td></tr>`;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(pdfTitle)}</title><style>
      @page { size: A4; margin: 0; }
      @font-face { font-family: "Khmer OS Muol Light"; src: url("/fonts/khmer-os-muol-light.ttf") format("truetype"); font-weight: 400 800; font-style: normal; font-display: swap; }
      @font-face { font-family: "Khmer OS Battambang"; src: url("/fonts/khmer-os-battambang.ttf") format("truetype"); font-weight: 400 800; font-style: normal; font-display: swap; }
      @font-face { font-family: "Kantumruy Pro"; src: url("/fonts/kantumruypro-khmer.woff2") format("woff2"); font-weight: 400 800; font-style: normal; font-display: swap; }
      body { background: #f3f4f6; color: #111827; font-family: "Khmer OS Battambang", "Kantumruy Pro", Arial, sans-serif; font-size: 14px; line-height: 1.72; margin: 0; }
      .page { background: white; box-sizing: border-box; min-height: 297mm; padding: 24mm 18mm 18mm; position: relative; width: 210mm; }
      .page + .page { page-break-before: always; }
      h1 { font-family: "Khmer OS Muol Light", "Kantumruy Pro", serif; font-size: 24px; font-weight: 800; margin: 0 0 18px; text-align: center; }
      h2 { font-family: "Khmer OS Muol Light", "Kantumruy Pro", serif; font-size: 18px; font-weight: 800; margin: 18px 0 10px; text-align: center; }
      p { margin: 0 0 9px; text-align: justify; }
      .topline { font-weight: 600; margin-bottom: 18px; }
      .article { display: grid; grid-template-columns: 74px 1fr; margin: 8px 0; }
      .article-title { font-family: "Khmer OS Muol Light", "Kantumruy Pro", serif; font-weight: 800; }
      .article-body { text-align: justify; }
      .schedule-title { font-weight: 800; margin: 14px 0 5px; }
      table { border-collapse: collapse; margin: 8px auto 0; width: 94%; }
      th, td { border: 1px solid #111827; padding: 7px 6px; text-align: left; vertical-align: top; }
      th { font-family: "Khmer OS Muol Light", "Kantumruy Pro", serif; font-weight: 800; text-align: center; }
      .num { text-align: right; white-space: nowrap; }
      tfoot td { font-weight: 800; }
      .collateral { width: 88%; }
      .collateral td, .collateral th { padding: 9px 8px; }
      .bullet { margin-left: 24px; }
      .date-line { font-weight: 700; margin: 16px 0 28px; text-align: right; }
      .signatures { display: grid; gap: 24px; grid-template-columns: repeat(3, 1fr); margin-top: 34px; text-align: center; }
      .signature-title { font-family: "Khmer OS Muol Light", "Kantumruy Pro", serif; font-weight: 800; margin-bottom: 58px; }
      .signature-name { font-weight: 600; }
      .footer { bottom: 12mm; color: #64748b; font-family: Arial, sans-serif; font-size: 11px; left: 18mm; position: absolute; }
      .print-actions { margin: 16px 18mm 0; text-align: right; }
      .print-actions button { background: #0f172a; border: 0; border-radius: 10px; color: white; cursor: pointer; font-weight: 700; padding: 10px 16px; }
      @media print { body { background: white; } .page { min-height: 297mm; } .print-actions { display: none; } }
    </style></head><body>
      <section class="page">
        <h1>${escapeHtml(documentTitle === "Contract" ? "កិច្ចសន្យាខ្ចីប្រាក់" : documentTitle)}</h1>
        <p class="topline">ក្រុមហ៊ុន វីមាន ខាប់ភីថល ឯ.ក លេខបញ្ជី 85E ផ្លូវលេខ១៩៨០ សង្កាត់ភ្នំពេញថ្មី ខណ្ឌសែនសុខ រាជធានីភ្នំពេញ ហៅកាត់ថា ភាគី “ក” ម្ចាស់បំណុល។</p>
        <h2>និង</h2>
        <p>ឈ្មោះ ${escapeHtml(borrower.fullName)} កាន់អត្តសញ្ញាណបណ្ណលេខ ${escapeHtml(borrowerId)} សញ្ជាតិ Cambodian ភេទ ប្រុស អាសយដ្ឋាន ${escapeHtml(borrowerAddress)} ហៅកាត់ថា ភាគី “ខ” ជាកូនបំណុល។</p>
        <p><strong>ភាគី “ក” និងភាគី “ខ” បានព្រមព្រៀង ការប្រកាន់ខ្ជាប់ដោយ៖</strong></p>
        <div class="article"><div class="article-title">ប្រការ ១</div><div class="article-body">ភាគី “ក” យល់ព្រមផ្តល់ឱ្យភាគី “ខ” ខ្ចីប្រាក់ចំនួន ${money(detail.loan.principal)}។ ភាគី “ខ” បានទទួលប្រាក់គ្រប់ចំនួន និងយល់ព្រមសងតាមកាលវិភាគខាងក្រោម។</div></div>
        <div class="article"><div class="article-title">ប្រការ ២</div><div class="article-body">ភាគី “ខ” ត្រូវបង់ការប្រាក់អត្រា ${escapeHtml(detail.loan.interestRate)}% និងបង់ប្រាក់តាមរបៀប ${escapeHtml(detail.loan.repaymentFrequency)} ក្នុងរយៈពេល ${escapeHtml(detail.loan.termMonths)} ខែ។</div></div>
        <div class="article"><div class="article-title">ប្រការ ៣</div><div class="article-body">ភាគី “ខ” យល់ព្រមថា ប្រសិនបើខកខានបង់ប្រាក់ ភាគី “ក” អាចអនុវត្តវិធានការទារបំណុល និងប្រើប្រាស់ទ្រព្យធានាតាមច្បាប់។</div></div>
        <div class="schedule-title">កាលវិភាគបង់ប្រាក់</div>
        <table>
          <thead><tr><th>កាលបរិច្ឆេទ</th><th>ប្រាក់ដើម</th><th>ការប្រាក់</th><th>សេវា</th><th>ប្រាក់ត្រូវបង់</th><th>ប្រាក់នៅសល់</th></tr></thead>
          <tbody>${scheduleRows}</tbody>
          <tfoot><tr><td class="num">សរុប</td><td class="num">${money(schedulePrincipalTotal)}</td><td class="num">${money(scheduleInterestTotal)}</td><td class="num">${money(scheduleFeeTotal)}</td><td class="num">${money(scheduleAmountTotal)}</td><td class="num">${money(schedulePaidTotal)}</td></tr></tfoot>
        </table>
        <div class="footer">Page: 1 / 2</div>
      </section>
      <section class="page">
        <div class="article"><div class="article-title">ប្រការ ៤</div><div class="article-body">ដើម្បីធានាបំណុលខាងលើ ភាគី “ខ” បានដាក់បញ្ចាំទ្រព្យសម្បត្តិដូចខាងក្រោម៖</div></div>
        <table class="collateral">
          <thead><tr><th style="width:44px">ល.រ</th><th>រាយនាមទ្រព្យបញ្ចាំ</th><th style="width:80px">តម្លៃ</th></tr></thead>
          <tbody><tr><td class="num">1</td><td>បរិយាយ<br><span class="bullet">• ${escapeHtml(collateralName)} ${escapeHtml(collateralReference)}</span></td><td class="num">${money(collateralValue)}</td></tr></tbody>
        </table>
        <div class="article"><div class="article-title">ប្រការ ៥</div><div class="article-body">ទ្រព្យបញ្ចាំត្រូវរក្សាទុកដោយភាគី “ក” រហូតដល់ភាគី “ខ” បានបង់ប្រាក់ដើម ការប្រាក់ និងកាតព្វកិច្ចទាំងអស់រួចរាល់។</div></div>
        <div class="article"><div class="article-title">ប្រការ ៦</div><div class="article-body">កិច្ចសន្យានេះមានសុពលភាពចាប់ពីថ្ងៃចុះហត្ថលេខា និងត្រូវអនុវត្តតាមច្បាប់នៃព្រះរាជាណាចក្រកម្ពុជា។</div></div>
        <div class="date-line">ថ្ងៃទី ${date(new Date().toISOString())}</div>
        <div class="signatures">
          <div><div class="signature-title">ភាគី “ខ”</div><div class="signature-name">${escapeHtml(borrower.fullName)}</div></div>
          <div><div class="signature-title">ភាគី “ក”</div><div class="signature-name">វីមាន ខាប់ភីថល ឯ.ក</div></div>
          <div><div class="signature-title">សាក្សីភាគី “ក”</div><div class="signature-name">&nbsp;</div></div>
        </div>
        <div class="footer">Page: 2 / 2</div>
      </section>
    </body></html>`;
    setPdfGenerating(documentTitle);
    try {
      const response = await fetch("/api/loan/print-pdf", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html, filename: pdfTitle }),
      });
      if (!response.ok) {
        const message = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(message?.error || "Could not generate PDF");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = pdfTitle;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setPrintMenuOpen(false);
      toastSuccess("PDF downloaded.");
    } catch (caught) {
      toastError(caught instanceof Error ? caught.message : "Could not download PDF");
    } finally {
      setPdfGenerating(null);
    }
  };

  const detailButtonClass = "inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition";
  const detailLabelClass = "font-semibold text-slate-600 dark:text-slate-300";
  const detailValueClass = "text-slate-700 dark:text-slate-200";

  return (
    <Card className="overflow-visible rounded-2xl p-0">
      <div className="border-b border-slate-200 px-5 py-5 dark:border-slate-800 sm:px-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-2xl font-medium tracking-tight text-slate-800 dark:text-slate-100">
              <button type="button" onClick={onClose} className="hover:text-emerald-700 dark:hover:text-emerald-300">Dashboard Action</button>
              <span className="text-slate-400">/</span>
              <button type="button" onClick={onClose} className="hover:text-emerald-700 dark:hover:text-emerald-300">Loans</button>
              <span className="text-slate-400">/</span>
              <span className="truncate">{currentLoan.loanNumber || "Loan application"}</span>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {canEdit ? <button type="button" onClick={onEdit} className={`${detailButtonClass} bg-emerald-600 text-white shadow-sm hover:bg-emerald-700`}><Pencil className="h-4 w-4" /> Edit</button> : null}
              <button type="button" onClick={onCreate} className={`${detailButtonClass} bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200`}><SquarePlus className="h-4 w-4" /> Create</button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 xl:justify-end">
            <div className="relative">
              <button type="button" onClick={() => setPrintMenuOpen((open) => !open)} aria-haspopup="menu" aria-expanded={printMenuOpen} className={`${detailButtonClass} bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200`}><Printer className="h-4 w-4" /> Print <ChevronDown className={`h-4 w-4 transition ${printMenuOpen ? "rotate-180" : ""}`} /></button>
              {printMenuOpen ? <div role="menu" className="absolute right-0 top-[calc(100%+0.4rem)] z-[100] max-h-[calc(100vh-10rem)] w-80 overflow-y-auto rounded-xl border border-slate-200 bg-white py-2 shadow-2xl dark:border-slate-700 dark:bg-slate-950">{LOAN_PRINT_OPTIONS.map((option) => <button key={option} type="button" role="menuitem" disabled={Boolean(pdfGenerating)} onClick={() => void printLoanDocument(option)} className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 disabled:cursor-wait disabled:opacity-60 dark:text-slate-200 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-200"><span>{option}</span>{pdfGenerating === option ? <Loader2 className="h-4 w-4 animate-spin" /> : null}</button>)}</div> : null}
            </div>
            <div className="relative">
              <button type="button" aria-haspopup="menu" aria-expanded={showActionMenu} onClick={() => { setShowActionMenu((open) => !open); setPrintMenuOpen(false); }} className={`${detailButtonClass} bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200`}><MoreVertical className="h-4 w-4" /> Action <ChevronDown className={`h-4 w-4 transition ${showActionMenu ? "rotate-180" : ""}`} /></button>
              {showActionMenu ? <div role="menu" className="absolute right-0 top-[calc(100%+0.4rem)] z-[100] w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-2 shadow-2xl dark:border-slate-700 dark:bg-slate-950">
                <button type="button" role="menuitem" onClick={() => setShowActionMenu(false)} className="block w-full px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-900">Archive</button>
                {canDelete ? <button type="button" role="menuitem" onClick={() => { setShowActionMenu(false); onDelete(); }} className="block w-full px-4 py-2.5 text-left text-sm font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/20">Delete</button> : null}
                <button type="button" role="menuitem" disabled={processing} onClick={() => void duplicateLoan()} className="block w-full px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:text-slate-200 dark:hover:bg-slate-900">Duplicate</button>
                <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                <button type="button" role="menuitem" onClick={() => setShowActionMenu(false)} className="block w-full px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-900">Force Reset Draft</button>
                <button type="button" role="menuitem" onClick={() => setShowActionMenu(false)} className="block w-full px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-900">Re-Open Loan</button>
              </div> : null}
            </div>
            <span className="ml-3 font-semibold text-slate-700 dark:text-slate-200">{recordPosition}</span>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span className="font-semibold text-slate-500">{recordTotal}</span>
            <button type="button" aria-label="Previous loan" disabled={recordPosition <= 1} onClick={onPrevious} className="rounded-full bg-slate-100 p-3 text-slate-600 hover:bg-slate-200 disabled:opacity-40 dark:bg-slate-800 dark:text-slate-300"><ChevronDown className="h-4 w-4 rotate-90" /></button>
            <button type="button" aria-label="Next loan" disabled={recordPosition >= recordTotal} onClick={onNext} className="rounded-full bg-slate-100 p-3 text-slate-600 hover:bg-slate-200 disabled:opacity-40 dark:bg-slate-800 dark:text-slate-300"><ChevronDown className="h-4 w-4 -rotate-90" /></button>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {canRepay ? <button type="button" onClick={() => { setTab("payments"); setShowPaymentForm((visible) => !visible); }} className={`${detailButtonClass} bg-emerald-600 text-white shadow-sm hover:bg-emerald-700`}>Repayment</button> : null}
            <button type="button" onClick={() => setTab("information")} className={`${detailButtonClass} bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200`}>Refinance</button>
            <button type="button" onClick={() => setTab("other")} className={`${detailButtonClass} bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200`}>Bad Debt</button>
            {canActOnCurrentStep && isAwaitingApproval ? <>
              <button type="button" disabled={processing} onClick={() => void runApproval("approve")} className={`${detailButtonClass} bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60`}><Check className="h-4 w-4" /> Approve</button>
              <button type="button" disabled={processing} onClick={() => void runApproval("return")} className={`${detailButtonClass} border border-amber-200 text-amber-700 hover:bg-amber-50 disabled:opacity-60`}>Return</button>
              <button type="button" disabled={processing} onClick={() => void runApproval("reject")} className={`${detailButtonClass} border border-rose-200 text-rose-700 hover:bg-rose-50 disabled:opacity-60`}><XCircle className="h-4 w-4" /> Reject</button>
            </> : null}
            {canDisburse && currentLoan.status === "approved" ? <button type="button" disabled={processing} onClick={() => void runApproval("disburse")} className={`${detailButtonClass} bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60`}><CircleDollarSign className="h-4 w-4" /> Disburse</button> : null}
          </div>
          <div className="inline-flex self-start overflow-hidden rounded-full border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-950">
            {(["Draft", "Waiting", "Progress"] as const).map((status) => <span key={status} className={`rounded-full px-5 py-2.5 text-sm font-semibold ${currentLoan.repaymentStatus === status ? "bg-emerald-600 text-white" : "text-slate-600 dark:text-slate-300"}`}>{status}</span>)}
          </div>
        </div>

        {loading ? <div className="flex min-h-40 items-center justify-center text-sm text-slate-500"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading loan details…</div> : null}
        {error ? <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{error}</p> : null}
        {!loading && !error && detail ? <>
          <div className="mt-12 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <h1 className="text-3xl font-medium tracking-tight text-slate-900 dark:text-white">{detail.loan.loanNumber || "Loan application"}</h1>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setTab("approvals")} className="inline-flex min-h-14 items-center gap-3 rounded-full border border-slate-200 px-4 text-left text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900"><FilePlus2 className="h-6 w-6" /><span><strong className="block text-slate-700 dark:text-slate-200">{detail.approvalWorkflow.completedSteps}</strong>Entries</span></button>
              <button type="button" onClick={() => setTab("payments")} className="inline-flex min-h-14 items-center gap-3 rounded-full border border-slate-200 px-4 text-left text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900"><CreditCard className="h-6 w-6" /><span><strong className="block text-slate-700 dark:text-slate-200">{detail.payments.length}</strong>Payments</span></button>
              <button type="button" onClick={() => setTab("collateral")} className="inline-flex min-h-14 items-center gap-3 rounded-full border border-slate-200 px-4 text-left text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900"><ShieldCheck className="h-6 w-6" /><span><strong className="block text-slate-700 dark:text-slate-200">{detail.collaterals.length}</strong>Collaterals</span></button>
              <button type="button" onClick={() => setTab("schedule")} className="inline-flex min-h-14 items-center gap-3 rounded-full border border-slate-200 px-4 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900"><CalendarDays className="h-6 w-6" />Schedules</button>
            </div>
          </div>
          <div className="mt-10 grid gap-x-16 gap-y-4 lg:grid-cols-2">
            <dl className="grid grid-cols-[minmax(9rem,0.7fr)_1fr] gap-x-6 gap-y-5 text-sm sm:text-base">
              <dt className={detailLabelClass}>Customer</dt><dd className="font-medium text-emerald-700 dark:text-emerald-300">{detail.loan.borrower.fullName}</dd>
              <dt className={detailLabelClass}>Transection No</dt><dd className={detailValueClass}>{detail.loan.loanNumber || "—"}</dd>
              <dt className={detailLabelClass}>Loan Type</dt><dd className="font-medium text-emerald-700 dark:text-emerald-300">{detail.loan.loanType}</dd>
              <dt className={detailLabelClass}>Date</dt><dd className={detailValueClass}>{formatLoanListDate(detail.loan.startDate, detail.loan.createdAt)}</dd>
              <dt className={detailLabelClass}>Contract Date</dt><dd className={detailValueClass}>{formatDate(detail.loan.contractDate)}</dd>
              <dt className={detailLabelClass}>Contract End Date</dt><dd className={detailValueClass}>{formatDate(detail.loan.contractEndDate)}</dd>
              <dt className={detailLabelClass}>First Pay Date</dt><dd className={detailValueClass}>{formatDate(detail.loan.firstPaymentDate)}</dd>
            </dl>
            <dl className="grid grid-cols-[minmax(9rem,0.7fr)_1fr] gap-x-6 gap-y-5 text-sm sm:text-base">
              <dt className={detailLabelClass}>Loan Amount</dt><dd className={detailValueClass}>{formatCurrency(detail.loan.principal)}</dd>
              <dt className={detailLabelClass}>Loan Amount KHR</dt><dd className={detailValueClass}>{detail.loan.loanAmountKHR || "—"}</dd>
              <dt className={detailLabelClass}>First Amount C-TR</dt><dd className={detailValueClass}>{detail.loan.paymentAmount.toFixed(2)}</dd>
              <dt className={detailLabelClass}>Formula</dt><dd className={detailValueClass}>{detail.loan.formula || detail.loan.interestModel.replaceAll("_", " ")}</dd>
              <dt className={detailLabelClass}>Rate (%)</dt><dd className={detailValueClass}>{detail.loan.interestRate.toFixed(2)} <span className="ml-1 capitalize">{detail.loan.repaymentFrequency}</span></dd>
              <dt className={detailLabelClass}>Rate KHR</dt><dd className={detailValueClass}>—</dd>
              <dt className={detailLabelClass}>Loan Term</dt><dd className={detailValueClass}>{detail.loan.termMonths} Months</dd>
              <dt className={detailLabelClass}>Payback</dt><dd className={`capitalize ${detailValueClass}`}>{detail.loan.repaymentFrequency.replaceAll("_", " ")}</dd>
            </dl>
          </div>
          <div className="mt-12 flex overflow-x-auto border-b border-slate-200 dark:border-slate-800">
            {([['schedule', 'Schedules'], ['information', 'Loan Informations'], ['collateral', 'Collaterals'], ['approvals', 'Approvals'], ['customer', 'Contacts'], ['payments', 'Accounting'], ['other', 'Other Info']] as [LoanDetailTab, string][]).map(([key, label]) => <button key={key} type="button" onClick={() => setTab(key)} className={`whitespace-nowrap border px-4 py-3 text-sm font-medium transition ${tab === key ? "-mb-px border-b-white border-emerald-600 bg-white text-slate-900 dark:border-b-slate-950 dark:bg-slate-950 dark:text-white" : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"}`}>{label}</button>)}
          </div>
        </> : null}
        {!loading && !error && detail && tab === "information" ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"><Field label="Loan amount"><p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white">{formatCurrency(detail.loan.principal)}</p></Field><Field label="Total payable"><p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white">{formatCurrency(detail.loan.totalPayable)}</p></Field><Field label="Payment amount"><p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white">{formatCurrency(detail.loan.paymentAmount)} / {detail.loan.repaymentFrequency}</p></Field><Field label="Loan type"><p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white">{detail.loan.loanType}</p></Field><Field label="Interest rate"><p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white">{detail.loan.interestRate}% · {detail.loan.interestModel.replace("_", " ")}</p></Field><Field label="Loan term"><p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white">{detail.loan.termMonths} months</p></Field><Field label="Start date"><p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white">{formatDate(detail.loan.startDate)}</p></Field><Field label="First payment date"><p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white">{formatDate(detail.loan.firstPaymentDate)}</p></Field><Field label="Branch"><p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white">{detail.loan.branchLocation || "—"}</p></Field><Field label="Purpose" className="sm:col-span-2 xl:col-span-3"><p className="min-h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white">{detail.loan.purpose || "—"}</p></Field></div> : null}
        {!loading && !error && detail && tab === "schedule" ? <div className="overflow-x-auto rounded-b-2xl border border-t-0 border-slate-200 dark:border-slate-800"><table className="min-w-[980px] w-full text-left text-sm"><thead className="bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300"><tr><th className="px-4 py-4 font-semibold">Date</th><th className="px-4 py-4 text-right font-semibold">Number Of Days</th><th className="px-4 py-4 text-right font-semibold">Outstanding</th><th className="px-4 py-4 text-right font-semibold">Principle</th><th className="px-4 py-4 text-right font-semibold">Interest</th><th className="px-4 py-4 text-right font-semibold">Amount To Pay</th><th className="px-4 py-4 text-right font-semibold">Balance</th><th className="w-10 px-3 py-4 text-center"><MoreVertical className="h-4 w-4" /></th></tr></thead><tbody>{detail.schedule.length ? detail.schedule.map((item, index) => {
          const previousDate = index > 0 ? new Date(detail.schedule[index - 1].dueDate).getTime() : new Date(item.dueDate).getTime();
          const days = index === 0 ? 0 : Math.max(0, Math.round((new Date(item.dueDate).getTime() - previousDate) / 86_400_000));
          const principalBefore = detail.schedule.slice(0, index).reduce((total, row) => total + row.principalDue, 0);
          const outstanding = Math.max(0, detail.loan.principal - principalBefore);
          const number = (value: number) => value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          return <tr key={item.id} className="border-t border-slate-200 text-slate-600 dark:border-slate-800 dark:text-slate-300"><td className="px-4 py-4">{formatDate(item.dueDate)}</td><td className="px-4 py-4 text-right">{days}</td><td className="px-4 py-4 text-right">{number(outstanding)}</td><td className="px-4 py-4 text-right">{number(item.principalDue)}</td><td className="px-4 py-4 text-right">{number(item.interestDue)}</td><td className="px-4 py-4 text-right">{number(item.amountDue)}</td><td className="px-4 py-4 text-right">{number(item.amountPaid)}</td><td className="px-3 py-4" /></tr>;
        }) : <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-500">No repayment schedule yet. The schedule is created when Accounting disburses the fully approved loan.</td></tr>}</tbody>{detail.schedule.length ? <tfoot className="border-t border-slate-300 bg-slate-50 font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"><tr><td colSpan={3} className="px-4 py-4 text-right">Totals</td><td className="px-4 py-4 text-right">{detail.schedule.reduce((total, item) => total + item.principalDue, 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td><td className="px-4 py-4 text-right">{detail.schedule.reduce((total, item) => total + item.interestDue, 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td><td className="px-4 py-4 text-right">{detail.schedule.reduce((total, item) => total + item.amountDue, 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td><td colSpan={2} /></tr></tfoot> : null}</table></div> : null}
        {!loading && !error && detail && tab === "payments" ? <div className="space-y-5">{showPaymentForm ? <form onSubmit={recordPayment} className="grid gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-700/40 dark:bg-emerald-950/20 sm:grid-cols-2 lg:grid-cols-5"><input required inputMode="decimal" type="number" min="0.01" step="0.01" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} placeholder="Amount (USD)" className={inputClass} /><DateInput required title="Payment date" value={paymentDate} onChange={setPaymentDate} className={inputClass} /><select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className={inputClass}><option value="cash">Cash</option><option value="bank_transfer">Bank transfer</option><option value="mobile_money">Mobile money</option><option value="other">Other</option></select><input value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} placeholder="Reference (optional)" className={inputClass} /><button disabled={processing} className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">{processing ? "Saving…" : "Save payment"}</button></form> : null}<div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400"><tr><th className="pb-3 pr-4 font-semibold">Date</th><th className="pb-3 pr-4 font-semibold">Method</th><th className="pb-3 pr-4 font-semibold">Reference</th><th className="pb-3 pr-4 text-right font-semibold">Principal</th><th className="pb-3 pr-4 text-right font-semibold">Interest</th><th className="pb-3 text-right font-semibold">Paid</th></tr></thead><tbody>{detail.payments.length ? detail.payments.map((payment) => <tr key={payment.id} className="border-b border-slate-100 dark:border-slate-800"><td className="py-3 pr-4">{formatDate(payment.paymentDate)}</td><td className="py-3 pr-4 capitalize">{payment.method.replace("_", " ")}</td><td className="py-3 pr-4 text-slate-500">{payment.reference || "—"}</td><td className="py-3 pr-4 text-right">{formatCurrency(payment.principalAmount)}</td><td className="py-3 pr-4 text-right">{formatCurrency(payment.interestAmount)}</td><td className="py-3 text-right font-semibold">{formatCurrency(payment.amount)}</td></tr>) : <tr><td colSpan={6} className="py-8 text-center text-slate-500">No repayments recorded yet.</td></tr>}</tbody></table></div></div> : null}
        {!loading && !error && detail && tab === "collateral" ? <div className="space-y-5">{canEdit ? <div><button type="button" onClick={() => setShowCollateralForm((visible) => !visible)} className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700/40 dark:bg-emerald-950/30 dark:text-emerald-200"><ShieldCheck className="h-4 w-4" /> Add collateral</button>{showCollateralForm ? <form onSubmit={addCollateral} className="mt-3 grid gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-700/40 dark:bg-emerald-950/20 sm:grid-cols-2 lg:grid-cols-5"><input required value={collateral.type} onChange={(event) => setCollateral((current) => ({ ...current, type: event.target.value }))} placeholder="Type" className={inputClass} /><input required type="number" min="0" step="0.01" value={collateral.value} onChange={(event) => setCollateral((current) => ({ ...current, value: event.target.value }))} placeholder="Declared value" className={inputClass} /><input required type="number" min="0" step="0.01" value={collateral.marketValue} onChange={(event) => setCollateral((current) => ({ ...current, marketValue: event.target.value }))} placeholder="Market value" className={inputClass} /><input value={collateral.reference} onChange={(event) => setCollateral((current) => ({ ...current, reference: event.target.value }))} placeholder="Reference" className={inputClass} /><button disabled={processing} className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">{processing ? "Saving…" : "Save collateral"}</button><textarea value={collateral.description} onChange={(event) => setCollateral((current) => ({ ...current, description: event.target.value }))} placeholder="Description (optional)" className={`${inputClass} sm:col-span-2 lg:col-span-5`} /></form> : null}</div> : null}<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{detail.collaterals.length ? detail.collaterals.map((item) => <div key={item.id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"><p className="font-semibold text-slate-900 dark:text-white">{item.type}</p><p className="mt-1 text-sm text-slate-500">{item.reference || "No reference"}</p><dl className="mt-4 space-y-2 text-sm"><div className="flex justify-between gap-3"><dt className="text-slate-500">Declared</dt><dd className="font-semibold">{formatCurrency(item.value)}</dd></div><div className="flex justify-between gap-3"><dt className="text-slate-500">Market</dt><dd className="font-semibold">{formatCurrency(item.marketValue)}</dd></div></dl></div>) : <p className="text-sm text-slate-500">No collateral records yet.</p>}</div></div> : null}
        {!loading && !error && detail && tab === "approvals" ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{detail.approvalWorkflow.steps.length ? detail.approvalWorkflow.steps.map((step) => <div key={step.id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"><div className="flex items-start justify-between gap-3"><p className="font-semibold text-slate-900 dark:text-white">{step.order}. {step.label}</p><span className="text-xs font-semibold capitalize text-slate-500">{step.status}</span></div><p className="mt-3 text-sm text-slate-500">{step.approvalCount} of {step.requiredApprovals} approvals</p>{step.decisions.map((decision) => <p key={decision.id} className="mt-2 text-xs text-slate-500">{decision.username} · {decision.action}{decision.comment ? ` — ${decision.comment}` : ""}</p>)}</div>) : <p className="text-sm text-slate-500">No approval steps configured.</p>}</div> : null}
        {!loading && !error && detail && tab === "customer" ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Field label="Customer"><p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white">{detail.loan.borrower.fullName}</p></Field><Field label="Phone"><p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white">{detail.loan.borrower.phone || "—"}</p></Field><Field label="Email"><p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white">{detail.loan.borrower.email || "—"}</p></Field><Field label="National ID"><p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white">{detail.loan.borrower.nationalId || "—"}</p></Field><Field label="Address" className="sm:col-span-2"><p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white">{detail.loan.borrower.address || "—"}</p></Field></div> : null}
        {!loading && !error && detail && tab === "other" ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Field label="Branch"><p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950">{detail.loan.branchLocation || "—"}</p></Field><Field label="Loan Specialist"><p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950">{detail.loan.loanOfficer || "—"}</p></Field><Field label="Created By"><p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950">{detail.loan.createdBy || "—"}</p></Field><Field label="Purpose" className="sm:col-span-2 lg:col-span-3"><p className="min-h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950">{detail.loan.purpose || "—"}</p></Field><Field label="Notes" className="sm:col-span-2 lg:col-span-3"><p className="min-h-20 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950">{detail.loan.notes || "—"}</p></Field></div> : null}
      </div>
    </Card>
  );
}

type JournalViewAccount = Pick<LoanChartAccount, "code" | "name">;
type JournalGroupBy = "none" | "entryDate" | "partnerName" | "sourceType";

function journalDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

function JournalItemsView({ account, onBack }: { account: JournalViewAccount; onBack: () => void }) {
  const { error: toastError, success: toastSuccess } = useToast();
  const [items, setItems] = useState<LoanJournalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [groupBy, setGroupBy] = useState<JournalGroupBy>("none");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const pageSize = 80;

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await api<LoanJournalItem[]>(`/api/loan/journal-items?accountCode=${encodeURIComponent(account.code)}`));
    } catch (caught) {
      setItems([]);
      toastError(caught instanceof Error ? caught.message : "Could not load journal items");
    } finally {
      setLoading(false);
    }
  }, [account.code, toastError]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const sourceTypes = useMemo(() => Array.from(new Set(items.map((item) => item.sourceType).filter(Boolean))).sort(), [items]);
  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const filtered = items.filter((item) => {
      if (sourceFilter && item.sourceType !== sourceFilter) return false;
      if (!normalized) return true;
      return [item.entryNumber, item.entryDate, item.accountCode, item.accountName, item.partnerName, item.description, item.memo, item.reference, item.sourceType]
        .filter(Boolean).join(" ").toLowerCase().includes(normalized);
    });
    if (groupBy === "none") return filtered;
    return [...filtered].sort((left, right) => String(left[groupBy] || "Other").localeCompare(String(right[groupBy] || "Other")) || right.entryDate.localeCompare(left.entryDate));
  }, [groupBy, items, query, sourceFilter]);

  useEffect(() => {
    setPage(1);
  }, [query, sourceFilter, groupBy, account.code]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const visibleItems = filteredItems.slice((page - 1) * pageSize, page * pageSize);
  const pageStart = filteredItems.length ? (page - 1) * pageSize + 1 : 0;
  const pageEnd = Math.min(page * pageSize, filteredItems.length);
  const allVisibleSelected = visibleItems.length > 0 && visibleItems.every((item) => selectedIds.has(item.id));
  const totalDebit = filteredItems.reduce((total, item) => total + item.debit, 0);
  const totalCredit = filteredItems.reduce((total, item) => total + item.credit, 0);

  const groupLabel = (item: LoanJournalItem) => {
    if (groupBy === "entryDate") return journalDate(item.entryDate);
    if (groupBy === "partnerName") return item.partnerName || "No partner";
    if (groupBy === "sourceType") return item.sourceType.replace(/_/g, " ");
    return "";
  };

  const exportJournalItems = () => {
    if (!filteredItems.length) {
      toastError("There are no journal items to export.");
      return;
    }
    const headings = ["Date", "Number", "Account", "Partner", "Label", "Reference", "Source", "Debit", "Credit", "Balance"];
    const rows = filteredItems.map((item) => [journalDate(item.entryDate), item.entryNumber, `${item.accountCode} ${item.accountName}`, item.partnerName || "", item.description || item.memo || "", item.reference || "", item.sourceType, item.debit.toFixed(2), item.credit.toFixed(2), (item.debit - item.credit).toFixed(2)]);
    const csv = [headings, ...rows].map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${account.code}-journal-items-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toastSuccess("Journal items exported.");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Loan management / Loans / Journal Items</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Journal Items</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Account <span className="font-semibold text-slate-700 dark:text-slate-200">{account.code} {account.name}</span></p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={exportJournalItems} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"><TrendingUp className="h-4 w-4" />Export</button>
          <button type="button" onClick={onBack} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">Back to loans</button>
        </div>
      </div>

      <Card className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-xl"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search number, partner, label, or reference" className={`${inputClass} pl-9`} /></div>
          <div className="flex flex-wrap gap-2">
            <select aria-label="Filter journal items" value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"><option value="">All entries</option>{sourceTypes.map((source) => <option key={source} value={source}>{source.replace(/_/g, " ")}</option>)}</select>
            <select aria-label="Group journal items" value={groupBy} onChange={(event) => setGroupBy(event.target.value as JournalGroupBy)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"><option value="none">No grouping</option><option value="entryDate">Group by date</option><option value="partnerName">Group by partner</option><option value="sourceType">Group by source</option></select>
            <button type="button" onClick={() => void loadItems()} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh</button>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] border-collapse text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"><tr><th className="w-14 px-4 py-3"><input type="checkbox" aria-label="Select all journal items on this page" checked={allVisibleSelected} onChange={(event) => setSelectedIds((current) => { const next = new Set(current); visibleItems.forEach((item) => event.target.checked ? next.add(item.id) : next.delete(item.id)); return next; })} className="h-4 w-4 rounded border-slate-300 text-emerald-600" /></th><th className="px-3 py-3 font-semibold">Date</th><th className="px-3 py-3 font-semibold">Number</th><th className="px-3 py-3 font-semibold">Account</th><th className="px-3 py-3 font-semibold">Partner</th><th className="px-3 py-3 font-semibold">Label</th><th className="px-3 py-3 font-semibold">Reference</th><th className="px-3 py-3 text-right font-semibold">Debit</th><th className="px-3 py-3 text-right font-semibold">Credit</th><th className="px-3 py-3 text-right font-semibold">Balance</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={10} className="px-4 py-16 text-center text-slate-500"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />Loading journal items…</td></tr> : null}
              {!loading && visibleItems.map((item, index) => {
                const currentGroup = groupLabel(item);
                const previousGroup = index > 0 ? groupLabel(visibleItems[index - 1]) : null;
                return <Fragment key={item.id}>{groupBy !== "none" && currentGroup !== previousGroup ? <tr className="bg-emerald-50/70 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200"><td colSpan={10} className="px-4 py-2 text-xs font-bold uppercase tracking-wide">{currentGroup}</td></tr> : null}<tr className="border-t border-slate-200 bg-white text-slate-700 transition hover:bg-emerald-50/40 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-emerald-950/20"><td className="px-4 py-3"><input type="checkbox" aria-label={`Select journal item ${item.entryNumber}`} checked={selectedIds.has(item.id)} onChange={(event) => setSelectedIds((current) => { const next = new Set(current); if (event.target.checked) next.add(item.id); else next.delete(item.id); return next; })} className="h-4 w-4 rounded border-slate-300 text-emerald-600" /></td><td className="whitespace-nowrap px-3 py-3">{journalDate(item.entryDate)}</td><td className="max-w-52 truncate px-3 py-3 font-semibold" title={item.entryNumber}>{item.entryNumber}</td><td className="whitespace-nowrap px-3 py-3">{item.accountCode} {item.accountName}</td><td className="max-w-44 truncate px-3 py-3" title={item.partnerName || undefined}>{item.partnerName || "—"}</td><td className="max-w-56 truncate px-3 py-3" title={item.description || item.memo || undefined}>{item.description || item.memo || "—"}</td><td className="max-w-40 truncate px-3 py-3 text-slate-500" title={item.reference || undefined}>{item.reference || "—"}</td><td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">{formatCurrency(item.debit)}</td><td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">{formatCurrency(item.credit)}</td><td className="whitespace-nowrap px-3 py-3 text-right font-semibold tabular-nums">{formatCurrency(item.debit - item.credit)}</td></tr></Fragment>;
              })}
              {!loading && visibleItems.length === 0 ? <tr><td colSpan={10} className="px-4 py-16 text-center"><List className="mx-auto mb-3 h-8 w-8 text-slate-300" /><p className="font-semibold text-slate-700 dark:text-slate-200">No journal items are linked to this account yet.</p><p className="mt-1 text-sm text-slate-500">Approved loan disbursements and recorded repayments will appear here automatically.</p></td></tr> : null}
            </tbody>
            {!loading && filteredItems.length > 0 ? <tfoot className="border-t border-slate-200 bg-slate-50 font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"><tr><td colSpan={7} className="px-3 py-3 text-right">Total</td><td className="px-3 py-3 text-right tabular-nums">{formatCurrency(totalDebit)}</td><td className="px-3 py-3 text-right tabular-nums">{formatCurrency(totalCredit)}</td><td className="px-3 py-3 text-right tabular-nums">{formatCurrency(totalDebit - totalCredit)}</td></tr></tfoot> : null}
          </table>
        </div>
        <div className="flex flex-col items-start justify-between gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400 sm:flex-row sm:items-center"><span>{pageStart}-{pageEnd} of {filteredItems.length}{selectedIds.size ? ` · ${selectedIds.size} selected` : ""}</span><div className="flex items-center gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-xl border border-slate-300 bg-white px-3 py-2 font-semibold text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">Prev</button><span className="px-2 font-medium text-slate-700 dark:text-slate-200">Page {page} of {totalPages}</span><button type="button" disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} className="rounded-xl border border-slate-300 bg-white px-3 py-2 font-semibold text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">Next</button></div></div>
      </Card>
    </div>
  );
}

type BorrowerDirectoryEntry = {
  key: string;
  borrower: LoanEntity["borrower"];
  loans: LoanEntity[];
  outstanding: number;
  latestLoan: LoanEntity;
};

function borrowerKey(loan: LoanEntity): string {
  const borrower = loan.borrower;
  const identifier = borrower.nationalId || borrower.email || borrower.phone || borrower.fullName;
  return identifier.trim().toLocaleLowerCase();
}

function BorrowerDirectory({ loans, loading, onOpenLoan }: { loans: LoanEntity[]; loading: boolean; onOpenLoan: (loan: LoanEntity) => void }) {
  const [query, setQuery] = useState("");
  const [display, setDisplay] = useState<"cards" | "list">("cards");
  const borrowers = useMemo(() => {
    const grouped = new Map<string, BorrowerDirectoryEntry>();
    for (const loan of loans) {
      const key = borrowerKey(loan);
      const current = grouped.get(key);
      if (current) {
        current.loans.push(loan);
        current.outstanding += loan.status === "active" ? loan.outstandingBalance : 0;
        if (loan.createdAt > current.latestLoan.createdAt) current.latestLoan = loan;
      } else {
        grouped.set(key, { key, borrower: loan.borrower, loans: [loan], outstanding: loan.status === "active" ? loan.outstandingBalance : 0, latestLoan: loan });
      }
    }
    return Array.from(grouped.values()).sort((a, b) => a.borrower.fullName.localeCompare(b.borrower.fullName));
  }, [loans]);
  const filteredBorrowers = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return borrowers;
    return borrowers.filter(({ borrower }) => [borrower.fullName, borrower.phone, borrower.email, borrower.nationalId].filter(Boolean).join(" ").toLocaleLowerCase().includes(normalized));
  }, [borrowers, query]);

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Loan management</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Borrowers</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Find a borrower, review their portfolio, and open their latest loan.</p>
          </div>
          <span className="inline-flex w-fit rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">{borrowers.length} borrowers</span>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/60 px-5 py-4 dark:border-slate-800 dark:bg-slate-950/40 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="relative w-full sm:max-w-xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              aria-label="Search borrowers"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, phone, email, or National ID"
              className="w-full rounded-full border border-slate-200 bg-white py-2.5 pl-11 pr-4 text-sm text-slate-900 shadow-sm !outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus-visible:!outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>
          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <span className="text-sm text-slate-500">{filteredBorrowers.length} shown</span>
            <div className="inline-flex rounded-full border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <button type="button" aria-label="Card view" onClick={() => setDisplay("cards")} className={`rounded-full p-2 ${display === "cards" ? "bg-emerald-600 text-white" : "text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`}><LayoutGrid className="h-4 w-4" /></button>
              <button type="button" aria-label="Table view" onClick={() => setDisplay("list")} className={`rounded-full p-2 ${display === "list" ? "bg-emerald-600 text-white" : "text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`}><List className="h-4 w-4" /></button>
            </div>
          </div>
        </div>
      </section>

      {loading ? <Card><div className="flex min-h-40 items-center justify-center text-sm text-slate-500"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading borrowers…</div></Card> : null}
      {!loading && display === "cards" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredBorrowers.length ? filteredBorrowers.map((entry) => (
            <article key={entry.key} className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-800">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"><Users className="h-5 w-5" /></span>
                <div className="min-w-0"><h3 className="truncate font-bold text-slate-900 dark:text-white">{entry.borrower.fullName}</h3><p className="mt-1 truncate text-sm text-slate-500">{entry.borrower.phone || entry.borrower.email || "No contact details"}</p></div>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-950"><dt className="text-xs font-medium text-slate-500">Loans</dt><dd className="mt-1 font-semibold text-slate-900 dark:text-white">{entry.loans.length}</dd></div>
                <div className="rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-950"><dt className="text-xs font-medium text-slate-500">Outstanding</dt><dd className="mt-1 truncate font-semibold text-slate-900 dark:text-white">{formatCurrency(entry.outstanding)}</dd></div>
              </dl>
              <button type="button" onClick={() => onOpenLoan(entry.latestLoan)} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300 dark:hover:bg-emerald-950/50"><Eye className="h-4 w-4" /> Open latest loan</button>
            </article>
          )) : <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900">No borrowers match your search.</div>}
        </div>
      ) : null}
      {!loading && display === "list" ? <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-b border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400"><tr><th className="px-4 py-3 font-semibold">Borrower</th><th className="px-4 py-3 font-semibold">Contact</th><th className="px-4 py-3 text-right font-semibold">Loans</th><th className="px-4 py-3 text-right font-semibold">Outstanding</th><th className="px-4 py-3 font-semibold">Latest loan</th><th className="px-4 py-3"><span className="sr-only">Actions</span></th></tr></thead><tbody>{filteredBorrowers.length ? filteredBorrowers.map((entry) => <tr key={entry.key} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70 dark:border-slate-800 dark:hover:bg-slate-950/50"><td className="px-4 py-4 font-semibold text-slate-900 dark:text-white">{entry.borrower.fullName}</td><td className="px-4 py-4 text-slate-500">{entry.borrower.phone || entry.borrower.email || "—"}</td><td className="px-4 py-4 text-right">{entry.loans.length}</td><td className="px-4 py-4 text-right font-medium">{formatCurrency(entry.outstanding)}</td><td className="px-4 py-4">{entry.latestLoan.loanNumber || "—"}</td><td className="px-4 py-4 text-right"><button type="button" onClick={() => onOpenLoan(entry.latestLoan)} className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700/40 dark:bg-emerald-950/30 dark:text-emerald-200"><Eye className="h-3.5 w-3.5" /> Open loan</button></td></tr>) : <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">No borrowers match your search.</td></tr>}</tbody></table></div></section> : null}
    </div>
  );
}

function emptyContact(): LoanContactInput {
  return { fullName: "", phone: null, email: null, nationalId: null, address: null, occupation: null, income: null, guarantor: null, profile: { entityType: "individual", relationship: "customer" } };
}

function ContactDirectory({ canCreate, canEdit }: { canCreate: boolean; canEdit: boolean }) {
  const { success: toastSuccess, error: toastError } = useToast();
  const [contacts, setContacts] = useState<LoanBorrower[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [display, setDisplay] = useState<"cards" | "list">("cards");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<LoanContactInput>(emptyContact());
  const [saving, setSaving] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  const loadContacts = useCallback(async (search: string) => {
    setLoading(true);
    try {
      setContacts(await api<LoanBorrower[]>(`/api/loan/contacts?limit=200&q=${encodeURIComponent(search)}`));
    } catch (caught) {
      toastError(caught instanceof Error ? caught.message : "Could not load contacts");
    } finally {
      setLoading(false);
    }
  }, [toastError]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadContacts(query), 180);
    return () => window.clearTimeout(timeout);
  }, [loadContacts, query]);

  const openCreate = () => {
    setEditingId(null);
    setDraft(emptyContact());
    setEditorOpen(true);
  };

  const openEdit = (contact: LoanBorrower) => {
    if (!canEdit) return;
    setEditingId(contact.id);
    setDraft({ fullName: contact.fullName, phone: contact.phone, email: contact.email, nationalId: contact.nationalId, address: contact.address, occupation: contact.occupation, income: contact.income, guarantor: contact.guarantor, profile: { ...contact.profile } });
    setEditorOpen(true);
  };

  const saveContact = async () => {
    if (!draft.fullName.trim()) {
      toastError("Contact name is required");
      return;
    }
    setSaving(true);
    try {
      await api<LoanBorrower>("/api/loan/contacts", { method: editingId ? "PUT" : "POST", body: JSON.stringify({ ...draft, id: editingId }) });
      toastSuccess(editingId ? "Contact updated successfully." : "Contact created successfully.");
      setEditorOpen(false);
      await loadContacts(query);
    } catch (caught) {
      toastError(caught instanceof Error ? caught.message : "Could not save contact");
    } finally {
      setSaving(false);
    }
  };

  const importContacts = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const lines = (await file.text()).split(/\r?\n/).filter((line) => line.trim());
      if (lines.length < 2) throw new Error("The CSV file has no contact rows");
      const headers = lines[0].split(",").map((header) => header.trim().replace(/^"|"$/g, "").toLowerCase());
      let imported = 0;
      for (const line of lines.slice(1)) {
        const values = line.split(",").map((value) => value.trim().replace(/^"|"$/g, ""));
        const row = Object.fromEntries(headers.map((header, index) => [header, values[index] || ""]));
        const fullName = row.fullname || row.full_name || row.name;
        if (!fullName) continue;
        await api<LoanBorrower>("/api/loan/contacts", { method: "POST", body: JSON.stringify({ ...emptyContact(), fullName, phone: row.phone || null, email: row.email || null, nationalId: row.nationalid || row.national_id || null, address: row.address || null }) });
        imported += 1;
      }
      toastSuccess(`${imported} contact${imported === 1 ? "" : "s"} imported.`);
      await loadContacts(query);
    } catch (caught) {
      toastError(caught instanceof Error ? caught.message : "Could not import contacts");
    }
  };

  const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "?";
  const setContact = (key: keyof Omit<LoanContactInput, "profile">, value: string) => setDraft((current) => ({ ...current, [key]: key === "income" ? (value ? Number(value) : null) : value || null }));
  const setProfile = (key: string, value: string) => setDraft((current) => ({ ...current, profile: { ...current.profile, [key]: value } }));

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
        <div><p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Loan management</p><h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">Contacts</h1><p className="mt-1 text-sm text-slate-500">Create and manage customers and organisations used by loans.</p></div>
        <div className="flex flex-wrap gap-2">
          {canCreate ? <><button type="button" onClick={openCreate} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"><FilePlus2 className="h-4 w-4" /> Create</button><button type="button" onClick={() => importInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"><Upload className="h-4 w-4" /> Import</button><input ref={importInputRef} type="file" accept=".csv,text/csv" onChange={importContacts} className="hidden" /></> : null}
        </div>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xl"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search contacts" className={`${inputClass} pl-10`} /></div>
        <div className="flex items-center gap-3"><span className="text-sm font-semibold text-slate-500">{contacts.length} contacts</span><div className="inline-flex rounded-xl border border-slate-200 p-1 dark:border-slate-700"><button type="button" aria-label="Card view" onClick={() => setDisplay("cards")} className={`rounded-lg p-2 ${display === "cards" ? "bg-emerald-600 text-white" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"}`}><LayoutGrid className="h-4 w-4" /></button><button type="button" aria-label="List view" onClick={() => setDisplay("list")} className={`rounded-lg p-2 ${display === "list" ? "bg-emerald-600 text-white" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"}`}><List className="h-4 w-4" /></button></div></div>
      </div>
      {loading ? <Card><div className="flex min-h-48 items-center justify-center text-sm text-slate-500"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading contacts…</div></Card> : null}
      {!loading && display === "cards" ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{contacts.map((contact) => <button key={contact.id} type="button" onClick={() => openEdit(contact)} className="flex min-h-36 items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-emerald-300 hover:shadow-md disabled:cursor-default dark:border-slate-800 dark:bg-slate-900" disabled={!canEdit}><span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-4 border-white bg-slate-100 text-lg font-bold text-slate-500 shadow ring-1 ring-slate-200 dark:border-slate-900 dark:bg-slate-800 dark:ring-slate-700">{initials(contact.fullName)}</span><span className="min-w-0"><span className="block truncate font-bold text-slate-900 dark:text-white">{contact.fullName}</span>{contact.profile.nameKhmer ? <span className="mt-1 block truncate text-sm text-slate-500">{contact.profile.nameKhmer}</span> : null}<span className="mt-1 block truncate text-sm text-slate-500">{contact.phone || contact.email || contact.profile.country || "No contact details"}</span></span></button>)}</div> : null}
      {!loading && display === "list" ? <Card className="overflow-hidden p-0"><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300"><tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Phone</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Address</th></tr></thead><tbody>{contacts.map((contact) => <tr key={contact.id} onClick={() => openEdit(contact)} className="cursor-pointer border-t border-slate-200 hover:bg-emerald-50/50 dark:border-slate-800 dark:hover:bg-emerald-950/20"><td className="px-4 py-3 font-semibold">{contact.fullName}</td><td className="px-4 py-3 text-slate-500">{contact.phone || "—"}</td><td className="px-4 py-3 text-slate-500">{contact.email || "—"}</td><td className="px-4 py-3 capitalize">{contact.profile.entityType || "individual"}</td><td className="px-4 py-3 text-slate-500">{contact.address || "—"}</td></tr>)}</tbody></table></div></Card> : null}
      {!loading && contacts.length === 0 ? <Card><div className="py-16 text-center"><UserRound className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 font-semibold text-slate-700 dark:text-slate-200">No contacts found</p><p className="mt-1 text-sm text-slate-500">Create a contact or change your search.</p></div></Card> : null}

      {editorOpen ? <div role="dialog" aria-modal="true" aria-labelledby="contact-editor-title" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-3 sm:p-6"><div className="flex max-h-[calc(100vh-2rem)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950"><div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800"><div><h2 id="contact-editor-title" className="text-xl font-bold text-slate-900 dark:text-white">{editingId ? "Edit Contact" : "Create Contact"}</h2><p className="mt-0.5 text-sm text-slate-500">Contact information can be reused when creating a loan.</p></div><button type="button" onClick={() => setEditorOpen(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close contact form"><X className="h-5 w-5" /></button></div><div className="min-h-0 flex-1 overflow-y-auto p-5"><div className="grid gap-4 md:grid-cols-2"><Field label="Name"><input autoFocus className={inputClass} value={draft.fullName} onChange={(event) => setDraft((current) => ({ ...current, fullName: event.target.value }))} placeholder="Contact name" /></Field><Field label="Contact Type"><select className={inputClass} value={draft.profile.entityType || "individual"} onChange={(event) => setProfile("entityType", event.target.value)}><option value="individual">Individual</option><option value="company">Company</option></select></Field><Field label="Name (Khmer)"><input className={inputClass} value={draft.profile.nameKhmer || ""} onChange={(event) => setProfile("nameKhmer", event.target.value)} placeholder="ឈ្មោះជាភាសាខ្មែរ" /></Field><Field label="Phone"><input className={inputClass} value={draft.phone || ""} onChange={(event) => setContact("phone", event.target.value)} placeholder="Phone" /></Field><Field label="Mobile"><input className={inputClass} value={draft.profile.mobile || ""} onChange={(event) => setProfile("mobile", event.target.value)} placeholder="Mobile" /></Field><Field label="Email"><input type="email" className={inputClass} value={draft.email || ""} onChange={(event) => setContact("email", event.target.value)} placeholder="Email" /></Field><Field label="National ID"><input className={inputClass} value={draft.nationalId || ""} onChange={(event) => setContact("nationalId", event.target.value)} placeholder="National ID" /></Field><Field label="Occupation"><input className={inputClass} value={draft.occupation || ""} onChange={(event) => setContact("occupation", event.target.value)} placeholder="Occupation" /></Field><Field label="Country"><input className={inputClass} value={draft.profile.country || ""} onChange={(event) => setProfile("country", event.target.value)} placeholder="Country" /></Field><Field label="Address"><textarea className={inputClass} value={draft.address || ""} onChange={(event) => setContact("address", event.target.value)} placeholder="Address" rows={3} /></Field></div></div><div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-800"><button type="button" onClick={() => setEditorOpen(false)} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">Discard</button><button type="button" disabled={saving} onClick={() => void saveContact()} className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">{saving ? "Saving…" : "Save"}</button></div></div></div> : null}
    </div>
  );
}

type AccountReportMode = "banking" | "accountReport";
type AccountReportSheet = "summary" | "collection";
type AccountCollectionRow = { id: number; customer: string; amount: string; reason: string };
type AccountResolutionRow = OperationReportAttachment & { id: number; customer: string; assetType: string; interest: string; penalty: string; principal: string; note: string };
type AccountResolutionTextField = "customer" | "assetType" | "interest" | "penalty" | "principal" | "note";
type AccountReportSavedData = { dueRows: AccountCollectionRow[]; paidRows: AccountCollectionRow[]; dueNoticeRows: AccountResolutionRow[]; promiseRows: AccountResolutionRow[]; closedRows: AccountResolutionRow[] };
type AccountReportLocalDraft = AccountReportSavedData & { reportDate: string; reporterName: string; reporterRole: string; department: string; branch: string; activeSheet: AccountReportSheet; loadedStatus: OperationReportStatus; loadedReporterUsername: string };
type AccountReportRecord = { id: string; reportDate: string; reporterUsername: string; reporterName: string; reporterPosition: string; department: string; branch: string; status: OperationReportStatus; data: Partial<AccountReportSavedData>; reviewedBy: string | null; reviewedAt: string | null; reviewComment: string; createdAt: string; updatedAt: string };

const ACCOUNT_REPORT_COLLECTION_REASONS = ["យឺត ៣ថ្ងៃ", "យឺត ៧ថ្ងៃ", "យឺត ១៥ថ្ងៃ", "ប្រភពចំណូលមិនច្បាស់លាស់", "កូនមិនទទួលជួយបង់ជំនួស", "បញ្ហាសុខភាពឈឺចូលពេទ្យ"];
const ACCOUNT_REPORT_RESOLUTION_REASONS = ["បានប្រគល់លិខិតជូនដំណឹង", "បានទាក់ទងមិនចូល", "អតិថិជនសន្យាបង់", "អតិថិជនបដិសេធបង់", "មិនមាននៅទីលំនៅ", "ត្រូវបន្តតាមដាន"];
const ACCOUNT_REPORT_REUSABLE_FIELDS = ["branch", "reporterName", "reporterRole", "department", "customer", "amount", "reason", "assetType", "interest", "penalty", "principal", "note"] as const;

function createAccountCollectionRows(customers: string[] = []): AccountCollectionRow[] {
  return Array.from({ length: 10 }, (_, index) => ({ id: index + 1, customer: customers[index] || "", amount: "", reason: "" }));
}

function createAccountResolutionRows(customers: string[] = [], count = 0): AccountResolutionRow[] {
  return Array.from({ length: 10 }, (_, index) => ({ id: index + 1, customer: index < count ? customers[index] || "" : "", assetType: "", interest: "", penalty: "", principal: "", note: "" }));
}

function accountNumber(value: string) {
  return Number(value.replace(/[^\d.-]/g, "")) || 0;
}

function accountReportDateInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function isValidReportDateInput(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function accountReportDisplayDate(value: string) {
  const date = value ? new Date(`${value}T00:00:00`) : new Date();
  return date.toLocaleDateString("en-US", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}

function appendAccountRowOnEnter<T extends { id: number }>(
  event: ReactKeyboardEvent<HTMLInputElement>,
  rowIndex: number,
  rows: T[],
  onChange: (rows: T[]) => void,
  createRow: (id: number) => T,
  field: string
) {
  if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
  event.preventDefault();
  const table = event.currentTarget.closest("table");
  if (rowIndex < rows.length - 1) {
    requestAnimationFrame(() => {
      table?.querySelector<HTMLInputElement>(`[data-account-row="${rowIndex + 1}"][data-account-field="${field}"]`)?.focus();
    });
    return;
  }
  const nextId = Math.max(0, ...rows.map((row) => row.id)) + 1;
  onChange([...rows, createRow(nextId)]);
  requestAnimationFrame(() => {
    table?.querySelector<HTMLInputElement>(`[data-account-row="${rowIndex + 1}"][data-account-field="${field}"]`)?.focus();
  });
}

function AccountReportView() {
  const user = useAuthUser();
  const searchParams = useSearchParams();
  const { language } = useLanguage();
  const { success: toastSuccess, error: toastError } = useToast();
  const [reportDate, setReportDate] = useState(accountReportDateInputValue());
  const [reporterName, setReporterName] = useState(user.full_name || user.username || "");
  const [reporterRole, setReporterRole] = useState(user.position || "Assistant Accountant");
  const [department, setDepartment] = useState(user.department || "Accountant");
  const [branch, setBranch] = useState(user.branch || "Boeung Keng Kang");
  const [dueRows, setDueRows] = useState<AccountCollectionRow[]>(createAccountCollectionRows);
  const [paidRows, setPaidRows] = useState<AccountCollectionRow[]>(createAccountCollectionRows);
  const [dueNoticeRows, setDueNoticeRows] = useState<AccountResolutionRow[]>(createAccountResolutionRows);
  const [promiseRows, setPromiseRows] = useState<AccountResolutionRow[]>(createAccountResolutionRows);
  const [closedRows, setClosedRows] = useState<AccountResolutionRow[]>(createAccountResolutionRows);
  const [loadingLoans, setLoadingLoans] = useState(false);
  const [activeSheet, setActiveSheet] = useState<AccountReportSheet>("summary");
  const [savedReports, setSavedReports] = useState<AccountReportRecord[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [loadedStatus, setLoadedStatus] = useState<OperationReportStatus>("draft");
  const [loadedReporterUsername, setLoadedReporterUsername] = useState(user.username);
  const [savingReport, setSavingReport] = useState<"draft" | "submitted" | null>(null);
  const [rememberedAssetTypes, setRememberedAssetTypes] = useState<string[]>([]);
  const [localDraftHydrated, setLocalDraftHydrated] = useState(false);
  const [savedValuesOpen, setSavedValuesOpen] = useState(false);
  const [reportPanel, setReportPanel] = useState<"records" | "form">("records");
  const [viewOnly, setViewOnly] = useState(false);
  const [deletingReportId, setDeletingReportId] = useState<string | null>(null);
  const accountReportBranchName = branch.trim().toLocaleLowerCase() === "boeung keng kang" ? "បឹងកេងកង" : branch;
  const restoredLocalDraft = useRef(false);
  const initializedSavedAccountReport = useRef(false);
  const accountReportFormRef = useRef<HTMLDivElement>(null);
  const localDraftStorageKey = `emeraldcash.account-report.draft.${user.username}`;
  const assetTypeStorageKey = `emeraldcash.account-report.asset-types.${user.username}`;
  const rememberedFieldsStorageKey = `emeraldcash.account-report.fields.${user.username}`;
  const { fields: rememberedFields, remember: rememberField, forget: forgetField } = useRememberedReportFields(rememberedFieldsStorageKey);
  const reviewingAnotherAccountReport = loadedReporterUsername.trim().toLocaleLowerCase() !== user.username.trim().toLocaleLowerCase();
  const reportLocked = reviewingAnotherAccountReport || !["draft", "returned"].includes(loadedStatus);

  const selectableAssetTypes = useMemo(() => Array.from(new Set([
    ...rememberedAssetTypes,
    ...(rememberedFields.assetType || []),
    ...dueNoticeRows.map((row) => row.assetType),
    ...promiseRows.map((row) => row.assetType),
    ...closedRows.map((row) => row.assetType),
  ].map((value) => value.trim()).filter(Boolean))).sort((left, right) => left.localeCompare(right)), [closedRows, dueNoticeRows, promiseRows, rememberedAssetTypes, rememberedFields.assetType]);

  const reusableAccountValues = (field: typeof ACCOUNT_REPORT_REUSABLE_FIELDS[number]) => {
    const reportRows = savedReports.flatMap((record) => [
      ...(record.data.dueRows || []),
      ...(record.data.paidRows || []),
      ...(record.data.dueNoticeRows || []),
      ...(record.data.promiseRows || []),
      ...(record.data.closedRows || []),
    ]);
    const currentRows = [...dueRows, ...paidRows, ...dueNoticeRows, ...promiseRows, ...closedRows];
    const metadataValues = field === "branch" ? [branch, user.branch || "", ...savedReports.map((record) => record.branch)]
      : field === "reporterName" ? [reporterName, user.full_name || user.username, ...savedReports.map((record) => record.reporterName)]
        : field === "reporterRole" ? [reporterRole, user.position || user.role, ...savedReports.map((record) => record.reporterPosition)]
          : field === "department" ? [department, user.department || "", ...savedReports.map((record) => record.department)]
            : [];
    const rowValues = [...currentRows, ...reportRows].map((row) => field in row ? String(row[field as keyof typeof row] || "") : "");
    const defaults = field === "reason" ? ACCOUNT_REPORT_COLLECTION_REASONS : field === "note" ? ACCOUNT_REPORT_RESOLUTION_REASONS : field === "assetType" ? selectableAssetTypes : [];
    return Array.from(new Set([...(rememberedFields[field] || []), ...metadataValues, ...rowValues, ...defaults].map((value) => value.trim()).filter(Boolean))).sort((left, right) => left.localeCompare(right)).slice(0, 100);
  };

  const reusableFieldProps = (field: typeof ACCOUNT_REPORT_REUSABLE_FIELDS[number]) => ({
    list: `account-report-${field}-options`,
    onBlur: (event: React.FocusEvent<HTMLInputElement>) => rememberField(field, event.currentTarget.value),
  });

  useEffect(() => {
    try {
      const storedTypes = JSON.parse(window.localStorage.getItem(assetTypeStorageKey) || "[]") as unknown;
      setRememberedAssetTypes(Array.isArray(storedTypes) ? storedTypes.map(String).map((value) => value.trim()).filter(Boolean).slice(0, 100) : []);
      const storedDraft = JSON.parse(window.localStorage.getItem(localDraftStorageKey) || "null") as Partial<AccountReportLocalDraft> | null;
      if (storedDraft) {
        if (typeof storedDraft.reportDate === "string") setReportDate(storedDraft.reportDate);
        if (typeof storedDraft.reporterName === "string") setReporterName(storedDraft.reporterName);
        if (typeof storedDraft.reporterRole === "string") setReporterRole(storedDraft.reporterRole);
        if (typeof storedDraft.department === "string") setDepartment(storedDraft.department);
        // A profile branch change must override an old browser draft. Opened
        // historical records set their own branch later via applySavedReport.
        if (user.branch?.trim()) setBranch(user.branch.trim());
        else if (typeof storedDraft.branch === "string") setBranch(storedDraft.branch);
        if (storedDraft.activeSheet === "summary" || storedDraft.activeSheet === "collection") setActiveSheet(storedDraft.activeSheet);
        if (storedDraft.loadedStatus && ["draft", "submitted", "reviewed", "approved", "returned"].includes(storedDraft.loadedStatus)) setLoadedStatus(storedDraft.loadedStatus);
        if (typeof storedDraft.loadedReporterUsername === "string" && storedDraft.loadedReporterUsername) setLoadedReporterUsername(storedDraft.loadedReporterUsername);
        if (Array.isArray(storedDraft.dueRows)) setDueRows(storedDraft.dueRows);
        if (Array.isArray(storedDraft.paidRows)) setPaidRows(storedDraft.paidRows);
        if (Array.isArray(storedDraft.dueNoticeRows)) setDueNoticeRows(storedDraft.dueNoticeRows);
        if (Array.isArray(storedDraft.promiseRows)) setPromiseRows(storedDraft.promiseRows);
        if (Array.isArray(storedDraft.closedRows)) setClosedRows(storedDraft.closedRows);
        restoredLocalDraft.current = true;
      }
    } catch { /* Browser storage may be unavailable or contain an older format. */ }
    setLocalDraftHydrated(true);
  }, [assetTypeStorageKey, localDraftStorageKey, user.branch]);

  useEffect(() => {
    if (!localDraftHydrated) return;
    if (reviewingAnotherAccountReport) return;
    const draft: AccountReportLocalDraft = { reportDate, reporterName, reporterRole, department, branch, activeSheet, loadedStatus, loadedReporterUsername, dueRows, paidRows, dueNoticeRows, promiseRows, closedRows };
    try { window.localStorage.setItem(localDraftStorageKey, JSON.stringify(draft)); } catch { /* Browser storage may be unavailable. */ }
  }, [activeSheet, branch, closedRows, department, dueNoticeRows, dueRows, loadedReporterUsername, loadedStatus, localDraftHydrated, localDraftStorageKey, paidRows, promiseRows, reportDate, reporterName, reporterRole, reviewingAnotherAccountReport]);

  const rememberAssetType = (value: string) => {
    const normalized = value.trim();
    if (!normalized) return;
    setRememberedAssetTypes((current) => {
      const next = Array.from(new Set([...current, normalized])).sort((left, right) => left.localeCompare(right)).slice(0, 100);
      try { window.localStorage.setItem(assetTypeStorageKey, JSON.stringify(next)); } catch { /* Browser storage may be unavailable. */ }
      return next;
    });
  };

  const dueCount = dueRows.filter((row) => row.customer.trim()).length;
  const paidCount = paidRows.filter((row) => row.customer.trim()).length;
  const duplicateAccountCustomers = useMemo(() => {
    const names = [...dueRows, ...paidRows, ...dueNoticeRows, ...promiseRows, ...closedRows].map((row) => row.customer.trim().toLocaleLowerCase()).filter(Boolean);
    return Array.from(new Set(names.filter((name, index) => names.indexOf(name) !== index)));
  }, [closedRows, dueNoticeRows, dueRows, paidRows, promiseRows]);
  const dueAmount = dueRows.reduce((total, row) => total + accountNumber(row.amount), 0);
  const paidAmount = paidRows.reduce((total, row) => total + accountNumber(row.amount), 0);
  const collectionRate = dueCount ? Math.round((paidCount / dueCount) * 100) : 0;
  const collectionAmountRate = dueAmount ? Math.round((paidAmount / dueAmount) * 100) : 0;
  const resolutionTotal = (rows: AccountResolutionRow[], key: keyof Pick<AccountResolutionRow, "interest" | "penalty" | "principal">) => rows.reduce((total, row) => total + accountNumber(row[key]), 0);
  const promiseInterestTotal = resolutionTotal(promiseRows, "interest");
  const promisePenaltyTotal = resolutionTotal(promiseRows, "penalty");
  const promisePrincipalTotal = resolutionTotal(promiseRows, "principal");
  const closedInterestTotal = resolutionTotal(closedRows, "interest");
  const closedPenaltyTotal = resolutionTotal(closedRows, "penalty");
  const closedPrincipalTotal = resolutionTotal(closedRows, "principal");

  const applySavedReport = useCallback((record: AccountReportRecord) => {
    setReportDate(record.reportDate);
    setReporterName(record.reporterName);
    setReporterRole(record.reporterPosition);
    setDepartment(record.department);
    setBranch(record.branch);
    setDueRows(record.data.dueRows?.length ? record.data.dueRows : createAccountCollectionRows());
    setPaidRows(record.data.paidRows?.length ? record.data.paidRows : createAccountCollectionRows());
    setDueNoticeRows(record.data.dueNoticeRows?.length ? record.data.dueNoticeRows : createAccountResolutionRows());
    setPromiseRows(record.data.promiseRows?.length ? record.data.promiseRows : createAccountResolutionRows());
    setClosedRows(record.data.closedRows?.length ? record.data.closedRows : createAccountResolutionRows());
    setLoadedStatus(record.status);
    setLoadedReporterUsername(record.reporterUsername);
  }, []);

  const openSavedAccountReport = useCallback((record: AccountReportRecord, sheet: AccountReportSheet, readOnly = false) => {
    applySavedReport(record);
    setActiveSheet(readOnly ? "collection" : sheet);
    setViewOnly(readOnly);
    setReportPanel("form");
    window.setTimeout(() => accountReportFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    toastSuccess(record.reporterUsername === user.username
      ? (language === "km" ? "បានផ្ទុករបាយការណ៍គណនេយ្យរបស់អ្នក។" : "Your Account Report was loaded.")
      : (language === "km" ? `កំពុងមើលរបាយការណ៍គណនេយ្យរបស់ ${record.reporterName || record.reporterUsername}។` : `Viewing ${record.reporterName || record.reporterUsername}'s Account Report.`));
  }, [applySavedReport, language, toastSuccess, user.username]);

  useEffect(() => {
    if (searchParams.get("reportPanel") === "records") {
      setReportPanel("records");
      setActiveSheet("summary");
      setViewOnly(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (reportPanel === "records") {
      setActiveSheet("summary");
      setViewOnly(false);
    }
  }, [localDraftHydrated, reportPanel]);

  const loadAccountReports = useCallback(async () => {
    setReportsLoading(true);
    try {
      const records = await api<AccountReportRecord[]>("/api/loan/account-reports?limit=500");
      setSavedReports(records);
      if (!initializedSavedAccountReport.current) {
        initializedSavedAccountReport.current = true;
        const current = records.find((record) => record.reporterUsername === user.username && record.reportDate === reportDate);
        if (current && !restoredLocalDraft.current) applySavedReport(current);
      }
    } catch (caught) {
      toastError(caught instanceof Error ? caught.message : "Could not load Account Reports");
    } finally {
      setReportsLoading(false);
    }
  }, [applySavedReport, reportDate, toastError, user.username]);

  useEffect(() => { void loadAccountReports(); }, [loadAccountReports]);

  const changeAccountReportDate = (date: string) => {
    const saved = savedReports.find((record) => record.reporterUsername === user.username && record.reportDate === date);
    if (saved) applySavedReport(saved);
    else {
      setReportDate(date);
      setReporterName(user.full_name || user.username);
      setReporterRole(user.position || user.role);
      setDepartment(user.department || "Accountant");
      setBranch(user.branch || "Boeung Keng Kang");
      setDueRows(createAccountCollectionRows());
      setPaidRows(createAccountCollectionRows());
      setDueNoticeRows(createAccountResolutionRows());
      setPromiseRows(createAccountResolutionRows());
      setClosedRows(createAccountResolutionRows());
      setLoadedStatus("draft");
      setLoadedReporterUsername(user.username);
    }
  };

  const startNewAccountReport = () => {
    const nextDate = window.prompt(language === "km" ? "បញ្ចូលកាលបរិច្ឆេទសម្រាប់របាយការណ៍ថ្មី (YYYY-MM-DD)" : "Enter the date for the new report (YYYY-MM-DD)", accountReportDateInputValue())?.trim() || "";
    if (!isValidReportDateInput(nextDate)) {
      toastError(language === "km" ? "សូមបញ្ចូលកាលបរិច្ឆេទត្រឹមត្រូវ។" : "Enter a valid report date.");
      return;
    }
    const existing = savedReports.find((record) => record.reporterUsername === user.username && record.reportDate === nextDate);
    if (existing) {
      toastError(language === "km" ? "មានរបាយការណ៍គណនេយ្យរបស់អ្នកសម្រាប់កាលបរិច្ឆេទនេះរួចហើយ។ សូមជ្រើសរើសកាលបរិច្ឆេទថ្មី។" : "You already have an Account Report for this date. Choose a new date.");
      return;
    }
    setReportDate(nextDate);
    setReporterName(user.full_name || user.username);
    setReporterRole(user.position || user.role);
    setDepartment(user.department || "Accountant");
    setBranch(user.branch || "Boeung Keng Kang");
    setDueRows(createAccountCollectionRows());
    setPaidRows(createAccountCollectionRows());
    setDueNoticeRows(createAccountResolutionRows());
    setPromiseRows(createAccountResolutionRows());
    setClosedRows(createAccountResolutionRows());
    setLoadedStatus("draft");
    setLoadedReporterUsername(user.username);
    setActiveSheet("collection");
    setViewOnly(false);
    setReportPanel("form");
    toastSuccess(language === "km" ? "បានចាប់ផ្ដើមរបាយការណ៍គណនេយ្យថ្មី។ កំណត់ត្រាចាស់មិនត្រូវបានលុបទេ។" : "New Account Report started. Existing report records were not deleted.");
  };

  const deleteAccountReport = async (record: AccountReportRecord) => {
    if (!window.confirm(language === "km" ? `លុបរបាយការណ៍គណនេយ្យរបស់ ${record.reporterName || record.reporterUsername} មែនទេ?` : `Delete ${record.reporterName || record.reporterUsername}'s Account Report?`)) return;
    setDeletingReportId(record.id);
    try {
      await api<{ id: string }>(`/api/loan/account-reports?id=${encodeURIComponent(record.id)}`, { method: "DELETE" });
      toastSuccess(language === "km" ? "បានលុបរបាយការណ៍គណនេយ្យ។" : "Account Report deleted.");
      await loadAccountReports();
    } catch (caught) {
      toastError(caught instanceof Error ? caught.message : "Could not delete Account Report");
    } finally {
      setDeletingReportId(null);
    }
  };

  const saveAccountReport = async (status: "draft" | "submitted") => {
    if (viewOnly) {
      toastError(language === "km" ? "សូមចុច កែ ឬ ធ្វើបច្ចុប្បន្នភាព ដើម្បីកែប្រែរបាយការណ៍នេះ។" : "Choose Edit or Update before changing this report.");
      return;
    }
    if (reviewingAnotherAccountReport) {
      toastError(language === "km" ? "របាយការណ៍នេះជារបស់អ្នករាយការណ៍ផ្សេង ហើយអាចមើលបានតែប៉ុណ្ណោះ។" : "This Account Report belongs to another reporter and is view-only.");
      return;
    }
    if (reportLocked) {
      toastError(language === "km" ? "របាយការណ៍នេះត្រូវបានចាក់សោសម្រាប់ពិនិត្យ។" : "This Account Report is locked for review.");
      return;
    }
    setSavingReport(status);
    try {
      const saved = await api<AccountReportRecord>("/api/loan/account-reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reportDate, reporterName, reporterPosition: reporterRole, department, branch, status, data: { dueRows, paidRows, dueNoticeRows, promiseRows, closedRows } }) });
      setLoadedStatus(saved.status);
      setLoadedReporterUsername(saved.reporterUsername);
      toastSuccess(status === "submitted" ? "Account Report submitted to BM. A notification was sent." : "Account Report saved as draft.");
      await loadAccountReports();
    } catch (caught) {
      toastError(caught instanceof Error ? caught.message : "Could not save Account Report");
    } finally {
      setSavingReport(null);
    }
  };

  const prepareFromLoans = async () => {
    if (reportLocked || viewOnly) return;
    setLoadingLoans(true);
    try {
      const loans = await api<LoanEntity[]>("/api/loan/loans?limit=200");
      const activeLoans = loans.filter((loan) => !["Closed", "Rejected", "Draft"].includes(loan.repaymentStatus)).slice(0, 10);
      const names = activeLoans.map((loan) => loan.borrower.fullName);
      const collection = activeLoans.map((loan, index) => ({ id: index + 1, customer: loan.borrower.fullName, amount: String(loan.paymentAmount || ""), reason: loan.nextPaymentDate && loan.nextPaymentDate.slice(0, 10) < reportDate ? "យឺត" : "ដល់ថ្ងៃបង់" }));
      const paddedCollection = [...collection, ...createAccountCollectionRows([]).slice(0, Math.max(0, 10 - collection.length)).map((row, index) => ({ ...row, id: collection.length + index + 1 }))];
      const resolution = activeLoans.map((loan, index) => ({ id: index + 1, customer: loan.borrower.fullName, assetType: loan.loanType, interest: String(loan.paymentAmount || ""), penalty: "", principal: String(loan.outstandingBalance || loan.principal || ""), note: "" }));
      const paddedResolution = [...resolution, ...createAccountResolutionRows([], 0).slice(0, Math.max(0, 10 - resolution.length)).map((row, index) => ({ ...row, id: resolution.length + index + 1 }))];
      setDueRows(paddedCollection);
      setPaidRows(createAccountCollectionRows(names.slice(0, Math.min(3, names.length))));
      setDueNoticeRows(paddedResolution);
      toastSuccess("Account report prepared from active loans.");
    } catch (caught) {
      toastError(caught instanceof Error ? caught.message : "Could not prepare report from loans");
    } finally {
      setLoadingLoans(false);
    }
  };

  const exportAccountReport = async () => {
    try {
      const { exportAccountReportExcel } = await import("@/systems/loan/utils/exportAccountReportExcel");
      await exportAccountReportExcel({ reportDate, reportDateDisplay: accountReportDisplayDate(reportDate), reporterName, reporterRole, department, dueRows, paidRows, dueNoticeRows, promiseRows, closedRows });
      toastSuccess("Account report exported to Excel.");
    } catch (caught) {
      toastError(caught instanceof Error ? caught.message : "Could not export account report");
    }
  };

  const updateCollection = (rows: AccountCollectionRow[], rowId: number, key: keyof Omit<AccountCollectionRow, "id">, value: string, setter: (rows: AccountCollectionRow[]) => void) => setter(rows.map((row) => row.id === rowId ? { ...row, [key]: value } : row));
  const updateResolution = (rows: AccountResolutionRow[], rowId: number, key: AccountResolutionTextField, value: string, setter: (rows: AccountResolutionRow[]) => void) => setter(rows.map((row) => row.id === rowId ? { ...row, [key]: value } : row));
  const cellInput = "w-full min-w-0 border-0 bg-transparent px-2 py-1.5 text-sm text-slate-900 outline-none focus:bg-emerald-50 focus:ring-1 focus:ring-emerald-500 dark:text-white dark:focus:bg-emerald-950/30";
  const khmerHeader = "bg-[#087323] text-white";
  const redHeader = "bg-[#c90000] text-white";

  const renderCollectionTable = (title: string, rows: AccountCollectionRow[], setter: (rows: AccountCollectionRow[]) => void, headerClass = khmerHeader) => {
    const total = rows.reduce((sum, row) => sum + accountNumber(row.amount), 0);
    const onEnter = (event: ReactKeyboardEvent<HTMLInputElement>, index: number, field: keyof Omit<AccountCollectionRow, "id">) => appendAccountRowOnEnter(event, index, rows, setter, (id) => ({ id, customer: "", amount: "", reason: "" }), field);
    return <section className="min-w-0 overflow-x-auto"><div className="min-w-[560px]"><h3 className={`flex items-center justify-between border border-slate-300 px-3 py-2 text-sm font-bold ${headerClass}`}><span>{title}</span><button type="button" onClick={() => setter(rows.length > 1 ? rows.slice(0, -1) : createAccountCollectionRows().slice(0, 1))} className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs hover:bg-white/15"><X className="h-3.5 w-3.5" />Remove last row</button></h3><table className="w-full table-fixed border-collapse text-sm"><thead className={headerClass}><tr><th className="w-14 border border-slate-300 px-2 py-2">ល.រ</th><th className="border border-slate-300 px-2 py-2">ឈ្មោះអតិថិជន</th><th className="w-36 border border-slate-300 px-2 py-2">ជាសាច់ប្រាក់ ($)</th><th className="border border-slate-300 px-2 py-2">មូលហេតុ</th></tr></thead><tbody>{rows.map((row, index) => <tr key={row.id}><td className="border border-slate-300 px-2 py-2 text-center">{index + 1}</td><td className="border border-slate-300"><input data-account-row={index} data-account-field="customer" {...reusableFieldProps("customer")} value={row.customer} placeholder="ឈ្មោះអតិថិជន" onKeyDown={(event) => onEnter(event, index, "customer")} onChange={(event) => updateCollection(rows, row.id, "customer", event.target.value, setter)} className={cellInput} /></td><td className="border border-slate-300"><input data-account-row={index} data-account-field="amount" {...reusableFieldProps("amount")} value={row.amount} placeholder="0.00" onKeyDown={(event) => onEnter(event, index, "amount")} onChange={(event) => updateCollection(rows, row.id, "amount", event.target.value, setter)} className={`${cellInput} text-right tabular-nums`} /></td><td className="border border-slate-300"><input data-account-row={index} data-account-field="reason" {...reusableFieldProps("reason")} value={row.reason} placeholder="ជ្រើសរើស ឬបញ្ចូលមូលហេតុ" onKeyDown={(event) => onEnter(event, index, "reason")} onChange={(event) => updateCollection(rows, row.id, "reason", event.target.value, setter)} className={cellInput} /></td></tr>)}</tbody><tfoot><tr className="border-t-2 border-slate-900 bg-slate-100 font-bold text-red-600 dark:bg-slate-800"><td colSpan={2} className="border border-slate-300 px-2 py-2 text-center">សរុប</td><td className="border border-slate-300 px-2 py-2 text-right tabular-nums">{formatCurrency(total)}</td><td className="border border-slate-300" /></tr></tfoot></table></div></section>;
  };

  const renderResolutionTable = (title: string, rows: AccountResolutionRow[], setter: (rows: AccountResolutionRow[]) => void, totals: { interest: number; penalty: number; principal: number }, allowImages = false) => {
    const onEnter = (event: ReactKeyboardEvent<HTMLInputElement>, index: number, field: AccountResolutionTextField) => appendAccountRowOnEnter(event, index, rows, setter, (id) => ({ id, customer: "", assetType: "", interest: "", penalty: "", principal: "", note: "" }), field);
    return (
    <section className="min-w-0 overflow-x-auto">
      <div className="min-w-[900px]">
      <h3 className="flex items-center justify-between border border-slate-300 px-3 py-2 text-sm font-bold text-red-600"><span>{title}</span><button type="button" onClick={() => setter(rows.length > 1 ? rows.slice(0, -1) : createAccountResolutionRows().slice(0, 1))} className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-red-700 hover:bg-red-50"><X className="h-3.5 w-3.5" />Remove last row</button></h3>
      <table className="w-full table-fixed border-collapse text-sm">
        <thead className={khmerHeader}><tr><th className="w-14 border border-slate-300 px-2 py-2">ល.រ</th><th className="border border-slate-300 px-2 py-2">ឈ្មោះអតិថិជន</th><th className="border border-slate-300 px-2 py-2">ប្រភេទទ្រព្យ</th><th className="w-32 border border-slate-300 px-2 py-2">ការប្រាក់ ($)</th><th className="w-32 border border-slate-300 px-2 py-2">ពិន័យ ($)</th><th className="w-36 border border-slate-300 px-2 py-2">ប្រាក់ដើម ($)</th><th className="border border-slate-300 px-2 py-2">មូលហេតុ</th>{allowImages ? <th className="w-44 border border-slate-300 px-2 py-2">រូបភាពលិខិត</th> : null}</tr></thead>
        <tbody>{rows.map((row, index) => <tr key={row.id}><td className="border border-slate-300 px-2 py-2 text-center">{index + 1}</td><td className="border border-slate-300"><input data-account-row={index} data-account-field="customer" {...reusableFieldProps("customer")} value={row.customer} placeholder="ឈ្មោះអតិថិជន" onKeyDown={(event) => onEnter(event, index, "customer")} onChange={(event) => updateResolution(rows, row.id, "customer", event.target.value, setter)} className={cellInput} /></td><td className="border border-slate-300"><input data-account-row={index} data-account-field="assetType" {...reusableFieldProps("assetType")} value={row.assetType} placeholder="ជ្រើសរើស ឬបញ្ចូលប្រភេទទ្រព្យ" onBlur={(event) => { rememberAssetType(event.target.value); rememberField("assetType", event.target.value); }} onKeyDown={(event) => { if (event.key === "Enter") rememberAssetType(event.currentTarget.value); onEnter(event, index, "assetType"); }} onChange={(event) => updateResolution(rows, row.id, "assetType", event.target.value, setter)} className={cellInput} /></td><td className="border border-slate-300"><input data-account-row={index} data-account-field="interest" {...reusableFieldProps("interest")} value={row.interest} placeholder="0.00" onKeyDown={(event) => onEnter(event, index, "interest")} onChange={(event) => updateResolution(rows, row.id, "interest", event.target.value, setter)} className={`${cellInput} text-right tabular-nums`} /></td><td className="border border-slate-300"><input data-account-row={index} data-account-field="penalty" {...reusableFieldProps("penalty")} value={row.penalty} placeholder="0.00" onKeyDown={(event) => onEnter(event, index, "penalty")} onChange={(event) => updateResolution(rows, row.id, "penalty", event.target.value, setter)} className={`${cellInput} text-right tabular-nums`} /></td><td className="border border-slate-300"><input data-account-row={index} data-account-field="principal" {...reusableFieldProps("principal")} value={row.principal} placeholder="0.00" onKeyDown={(event) => onEnter(event, index, "principal")} onChange={(event) => updateResolution(rows, row.id, "principal", event.target.value, setter)} className={`${cellInput} text-right tabular-nums`} /></td><td className="border border-slate-300"><input data-account-row={index} data-account-field="note" {...reusableFieldProps("note")} value={row.note} placeholder="ជ្រើសរើស ឬបញ្ចូលមូលហេតុ" onKeyDown={(event) => onEnter(event, index, "note")} onChange={(event) => updateResolution(rows, row.id, "note", event.target.value, setter)} className={cellInput} /></td>{allowImages ? <td className="border border-slate-300 px-2 py-1"><OperationReportImageCell images={row.images} imageUrl={row.imageUrl} imageName={row.imageName} onChange={(attachment) => setter(rows.map((item) => item.id === row.id ? { ...item, ...attachment } : item))} /></td> : null}</tr>)}</tbody>
        <tfoot><tr className="border-t-2 border-slate-900 bg-slate-100 font-bold text-red-600 dark:bg-slate-800"><td colSpan={3} className="border border-slate-300 px-2 py-2 text-center">សរុប</td><td className="border border-slate-300 px-2 py-2 text-right tabular-nums">{formatCurrency(totals.interest)}</td><td className="border border-slate-300 px-2 py-2 text-right tabular-nums">{totals.penalty ? formatCurrency(totals.penalty) : "-"}</td><td className="border border-slate-300 px-2 py-2 text-right tabular-nums">{formatCurrency(totals.principal)}</td><td className="border border-slate-300" />{allowImages ? <td className="border border-slate-300" /> : null}</tr></tfoot>
      </table>
      </div>
    </section>
    );
  };

  return (
    <div className="min-w-0 space-y-4 lg:[zoom:0.9]">
      <div className={`${reportPanel === "records" ? "hidden" : "sticky"} top-0 z-40 space-y-2 border-b border-slate-200 bg-slate-50/95 pb-2 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/95 print:static print:border-0 print:bg-transparent print:pb-0`}>
      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-900 print:hidden">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button type="button" onClick={() => setReportPanel("records")} className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300"><List className="h-4 w-4" />{language === "km" ? "កំណត់ត្រា" : "Records"}</button>
        <button type="button" onClick={() => setSavedValuesOpen((open) => !open)} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"><List className="h-4 w-4" />Saved values</button>
        <button type="button" disabled={Boolean(savingReport) || loadingLoans} onClick={startNewAccountReport} className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"><FilePlus2 className="h-4 w-4" />{language === "km" ? "របាយការណ៍ថ្មី" : "New Report"}</button>
        <span className={`inline-flex items-center rounded-lg px-3 py-2 text-sm font-semibold ${operationReportStatusClass(loadedStatus)}`}>{operationReportStatusLabel(loadedStatus, language)}</span>
        <button type="button" disabled={Boolean(savingReport) || loadingLoans || reportLocked} onClick={() => void saveAccountReport("draft")} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">{savingReport === "draft" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save Draft</button>
        <button type="button" disabled={Boolean(savingReport) || loadingLoans || reportLocked} onClick={() => void saveAccountReport("submitted")} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">{savingReport === "submitted" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}Submit to BM</button>
        <button type="button" disabled={loadingLoans || reportLocked} onClick={() => void prepareFromLoans()} className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"><RefreshCw className={`h-4 w-4 ${loadingLoans ? "animate-spin" : ""}`} />Prepare from loans</button>
        <button type="button" onClick={exportAccountReport} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"><Download className="h-4 w-4" />Export</button>
        <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"><Printer className="h-4 w-4" />Print</button>
      </div>
      </div>
      {reportLocked && !reviewingAnotherAccountReport ? <section className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/25 dark:text-amber-100"><strong>{language === "km" ? "របាយការណ៍ត្រូវបានចាក់សោសម្រាប់ពិនិត្យ៖" : "Report locked for review:"}</strong> {language === "km" ? "របាយការណ៍គណនេយ្យដែលបានដាក់ស្នើ មិនអាចកែប្រែ ឬដាក់ស្នើម្តងទៀតបានទេ រហូតដល់ BM បញ្ជូនត្រឡប់ឱ្យកែតម្រូវ។" : "A submitted Account Report cannot be changed or submitted again until the BM returns it for correction."}</section> : null}
      <div role="tablist" aria-label="Account report sheets" className="font-khmer-battambang rounded-xl border border-slate-200 bg-slate-100 p-2 shadow-sm print:hidden dark:border-slate-700 dark:bg-slate-900">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            role="tab"
            aria-selected={activeSheet === "summary"}
            onClick={() => setActiveSheet("summary")}
            className={`min-h-12 min-w-0 rounded-xl border-2 px-4 py-2 text-center text-base font-bold shadow-sm transition-all ${activeSheet === "summary" ? "border-blue-700 bg-blue-600 text-white shadow-md ring-2 ring-blue-200 hover:bg-blue-700 dark:ring-blue-900" : "border-blue-200 bg-blue-50 text-blue-800 hover:-translate-y-0.5 hover:border-blue-400 hover:bg-blue-100 hover:shadow-md dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200 dark:hover:bg-blue-900/60"}`}
          >
            របាយការណ៍សង្ខេប
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeSheet === "collection"}
            onClick={() => setActiveSheet("collection")}
            className={`min-h-12 min-w-0 rounded-xl border-2 px-4 py-2 text-center text-base font-bold shadow-sm transition-all ${activeSheet === "collection" ? "border-emerald-700 bg-emerald-600 text-white shadow-md ring-2 ring-emerald-200 hover:bg-emerald-700 dark:ring-emerald-900" : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:-translate-y-0.5 hover:border-emerald-400 hover:bg-emerald-100 hover:shadow-md dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200 dark:hover:bg-emerald-900/60"}`}
          >
            អតិថិជនប្រមូល&amp;ដោះស្រាយ
          </button>
        </div>
      </div>
      </div>
      {reportPanel === "form" && savedValuesOpen ? <RememberedReportValuesManager fields={rememberedFields} onRemove={forgetField} onClose={() => setSavedValuesOpen(false)} /> : null}
      {reportPanel === "form" && loadedStatus === "returned" ? <section className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-800 dark:bg-red-950/25 dark:text-red-200"><strong>Returned for correction:</strong> {savedReports.find((record) => record.reporterUsername === loadedReporterUsername && record.reportDate === reportDate)?.reviewComment || "Please update the report and submit it again."}</section> : null}
      {reportPanel === "form" && reviewingAnotherAccountReport ? <section className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/25 dark:text-amber-100"><strong>{language === "km" ? "សម្រាប់មើលតែប៉ុណ្ណោះ៖" : "View only:"}</strong> {language === "km" ? "របាយការណ៍នេះជារបស់" : "This Account Report belongs to"} {reporterName || loadedReporterUsername}.</section> : null}
      {reportPanel === "form" && duplicateAccountCustomers.length ? <section role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/25 dark:text-amber-100"><strong>Duplicate customer warning:</strong> {duplicateAccountCustomers.join(", ")}</section> : null}
      <div ref={accountReportFormRef} className="scroll-mt-20">
      <Card className="min-w-0 overflow-hidden rounded-xl border border-slate-300 bg-white p-0 shadow-sm dark:border-slate-700 dark:bg-slate-950">
        <fieldset disabled={reportPanel === "records" || reportLocked || viewOnly} className="min-w-0 border-0 p-0 disabled:opacity-90">
        <div className="overflow-visible">
          <div className="min-w-0 p-0 text-slate-950 dark:text-slate-100">
            {!viewOnly ? <>
            <div className="relative flex min-h-28 items-center justify-center border-b border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-950 sm:min-h-36">
              <div className="absolute inset-y-0 left-0 flex items-center justify-center p-3 sm:p-4"><EmeraldCashLogo className="h-auto w-28 object-contain sm:w-44" /></div>
              <div className="font-khmer-muol-light w-full px-20 text-center text-xl text-red-700 sm:px-32 sm:text-3xl">ក្រុមហ៊ុន អេមើរ៉ល ឃែស ឯ.ក</div>
            </div>
            <div className="font-khmer-muol-light border-b border-slate-300 py-3 text-center text-2xl text-emerald-700 dark:border-slate-700">របាយការណ៍លទ្ធផលប្រចាំថ្ងៃ សាខា {accountReportBranchName}</div>
            <div className="grid grid-cols-1 border-b border-slate-300 dark:border-slate-700 lg:grid-cols-[1fr_180px_1.4fr_1fr]">
              <div className="hidden border-r border-slate-300 dark:border-slate-700 lg:block" />
              <div className="grid grid-cols-[120px_minmax(0,1fr)] sm:grid-cols-[180px_minmax(0,1fr)] lg:col-span-2">
                <div className="flex min-h-12 items-center justify-end whitespace-nowrap border-b border-slate-300 px-3 py-2 text-right font-semibold dark:border-slate-700">កាលបរិច្ឆេទ៖</div>
                <DateInput title="Report date" disabled={reportLocked} value={reportDate} onChange={changeAccountReportDate} className="block min-h-12 w-full border-0 border-b border-slate-300 px-3 py-2 outline-none focus:bg-emerald-50 disabled:opacity-70 dark:border-slate-700 dark:bg-transparent dark:focus:bg-emerald-950/30" />
                <div className="flex min-h-12 items-center justify-end whitespace-nowrap border-b border-slate-300 px-3 py-2 text-right font-semibold dark:border-slate-700">ឈ្មោះ៖</div>
                <input disabled={reportLocked} {...reusableFieldProps("reporterName")} value={reporterName} onChange={(event) => setReporterName(event.target.value)} className="block min-h-12 w-full border-0 border-b border-slate-300 px-3 py-2 outline-none focus:bg-emerald-50 disabled:opacity-70 dark:border-slate-700 dark:bg-transparent dark:focus:bg-emerald-950/30" />
                <div className="flex min-h-12 items-center justify-end whitespace-nowrap border-b border-slate-300 px-3 py-2 text-right font-semibold dark:border-slate-700">តួនាទី៖</div>
                <input disabled={reportLocked} {...reusableFieldProps("reporterRole")} value={reporterRole} onChange={(event) => setReporterRole(event.target.value)} className="block min-h-12 w-full border-0 border-b border-slate-300 px-3 py-2 outline-none focus:bg-emerald-50 disabled:opacity-70 dark:border-slate-700 dark:bg-transparent dark:focus:bg-emerald-950/30" />
                <div className="flex min-h-12 items-center justify-end whitespace-nowrap px-3 py-2 text-right font-semibold">នាយកដ្ឋាន៖</div>
                <input disabled={reportLocked} {...reusableFieldProps("department")} value={department} onChange={(event) => setDepartment(event.target.value)} className="block min-h-12 w-full border-0 px-3 py-2 outline-none focus:bg-emerald-50 disabled:opacity-70 dark:bg-transparent dark:focus:bg-emerald-950/30" />
              </div>
              <div aria-hidden="true" className="hidden border-l border-slate-300 dark:border-slate-700 lg:block" />
            </div>
            <div className="h-10 border-b border-slate-300 dark:border-slate-700" />
            </> : null}
            {activeSheet === "summary" ? (
              <table className="w-full table-fixed border-collapse text-sm">
                <thead className={khmerHeader}><tr><th className="border border-slate-300 px-3 py-3">ការប្រមូល</th><th className="border border-slate-300 px-3 py-3">ចំនួនអតិថិជន (នាក់)</th><th className="border border-slate-300 px-3 py-3">ចំនួនទឹកប្រាក់</th></tr></thead>
                <tbody><tr><td className="border border-slate-300 px-3 py-2">អតិថិជនត្រូវបង់សរុប</td><td className="border border-slate-300 px-3 py-2 text-center">{dueCount}</td><td className="border border-slate-300 px-3 py-2 text-right">{formatCurrency(dueAmount)}</td></tr><tr><td className="border border-slate-300 px-3 py-2">ចំនួនអតិថិជនដែលបានបង់សរុប</td><td className="border border-slate-300 px-3 py-2 text-center">{paidCount}</td><td className="border border-slate-300 px-3 py-2 text-right">{formatCurrency(paidAmount)}</td></tr><tr><td className="border border-slate-300 px-3 py-2">អត្រាប្រមូលប្រាក់គិតជាភាគរយ</td><td className="border border-slate-300 px-3 py-2 text-center">{collectionRate}%</td><td className="border border-slate-300 px-3 py-2 text-right">{collectionAmountRate}%</td></tr></tbody>
                <thead className={khmerHeader}><tr><th className="border border-slate-300 px-3 py-3">ការដោះស្រាយ</th><th className="border border-slate-300 px-3 py-3">ចំនួន (នាក់)</th><th className="border border-slate-300 px-3 py-3">ជាសាច់ប្រាក់ (សរុបគិតជាដុល្លារ)</th></tr></thead>
                <tbody><tr><td className="border border-slate-300 px-3 py-2">ជូនដំណឹងទៅអតិថិជន ដល់ថ្ងៃកំណត់ត្រូវបង់</td><td className="border border-slate-300 px-3 py-2 text-center">{dueNoticeRows.filter((row) => row.customer.trim()).length}</td><td className="border border-slate-300" /></tr><tr><td className="border border-slate-300 px-3 py-2">បានបន្តទាក់ទងអតិថិជនដែលយឺតចាប់ពី ១ថ្ងៃ ដល់ ៣ថ្ងៃ</td><td className="border border-slate-300 px-3 py-2 text-center">{promiseRows.filter((row) => row.customer.trim()).length}</td><td className="border border-slate-300 px-3 py-2 text-right">{formatCurrency(promiseInterestTotal)}</td></tr><tr><td className="border border-slate-300 px-3 py-2">ផ្ញើលិខិតជូនដំណឹងផ្លូវការសម្រាប់អតិថិជនយឺតចាប់ពី ៤ថ្ងៃ</td><td className="border border-slate-300 px-3 py-2 text-center">{closedRows.filter((row) => row.customer.trim()).length}</td><td className="border border-slate-300 px-3 py-2 text-right">{formatCurrency(closedInterestTotal)}</td></tr></tbody>
                <tfoot><tr className="border-t-2 border-slate-900 bg-slate-100 font-bold text-red-600 dark:bg-slate-800"><td colSpan={2} className="border border-slate-300 px-3 py-3 text-center">សរុប</td><td className="border border-slate-300 px-3 py-3 text-right text-lg">{formatCurrency(promiseInterestTotal + closedInterestTotal)}</td></tr></tfoot>
              </table>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-0 xl:grid-cols-2">{renderCollectionTable("អតិថិជនដែលប្រមូលសរុប", dueRows, setDueRows)}{renderCollectionTable("អតិថិជនដែលប្រមូលបានសរុប", paidRows, setPaidRows, redHeader)}</div>
                <div className="space-y-8 border-t-4 border-double border-slate-900 pt-6"><section><h3 className="font-khmer-muol-light border border-slate-300 px-3 py-2 text-sm font-bold text-emerald-700">អតិថិជនដែលដោះស្រាយសរុប</h3>{renderResolutionTable("ជូនដំណឹងទៅអតិថិជន ដល់ថ្ងៃកំណត់ត្រូវបង់", dueNoticeRows, setDueNoticeRows, { interest: resolutionTotal(dueNoticeRows, "interest"), penalty: resolutionTotal(dueNoticeRows, "penalty"), principal: resolutionTotal(dueNoticeRows, "principal") })}</section>{renderResolutionTable("បានបន្តទាក់ទងអតិថិជនដែលយឺតចាប់ពី ១ថ្ងៃ ដល់ ៣ថ្ងៃ", promiseRows, setPromiseRows, { interest: promiseInterestTotal, penalty: promisePenaltyTotal, principal: promisePrincipalTotal })}{renderResolutionTable("ផ្ញើលិខិតជូនដំណឹងផ្លូវការសម្រាប់អតិថិជនយឺតចាប់ពី ៤ថ្ងៃ", closedRows, setClosedRows, { interest: closedInterestTotal, penalty: closedPenaltyTotal, principal: closedPrincipalTotal }, true)}</div>
              </>
            )}
          </div>
        </div>
        </fieldset>
      </Card>
      </div>
      {reportPanel === "records" ? <AccountReportRecordsDashboard records={savedReports} loading={reportsLoading} currentUsername={user.username} language={language} deletingReportId={deletingReportId} canManageReports={["admin", "system administrator", "manager / approver", "branch manager", "bm", "credit manager", "credit / approver"].includes(user.role.trim().toLocaleLowerCase()) || ["branch manager", "bm", "credit manager"].includes((user.position || "").trim().toLocaleLowerCase())} canDeleteReports={["admin", "system administrator"].includes(user.role.trim().toLocaleLowerCase())} onCreate={startNewAccountReport} onOpen={openSavedAccountReport} onDelete={deleteAccountReport} /> : null}
      <datalist id="account-report-reasons">{ACCOUNT_REPORT_COLLECTION_REASONS.map((reason) => <option key={reason} value={reason} />)}</datalist>
      <datalist id="account-report-asset-types">{selectableAssetTypes.map((type) => <option key={type} value={type} />)}</datalist>
      {ACCOUNT_REPORT_REUSABLE_FIELDS.map((field) => <datalist key={field} id={`account-report-${field}-options`}>{reusableAccountValues(field).map((value) => <option key={value} value={value} />)}</datalist>)}
    </div>
  );
}

function AccountReportRecordsDashboard({ records, loading, currentUsername, language, deletingReportId, canManageReports, canDeleteReports, onCreate, onOpen, onDelete }: { records: AccountReportRecord[]; loading: boolean; currentUsername: string; language: Language; deletingReportId: string | null; canManageReports: boolean; canDeleteReports: boolean; onCreate: () => void; onOpen: (record: AccountReportRecord, sheet: AccountReportSheet, readOnly?: boolean) => void; onDelete: (record: AccountReportRecord) => void }) {
  const text = (km: string, en: string) => language === "km" ? km : en;
  const { success: toastSuccess, error: toastError } = useToast();
  const [query, setQuery] = useState("");
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [reportPeriod, setReportPeriod] = useState<"all" | "daily" | "monthly" | "yearly">("all");
  const [periodValue, setPeriodValue] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reporter, setReporter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [positionFilter, setPositionFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | OperationReportStatus>("");
  const [exportingHistory, setExportingHistory] = useState(false);
  const reporterOptions = useMemo(() => Array.from(new Map(records.map((record) => [record.reporterUsername, record.reporterName || record.reporterUsername])).entries()).sort((left, right) => left[1].localeCompare(right[1])), [records]);
  const branchOptions = useMemo(() => Array.from(new Set(records.map((record) => record.branch).filter(Boolean))).sort(), [records]);
  const departmentOptions = useMemo(() => Array.from(new Set(records.map((record) => record.department).filter(Boolean))).sort(), [records]);
  const positionOptions = useMemo(() => Array.from(new Set(records.map((record) => record.reporterPosition).filter(Boolean))).sort(), [records]);
  const yearOptions = useMemo(() => Array.from(new Set([operationDateInputValue().slice(0, 4), ...records.map((record) => record.reportDate.slice(0, 4))])).sort().reverse(), [records]);
  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return records.filter((record) => {
      const matchesSearch = !normalizedQuery || [record.reportDate, record.reporterUsername, record.reporterName, record.reporterPosition, record.branch, record.department, record.status].some((value) => value.toLocaleLowerCase().includes(normalizedQuery));
      const matchesPeriod = reportPeriod === "all" || !periodValue
        || (reportPeriod === "daily" && record.reportDate === periodValue)
        || (reportPeriod === "monthly" && record.reportDate.startsWith(`${periodValue}-`))
        || (reportPeriod === "yearly" && record.reportDate.startsWith(`${periodValue}-`));
      return matchesSearch
        && matchesPeriod
        && (!fromDate || record.reportDate >= fromDate)
        && (!toDate || record.reportDate <= toDate)
        && (!reporter || record.reporterUsername === reporter)
        && (!branchFilter || record.branch === branchFilter)
        && (!departmentFilter || record.department === departmentFilter)
        && (!positionFilter || record.reporterPosition === positionFilter)
        && (!statusFilter || record.status === statusFilter);
    });
  }, [branchFilter, departmentFilter, fromDate, periodValue, positionFilter, query, records, reportPeriod, reporter, statusFilter, toDate]);
  const advancedFilterCount = [reportPeriod !== "all" ? reportPeriod : "", fromDate, toDate, reporter, branchFilter, departmentFilter, positionFilter, statusFilter].filter(Boolean).length;
  const changeReportPeriod = (period: "all" | "daily" | "monthly" | "yearly") => {
    const today = operationDateInputValue();
    setReportPeriod(period);
    setPeriodValue(period === "daily" ? today : period === "monthly" ? today.slice(0, 7) : period === "yearly" ? today.slice(0, 4) : "");
  };
  const clearAdvancedSearch = () => {
    setReportPeriod("all"); setPeriodValue(""); setFromDate(""); setToDate(""); setReporter(""); setBranchFilter(""); setDepartmentFilter(""); setPositionFilter(""); setStatusFilter("");
  };
  const submitted = filtered.filter((record) => record.status === "submitted").length;
  const returned = filtered.filter((record) => record.status === "returned").length;
  const todayReports = filtered.filter((record) => record.reportDate === operationDateInputValue()).length;
  const rowCount = (record: AccountReportRecord, key: keyof AccountReportSavedData) => (record.data[key] || []).filter((row) => row.customer.trim()).length;
  const periodLabel = reportPeriod === "daily" ? periodValue || "daily"
    : reportPeriod === "monthly" ? periodValue || "monthly"
      : reportPeriod === "yearly" ? periodValue || "yearly"
        : fromDate || toDate ? `${fromDate || "start"}-to-${toDate || "end"}` : "all-reports";
  const exportHistory = async () => {
    if (!filtered.length) { toastError(text("មិនមានរបាយការណ៍សម្រាប់នាំចេញទេ។", "There are no matching reports to export.")); return; }
    setExportingHistory(true);
    try {
      const { exportAccountReportHistoryExcel } = await import("@/systems/loan/utils/exportReportHistoryExcel");
      await exportAccountReportHistoryExcel(filtered, periodLabel);
      toastSuccess(text("បាននាំចេញរបាយការណ៍គណនេយ្យទៅ Excel។", "Account Reports exported to Excel."));
    } catch (caught) {
      toastError(caught instanceof Error ? caught.message : "Could not export Account Reports");
    } finally {
      setExportingHistory(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 print:hidden">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-emerald-700">{text("លំហូរ៖ ព្រាង → ដាក់ស្នើទៅ BM → ពិនិត្យ → អនុម័ត ឬបញ្ជូនត្រឡប់", "Flow: Draft → Submit to BM → Review → Approve or Return")}</p><h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{text("កំណត់ត្រារបាយការណ៍គណនេយ្យប្រចាំថ្ងៃ / ខែ / ឆ្នាំ", "Daily / Monthly / Yearly Account Report Records")}</h2></div><button type="button" onClick={onCreate} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700"><FilePlus2 className="h-4 w-4" />{text("របាយការណ៍ថ្មី", "New Report")}</button></div>
      <div className="grid border-b border-slate-200 sm:grid-cols-2 xl:grid-cols-4 dark:border-slate-800">{[[text("កំណត់ត្រាសរុប", "Total Records"), filtered.length], [text("រង់ចាំ BM", "Awaiting BM"), submitted], [text("បានបញ្ជូនត្រឡប់", "Returned"), returned], [text("បានរាយការណ៍ថ្ងៃនេះ", "Reported Today"), todayReports]].map(([label, value]) => <div key={label} className="border-b border-slate-200 px-5 py-4 last:border-b-0 sm:border-r xl:border-b-0 dark:border-slate-800"><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{value}</p></div>)}</div>
      <div className="border-b border-slate-200 dark:border-slate-800">
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"><div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={text("ស្វែងរកថ្ងៃ អ្នករាយការណ៍ មុខតំណែង សាខា នាយកដ្ឋាន ឬស្ថានភាព", "Search date, reporter, position, branch, department, or status")} className={`${inputClass} pl-10`} /></div><button type="button" disabled={exportingHistory || !filtered.length} onClick={() => void exportHistory()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">{exportingHistory ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}{text("នាំចេញ Excel", "Export Excel")}</button><button type="button" aria-expanded={showAdvancedSearch} onClick={() => setShowAdvancedSearch((current) => !current)} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition ${showAdvancedSearch || advancedFilterCount ? "border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"}`}><Filter className="h-4 w-4" />{text("ស្វែងរកកម្រិតខ្ពស់", "Advanced Search")}{advancedFilterCount ? <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-700 px-1.5 text-xs text-white">{advancedFilterCount}</span> : null}<ChevronDown className={`h-4 w-4 transition ${showAdvancedSearch ? "rotate-180" : ""}`} /></button></div>
        {showAdvancedSearch ? <div className="grid gap-3 border-t border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/40 sm:grid-cols-2 lg:grid-cols-4">
          <Field label={text("ប្រភេទរយៈពេល", "Report Period")}><select value={reportPeriod} onChange={(event) => changeReportPeriod(event.target.value as "all" | "daily" | "monthly" | "yearly")} className={inputClass}><option value="all">{text("របាយការណ៍ទាំងអស់", "All Reports")}</option><option value="daily">{text("របាយការណ៍ប្រចាំថ្ងៃ", "Daily Report")}</option><option value="monthly">{text("របាយការណ៍ប្រចាំខែ", "Monthly Report")}</option><option value="yearly">{text("របាយការណ៍ប្រចាំឆ្នាំ", "Yearly Report")}</option></select></Field>
          {reportPeriod === "daily" ? <Field label={text("ជ្រើសរើសថ្ងៃ", "Select Day")}><DateInput title={text("ជ្រើសរើសថ្ងៃ", "Select Day")} value={periodValue} onChange={setPeriodValue} className={inputClass} /></Field> : null}
          {reportPeriod === "monthly" ? <Field label={text("ជ្រើសរើសខែ", "Select Month")}><DateInput type="month" title={text("ជ្រើសរើសខែ", "Select Month")} value={periodValue} onChange={setPeriodValue} className={inputClass} /></Field> : null}
          {reportPeriod === "yearly" ? <Field label={text("ជ្រើសរើសឆ្នាំ", "Select Year")}><select value={periodValue} onChange={(event) => setPeriodValue(event.target.value)} className={inputClass}>{yearOptions.map((year) => <option key={year} value={year}>{year}</option>)}</select></Field> : null}
          <Field label={text("ចាប់ពីថ្ងៃ", "From Date")}><DateInput title={text("ចាប់ពីថ្ងៃ", "From Date")} value={fromDate} max={toDate || undefined} onChange={setFromDate} className={inputClass} /></Field><Field label={text("ដល់ថ្ងៃ", "To Date")}><DateInput title={text("ដល់ថ្ងៃ", "To Date")} value={toDate} min={fromDate || undefined} onChange={setToDate} className={inputClass} /></Field>
          <Field label={text("អ្នករាយការណ៍", "Reporter")}><select value={reporter} onChange={(event) => setReporter(event.target.value)} className={inputClass}><option value="">{text("អ្នករាយការណ៍ទាំងអស់", "All Reporters")}</option>{reporterOptions.map(([username, name]) => <option key={username} value={username}>{name}{name !== username ? ` (${username})` : ""}</option>)}</select></Field>
          <Field label={text("ស្ថានភាព", "Status")}><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "" | OperationReportStatus)} className={inputClass}><option value="">{text("ស្ថានភាពទាំងអស់", "All Statuses")}</option>{(["draft", "submitted", "reviewed", "approved", "returned"] as OperationReportStatus[]).map((status) => <option key={status} value={status}>{operationReportStatusLabel(status, language)}</option>)}</select></Field>
          <Field label={text("សាខា", "Branch")}><select value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)} className={inputClass}><option value="">{text("សាខាទាំងអស់", "All Branches")}</option>{branchOptions.map((value) => <option key={value} value={value}>{value}</option>)}</select></Field><Field label={text("នាយកដ្ឋាន", "Department")}><select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)} className={inputClass}><option value="">{text("នាយកដ្ឋានទាំងអស់", "All Departments")}</option>{departmentOptions.map((value) => <option key={value} value={value}>{value}</option>)}</select></Field><Field label={text("មុខតំណែង", "Position")}><select value={positionFilter} onChange={(event) => setPositionFilter(event.target.value)} className={inputClass}><option value="">{text("មុខតំណែងទាំងអស់", "All Positions")}</option>{positionOptions.map((value) => <option key={value} value={value}>{value}</option>)}</select></Field>
          <div className="flex items-end justify-between gap-3"><p className="pb-3 text-sm text-slate-500"><strong className="text-slate-900 dark:text-white">{filtered.length}</strong> {text(`ក្នុងចំណោម ${records.length} កំណត់ត្រា`, `of ${records.length} records`)}</p><button type="button" disabled={!advancedFilterCount} onClick={clearAdvancedSearch} className="mb-0.5 inline-flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800"><X className="h-4 w-4" />{text("សម្អាត", "Clear")}</button></div>
        </div> : null}
      </div>
      <div className="max-h-96 overflow-x-auto overflow-y-auto"><table className="min-w-[1180px] w-full text-left text-sm"><thead className="sticky top-0 z-10 bg-slate-100 text-slate-600 dark:bg-slate-950 dark:text-slate-300"><tr><th className="px-4 py-3">{text("ថ្ងៃ", "Date")}</th><th className="px-4 py-3">{text("អ្នករាយការណ៍", "Reporter")}</th><th className="px-4 py-3">{text("សាខា", "Branch")}</th><th className="px-4 py-3 text-center">{text("ត្រូវបង់", "Due")}</th><th className="px-4 py-3 text-center">{text("បានបង់", "Paid")}</th><th className="px-4 py-3">{text("ស្ថានភាព", "Status")}</th><th className="px-4 py-3 text-right">{text("គ្រប់គ្រង", "Manage")}</th></tr></thead><tbody>{loading ? <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />{text("កំពុងផ្ទុកកំណត់ត្រា...", "Loading records...")}</td></tr> : filtered.length ? filtered.map((record) => { const ownsRecord = record.reporterUsername.trim().toLocaleLowerCase() === currentUsername.trim().toLocaleLowerCase(); const editable = ownsRecord && ["draft", "returned"].includes(record.status); const deletable = canDeleteReports; return <tr key={record.id} className="border-t border-slate-200 dark:border-slate-800"><td className="whitespace-nowrap px-4 py-3 font-semibold">{record.reportDate}</td><td className="px-4 py-3"><p className="font-semibold text-slate-900 dark:text-white">{record.reporterName || record.reporterUsername}</p><p className="text-xs text-slate-500">{record.reporterPosition}</p></td><td className="px-4 py-3">{record.branch || "-"}</td><td className="px-4 py-3 text-center font-semibold">{rowCount(record, "dueRows")}</td><td className="px-4 py-3 text-center font-semibold">{rowCount(record, "paidRows")}</td><td className="px-4 py-3"><span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${operationReportStatusClass(record.status)}`}>{operationReportStatusLabel(record.status, language)}</span></td><td className="px-4 py-3"><div className="flex flex-nowrap justify-end gap-2"><button type="button" onClick={() => onOpen(record, "summary", true)} className="inline-flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"><Eye className="h-3.5 w-3.5" />{text("មើល", "View")}</button><button type="button" disabled={!editable} onClick={() => onOpen(record, "summary", false)} className="inline-flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40"><Pencil className="h-3.5 w-3.5" />{text("កែ", "Edit")}</button><button type="button" disabled={!editable} onClick={() => onOpen(record, "collection", false)} className="inline-flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-40"><RefreshCw className="h-3.5 w-3.5" />{text("ធ្វើបច្ចុប្បន្នភាព", "Update")}</button><button type="button" disabled={!deletable || deletingReportId === record.id} onClick={() => onDelete(record)} className="inline-flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40">{deletingReportId === record.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}{text("លុប", "Delete")}</button></div></td></tr>; }) : <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">{text("រកមិនឃើញរបាយការណ៍ដែលបានរក្សាទុក", "No saved Account Reports found.")}</td></tr>}</tbody></table></div>
    </section>
  );
}

function AccountingDirectory({ onOpenJournalItems }: { onOpenJournalItems: (account: JournalViewAccount) => void }) {
  const { error: toastError, info: toastInfo } = useToast();
  const user = useAuthUser();
  const searchParams = useSearchParams();
  const normalizedRole = user.role.trim().toLocaleLowerCase();
  const normalizedPosition = (user.position || "").trim().toLocaleLowerCase();
  const canViewAccountReport = ["admin", "system administrator", "manager / approver", "branch manager", "bm", "credit manager", "credit / approver", "executive viewer", "finance", "accountant", "assistant accountant"].includes(normalizedRole)
    || normalizedPosition.includes("accountant")
    || normalizedPosition.includes("finance");
  const [accounts, setAccounts] = useState<LoanBankingAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const accountModeStorageKey = `emeraldcash.accounting.mode.${user.username}`;
  const [mode, setMode] = useState<AccountReportMode>(searchParams.get("accountMode") === "accountReport" && canViewAccountReport ? "accountReport" : "banking");

  const selectMode = (nextMode: AccountReportMode) => {
    setMode(nextMode);
    try { window.localStorage.setItem(accountModeStorageKey, nextMode); } catch { /* Browser storage may be unavailable. */ }
  };

  useEffect(() => {
    if (searchParams.get("accountMode") === "accountReport" && canViewAccountReport) {
      setMode("accountReport");
      return;
    }
    try { setMode(window.localStorage.getItem(accountModeStorageKey) === "accountReport" ? "accountReport" : "banking"); } catch { /* Browser storage may be unavailable. */ }
  }, [accountModeStorageKey, canViewAccountReport, searchParams]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api<LoanBankingAccount[]>("/api/loan/banking")
      .then((data) => { if (active) setAccounts(data); })
      .catch((caught) => { if (active) toastError(caught instanceof Error ? caught.message : "Could not load accounting"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [toastError]);

  const visibleAccounts = useMemo(() => {
    const search = query.trim().toLowerCase();
    return search ? accounts.filter((account) => `${account.code} ${account.name} ${account.currency}`.toLowerCase().includes(search)) : accounts;
  }, [accounts, query]);

  const money = (account: LoanBankingAccount, amount: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: account.currency || "USD", maximumFractionDigits: 2 }).format(amount);

  return (
    <Card className={mode === "accountReport" ? "overflow-visible p-0" : "overflow-hidden p-0"}>
      <div className="border-b border-slate-200 px-5 py-5 dark:border-slate-800 sm:px-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Loan management / Accounting</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{mode === "banking" ? "Banking" : "Account Report"}</h1>
          </div>
          {mode === "banking" ? <div className="flex w-full items-center gap-3 lg:max-w-3xl"><button type="button" onClick={() => toastInfo("Banking bookmarks are ready for saved filters.")} className="inline-flex shrink-0 items-center gap-2 rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"><CalendarDays className="h-4 w-4" /> Bookmarks <ChevronDown className="h-4 w-4" /></button><div className="relative min-w-0 flex-1 rounded-full border border-slate-300 bg-white transition focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900"><Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input aria-label="Search banking accounts" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Type to search" className="w-full rounded-full border-0 bg-transparent py-2.5 pl-11 pr-4 text-sm text-slate-900 !outline-none focus-visible:!outline-none dark:text-white" /></div></div> : null}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-900">
            <button type="button" onClick={() => selectMode("banking")} className={`rounded-lg px-3 py-2 text-sm font-semibold ${mode === "banking" ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-800"}`}>Banking</button>
            {canViewAccountReport ? <button type="button" onClick={() => selectMode("accountReport")} className={`rounded-lg px-3 py-2 text-sm font-semibold ${mode === "accountReport" ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-800"}`}>Account Report</button> : null}
          </div>
          {mode === "banking" ? <><span className="ml-auto text-sm font-semibold text-slate-600 dark:text-slate-300">{visibleAccounts.length ? `1-${visibleAccounts.length}` : "0-0"}</span><span className="text-slate-300">|</span><span className="text-sm font-semibold text-slate-600 dark:text-slate-300">{accounts.length}</span><button type="button" disabled className="rounded-full bg-slate-100 p-2.5 text-slate-400 disabled:opacity-60 dark:bg-slate-800"><ChevronDown className="h-4 w-4 rotate-90" /></button><button type="button" disabled className="rounded-full bg-slate-100 p-2.5 text-slate-400 disabled:opacity-60 dark:bg-slate-800"><ChevronDown className="h-4 w-4 -rotate-90" /></button><span className="flex-1" /><button type="button" onClick={() => toastInfo("Use the search field to filter banking accounts.")} className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"><Search className="h-4 w-4" /> Filters <ChevronDown className="h-4 w-4" /></button><button type="button" onClick={() => toastInfo("Accounts are grouped as Bank and Cash.")} className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"><List className="h-4 w-4" /> Group By <ChevronDown className="h-4 w-4" /></button></> : null}
        </div>
      </div>
      <div className="bg-slate-50/70 p-5 dark:bg-slate-950 sm:p-6">
        {mode === "accountReport" ? <AccountReportView /> : null}
        {mode === "banking" && loading ? <div className="flex min-h-52 items-center justify-center text-sm text-slate-500"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading banking…</div> : null}
        {mode === "banking" && !loading && visibleAccounts.length ? <div className="grid gap-5 xl:grid-cols-2">{visibleAccounts.map((account) => <div key={account.id} className="min-h-80 rounded-xl border border-slate-200 bg-white p-7 shadow-sm dark:border-slate-700 dark:bg-slate-900"><h2 className="text-xl font-bold text-slate-900 dark:text-white">{account.name}</h2><div className="mt-8 grid grid-cols-2 gap-x-8 gap-y-7"><button type="button" onClick={() => onOpenJournalItems(account)} className="text-left"><span className="block text-sm font-medium text-slate-500">Balance</span><span className="mt-1 flex items-center gap-2 text-base font-semibold text-slate-700 dark:text-slate-200">{money(account, account.balance)} <ArrowRight className="h-4 w-4 text-emerald-600" /></span></button><button type="button" onClick={() => onOpenJournalItems(account)} className="text-left"><span className="block text-sm font-medium text-slate-500">Reconciled</span><span className="mt-1 flex items-center gap-2 text-base font-semibold text-slate-700 dark:text-slate-200">{money(account, account.reconciled)} <ArrowRight className="h-4 w-4 text-emerald-600" /></span></button><button type="button" onClick={() => toastInfo("Record a repayment from the active loan to receive money.")} className="inline-flex items-center gap-2 text-sm font-bold text-emerald-700 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200"><HandCoins className="h-5 w-5" /> Receive Money</button><button type="button" onClick={() => toastInfo("Approve and disburse a loan to send money.")} className="inline-flex items-center gap-2 text-sm font-bold text-emerald-700 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200"><CreditCard className="h-5 w-5" /> Send Money</button><button type="button" onClick={() => toastInfo("Statement import will be connected to bank reconciliation.")} className="col-span-2 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200"><Upload className="h-5 w-5" /> Import Statement</button></div></div>)}</div> : null}
        {mode === "banking" && !loading && visibleAccounts.length === 0 ? <div className="py-16 text-center"><CreditCard className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 font-semibold text-slate-700 dark:text-slate-200">No banking accounts found</p><p className="mt-1 text-sm text-slate-500">Clear the search or configure a Bank and Cash account.</p></div> : null}
      </div>
    </Card>
  );
}

type OperationReportImage = { imageUrl: string; imageName?: string };
type OperationReportAttachment = {
  images?: OperationReportImage[];
  // Keep legacy fields so previously saved reports continue to display their photo.
  imageUrl?: string;
  imageName?: string;
};
type OperationReportCollectionRow = OperationReportAttachment & { id: number; customer: string; amount: string; reason: string };
type OperationReportResolutionRow = OperationReportAttachment & { id: number; customer: string; assetType: string; interest: string; penalty: string; principal: string; solution: string };
type OperationReportLoanDecisionRow = OperationReportAttachment & { id: number; customer: string; type: string; amount: string; reason: string };
type OperationReportForm = "summary" | "collection" | "decisions";
type OperationReportStatus = "draft" | "submitted" | "reviewed" | "approved" | "returned";
type OperationReportSavedData = {
  collectionDueRows: OperationReportCollectionRow[];
  collectionPaidRows: OperationReportCollectionRow[];
  dueNoticeRows: OperationReportResolutionRow[];
  followUpRows: OperationReportResolutionRow[];
  formalNoticeRows: OperationReportResolutionRow[];
  requestedRows: OperationReportLoanDecisionRow[];
  approvedRows: OperationReportLoanDecisionRow[];
  rejectedRows: OperationReportLoanDecisionRow[];
  sourceReportIds?: string[];
  sourceAccountReportIds?: string[];
};
type OperationReportRecord = {
  id: string;
  reportDate: string;
  reporterUsername: string;
  reportType: "ls" | "bm";
  reporterName: string;
  reporterPosition: string;
  department: string;
  branch: string;
  status: OperationReportStatus;
  data: Partial<OperationReportSavedData>;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewComment: string;
  createdAt: string;
  updatedAt: string;
};
type OperationReportLocalDraft = OperationReportSavedData & {
  reportDate: string;
  branch: string;
  reporterName: string;
  reporterRole: string;
  department: string;
  activeForm: OperationReportForm;
  reportMode: "operation" | "branchManager";
  loadedReporterUsername: string;
  loadedReportStatus: OperationReportStatus;
  reviewComment: string;
};

const OPERATION_COLLECTION_REASONS = ["យឺត ៣ថ្ងៃ", "យឺត ៤ថ្ងៃ", "យឺត ៧ថ្ងៃ", "យឺត ៨ថ្ងៃ", "យឺត ១៥ថ្ងៃ", "ប្រភពចំណូលមិនច្បាស់លាស់", "កូនមិនទទួលជួយបង់ជំនួស", "បញ្ហាសុខភាពឈឺចូលពេទ្យ"];
const OPERATION_RESOLUTION_OPTIONS = ["បានបង់ផ្តាច់", "បង់តែការប្រាក់", "សុំពន្យារពេល", "សន្យាបង់", "ត្រូវតាមដានបន្ត"];
const OPERATION_REJECTION_REASONS = ["ឯកសារមិនគ្រប់គ្រាន់", "ចំណូលមិនគ្រប់គ្រាន់", "ប្រវត្តិឥណទានមិនល្អ", "ទ្រព្យធានាមិនគ្រប់គ្រាន់", "មិនបំពេញតាមលក្ខខណ្ឌឥណទាន"];
const OPERATION_REPORT_REUSABLE_FIELDS = ["branch", "reporterName", "reporterRole", "department", "customer", "amount", "reason", "assetType", "interest", "penalty", "principal", "solution", "type"] as const;
const OPERATION_REPORT_DEFAULT_ROWS = 5;

function createOperationCollectionRows() {
  return Array.from({ length: OPERATION_REPORT_DEFAULT_ROWS }, (_, index) => ({ id: index + 1, customer: "", amount: "", reason: "" }));
}

function createOperationResolutionRows() {
  return Array.from({ length: OPERATION_REPORT_DEFAULT_ROWS }, (_, index) => ({ id: index + 1, customer: "", assetType: "", interest: "", penalty: "", principal: "", solution: "" }));
}

function operationNumber(value: string) {
  return Number(value.replace(/[^\d.-]/g, "")) || 0;
}

function operationCurrency(value: string | number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(typeof value === "number" ? value : operationNumber(value));
}

function operationDateInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function operationReportStatusLabel(status: OperationReportStatus, language: Language) {
  const labels = language === "km"
    ? ({ draft: "ព្រាង", submitted: "បានដាក់ស្នើ", reviewed: "បានពិនិត្យ", approved: "បានអនុម័ត", returned: "បានបញ្ជូនត្រឡប់" } as const)
    : ({ draft: "Draft", submitted: "Submitted", reviewed: "Reviewed", approved: "Approved", returned: "Returned" } as const);
  return labels[status];
}

function operationReportStatusClass(status: OperationReportStatus) {
  if (status === "approved") return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300";
  if (status === "reviewed") return "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300";
  if (status === "submitted") return "bg-cyan-100 text-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-300";
  if (status === "returned") return "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300";
  return "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300";
}

function appendOperationRowOnEnter<T extends { id: number }>(
  event: ReactKeyboardEvent<HTMLInputElement>,
  rowIndex: number,
  rows: T[],
  onChange: (rows: T[]) => void,
  createRow: (id: number) => T,
  field: string
) {
  if (event.key !== "Enter") return;
  event.preventDefault();
  const table = event.currentTarget.closest("table");
  if (rowIndex < rows.length - 1) {
    requestAnimationFrame(() => {
      table?.querySelector<HTMLInputElement>(`[data-operation-row="${rowIndex + 1}"][data-operation-field="${field}"]`)?.focus();
    });
    return;
  }
  const nextId = Math.max(0, ...rows.map((row) => row.id)) + 1;
  onChange([...rows, createRow(nextId)]);
  requestAnimationFrame(() => {
    table?.querySelector<HTMLInputElement>(`[data-operation-row="${rowIndex + 1}"][data-operation-field="${field}"]`)?.focus();
  });
}

function OperationReportView({ loans, loading, canViewLoanData, onRefresh, onOpenLoan }: { loans: LoanEntity[]; loading: boolean; canViewLoanData: boolean; onRefresh: () => void; onOpenLoan: (loan: LoanEntity) => void }) {
  const { success: toastSuccess, error: toastError } = useToast();
  const { language } = useLanguage();
  const opText = (km: string, en: string) => language === "km" ? km : en;
  const user = useAuthUser();
  const searchParams = useSearchParams();
  const [reportPanel, setReportPanel] = useState<"records" | "form">("records");
  const [viewOnly, setViewOnly] = useState(false);
  const [reportDate, setReportDate] = useState(operationDateInputValue());
  const [branch, setBranch] = useState(user.branch || "Boeung Keng Kang");
  const [reporterName, setReporterName] = useState(user.full_name || user.username || "");
  const [reporterRole, setReporterRole] = useState(user.position || user.role || "Loan Specialist");
  const [department, setDepartment] = useState(user.department || "Loan Operations");
  const [activeForm, setActiveForm] = useState<OperationReportForm>("summary");
  const [exporting, setExporting] = useState(false);
  const [collectionDueRows, setCollectionDueRows] = useState<OperationReportCollectionRow[]>(createOperationCollectionRows);
  const [collectionPaidRows, setCollectionPaidRows] = useState<OperationReportCollectionRow[]>(createOperationCollectionRows);
  const [dueNoticeRows, setDueNoticeRows] = useState<OperationReportResolutionRow[]>(createOperationResolutionRows);
  const [followUpRows, setFollowUpRows] = useState<OperationReportResolutionRow[]>(createOperationResolutionRows);
  const [formalNoticeRows, setFormalNoticeRows] = useState<OperationReportResolutionRow[]>(createOperationResolutionRows);
  const [requestedRows, setRequestedRows] = useState<OperationReportLoanDecisionRow[]>([
    { id: 1, customer: "", type: "", amount: "", reason: "" },
    { id: 2, customer: "", type: "", amount: "", reason: "" },
  ]);
  const [approvedRows, setApprovedRows] = useState<OperationReportLoanDecisionRow[]>([
    { id: 1, customer: "", type: "", amount: "", reason: "" },
  ]);
  const [rejectedRows, setRejectedRows] = useState<OperationReportLoanDecisionRow[]>([
    { id: 1, customer: "", type: "", amount: "", reason: "" },
  ]);
  const [savedReports, setSavedReports] = useState<OperationReportRecord[]>([]);
  const [branchManagerReports, setBranchManagerReports] = useState<OperationReportRecord[]>([]);
  const [accountReports, setAccountReports] = useState<AccountReportRecord[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [savingReport, setSavingReport] = useState<"draft" | "submitted" | null>(null);
  const [savingBranchManagerReport, setSavingBranchManagerReport] = useState<"draft" | "submitted" | null>(null);
  const [loadedReporterUsername, setLoadedReporterUsername] = useState(user.username);
  const [loadedReportStatus, setLoadedReportStatus] = useState<OperationReportStatus>("draft");
  const [reviewComment, setReviewComment] = useState("");
  const [reviewCommentError, setReviewCommentError] = useState(false);
  const [reviewingAction, setReviewingAction] = useState<"reviewed" | "approved" | "returned" | null>(null);
  const [deletingReportId, setDeletingReportId] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [rememberedAssetTypes, setRememberedAssetTypes] = useState<string[]>([]);
  const [localDraftHydrated, setLocalDraftHydrated] = useState(false);
  const [savedValuesOpen, setSavedValuesOpen] = useState(false);

  useEffect(() => {
    if (reviewComment.trim()) setReviewCommentError(false);
  }, [reviewComment]);

  const normalizedUserRole = user.role.trim().toLocaleLowerCase();
  const canManageReports = ["admin", "system administrator", "manager / approver", "branch manager", "bm", "credit manager", "credit / approver"].includes(normalizedUserRole)
    || ["branch manager", "bm", "credit manager", "credit / approver"].includes((user.position || "").trim().toLocaleLowerCase());
  const roleDefaultsToBranchManagerReport = ["manager / approver", "branch manager", "bm", "credit manager", "credit / approver"].includes(normalizedUserRole);
  const [reportMode, setReportMode] = useState<"operation" | "branchManager">(roleDefaultsToBranchManagerReport ? "branchManager" : "operation");
  const isBranchManagerReport = reportMode === "branchManager";
  const selectReportMode = (mode: "operation" | "branchManager") => {
    setReportMode(mode);
    if (mode === "branchManager") {
      if (activeForm === "decisions") setActiveForm("summary");
      setLoadedReporterUsername(user.username);
      setReporterName(user.full_name || user.username);
      setReporterRole(user.position || user.role);
      setDepartment(user.department || "Loan Operations");
      setBranch(user.branch || branch);
      setReviewComment("");
    }
  };
  const assignedNames = useMemo(() => new Set([user.username, user.full_name || ""].map((value) => value.trim().toLocaleLowerCase()).filter(Boolean)), [user.full_name, user.username]);
  const visibleLoans = useMemo(() => canManageReports ? loans : loans.filter((loan) => {
    const assigned = (loan.loanContacts.loanSpecialist || loan.loanOfficer || "").trim().toLocaleLowerCase();
    return assignedNames.has(assigned);
  }), [assignedNames, canManageReports, loans]);
  const visibleSavedReports = useMemo(() => canManageReports ? savedReports : savedReports.filter((record) => record.reporterUsername.trim().toLocaleLowerCase() === user.username.trim().toLocaleLowerCase()), [canManageReports, savedReports, user.username]);
  const suggestedCustomers = useMemo(() => Array.from(new Set(visibleLoans.map((loan) => loan.borrower.fullName).filter(Boolean))).slice(0, 40), [visibleLoans]);
  const suggestedLoanTypes = useMemo(() => Array.from(new Set(visibleLoans.map((loan) => loan.loanType).filter(Boolean))).sort(), [visibleLoans]);
  const assetTypeStorageKey = `emeraldcash.operation-report.asset-types.${user.username}`;
  const localDraftStorageKey = `emeraldcash.operation-report.draft.${user.username}`;
  const rememberedFieldsStorageKey = `emeraldcash.operation-report.fields.${user.username}`;
  const { fields: rememberedFields, remember: rememberField, forget: forgetField } = useRememberedReportFields(rememberedFieldsStorageKey);
  const selectableAssetTypes = useMemo(() => Array.from(new Set([
    ...suggestedLoanTypes,
    ...rememberedAssetTypes,
    ...(rememberedFields.assetType || []),
    ...(rememberedFields.type || []),
    ...dueNoticeRows.map((row) => row.assetType),
    ...followUpRows.map((row) => row.assetType),
    ...formalNoticeRows.map((row) => row.assetType),
    ...requestedRows.map((row) => row.type),
    ...approvedRows.map((row) => row.type),
    ...rejectedRows.map((row) => row.type),
  ].map((value) => value.trim()).filter(Boolean))).sort((left, right) => left.localeCompare(right)), [approvedRows, dueNoticeRows, followUpRows, formalNoticeRows, rejectedRows, rememberedAssetTypes, rememberedFields.assetType, rememberedFields.type, requestedRows, suggestedLoanTypes]);
  const myDueLoans = useMemo(() => visibleLoans.filter((loan) => {
    if (!loan.nextPaymentDate || loan.nextPaymentDate.slice(0, 10) > reportDate || ["Closed", "Rejected"].includes(loan.repaymentStatus)) return false;
    return true;
  }).sort((a, b) => String(a.nextPaymentDate).localeCompare(String(b.nextPaymentDate))), [reportDate, visibleLoans]);
  const myReportForDate = visibleSavedReports.find((record) => record.reporterUsername === user.username && record.reportDate === reportDate);
  const loadedReportRecord = visibleSavedReports.find((record) => record.reporterUsername === loadedReporterUsername && record.reportDate === reportDate);

  const countRows = (rows: Array<{ customer: string }>) => rows.filter((row) => row.customer.trim()).length;
  const sumRows = <T extends { amount?: string; interest?: string; penalty?: string; principal?: string }>(rows: T[], key: keyof T) => rows.reduce((total, row) => total + operationNumber(String(row[key] || "")), 0);
  const dueCustomerCount = countRows(collectionDueRows);
  const paidCustomerCount = countRows(collectionPaidRows);
  const collectionRate = dueCustomerCount ? Math.round((paidCustomerCount / dueCustomerCount) * 100) : 0;
  const branchManagerRecords = useMemo(() => visibleSavedReports.filter((record) => record.reportDate === reportDate && (!branch.trim() || normalizeReportBranchLabel(record.branch) === normalizeReportBranchLabel(branch)) && ["submitted", "reviewed", "approved"].includes(record.status)), [branch, reportDate, visibleSavedReports]);
  const branchManagerMonthRecords = useMemo(() => visibleSavedReports.filter((record) => record.reportDate.startsWith(reportDate.slice(0, 7)) && (!branch.trim() || normalizeReportBranchLabel(record.branch) === normalizeReportBranchLabel(branch)) && ["submitted", "reviewed", "approved"].includes(record.status)), [branch, reportDate, visibleSavedReports]);
  const branchManagerYearRecords = useMemo(() => visibleSavedReports.filter((record) => record.reportDate.startsWith(reportDate.slice(0, 4)) && (!branch.trim() || normalizeReportBranchLabel(record.branch) === normalizeReportBranchLabel(branch)) && ["submitted", "reviewed", "approved"].includes(record.status)), [branch, reportDate, visibleSavedReports]);
  const branchAccountRecords = useMemo(() => accountReports.filter((record) => record.reportDate === reportDate && (!branch.trim() || normalizeReportBranchLabel(record.branch) === normalizeReportBranchLabel(branch)) && ["submitted", "reviewed", "approved"].includes(record.status)), [accountReports, branch, reportDate]);
  const branchAccountReportHistory = useMemo(() => accountReports.filter((record) => !branch.trim() || normalizeReportBranchLabel(record.branch) === normalizeReportBranchLabel(branch)), [accountReports, branch]);
  const branchAccountMonthRecords = useMemo(() => accountReports.filter((record) => record.reportDate.startsWith(reportDate.slice(0, 7)) && (!branch.trim() || normalizeReportBranchLabel(record.branch) === normalizeReportBranchLabel(branch)) && ["submitted", "reviewed", "approved"].includes(record.status)), [accountReports, branch, reportDate]);
  const branchAccountYearRecords = useMemo(() => accountReports.filter((record) => record.reportDate.startsWith(reportDate.slice(0, 4)) && (!branch.trim() || normalizeReportBranchLabel(record.branch) === normalizeReportBranchLabel(branch)) && ["submitted", "reviewed", "approved"].includes(record.status)), [accountReports, branch, reportDate]);
  const branchLoanSpecialistRecords = useMemo(() => visibleSavedReports.filter((record) => !branch.trim() || normalizeReportBranchLabel(record.branch) === normalizeReportBranchLabel(branch)), [branch, visibleSavedReports]);
  const ownBranchManagerReport = branchManagerReports.find((record) => record.reporterUsername === user.username && record.reportDate === reportDate && normalizeReportBranchLabel(record.branch) === normalizeReportBranchLabel(branch));
  const branchManagerReportStatus: OperationReportStatus = ownBranchManagerReport?.status || "draft";
  const branchManagerReportLocked = ["submitted", "reviewed", "approved"].includes(branchManagerReportStatus);
  const branchManagerLoans = useMemo(() => loans.filter((loan) => {
    const matchesBranch = !branch.trim() || normalizeReportBranchLabel(String(loan.branchLocation || "")) === normalizeReportBranchLabel(branch);
    return matchesBranch && !["Closed", "Rejected"].includes(loan.repaymentStatus);
  }), [branch, loans]);
  const reviewingAnotherSpecialist = loadedReporterUsername !== user.username;
  const effectiveReportStatus = reviewingAnotherSpecialist ? loadedReportStatus : myReportForDate?.status || loadedReportStatus;
  const reportLocked = !["draft", "returned"].includes(effectiveReportStatus);

  useEffect(() => {
    if (isBranchManagerReport && activeForm === "decisions") setActiveForm("summary");
  }, [activeForm, isBranchManagerReport]);

  const loadSavedReports = useCallback(async (options: { silent?: boolean } = {}) => {
    const silent = Boolean(options.silent);
    if (!silent) setReportsLoading(true);
    try {
      const [records, bmRecords, accountingRecords] = await Promise.all([
        api<OperationReportRecord[]>("/api/loan/operation-reports?limit=500"),
        canManageReports ? api<OperationReportRecord[]>("/api/loan/operation-reports?reportType=bm&limit=500") : Promise.resolve([]),
        canManageReports ? api<AccountReportRecord[]>("/api/loan/account-reports?limit=500") : Promise.resolve([]),
      ]);
      setSavedReports(records);
      setBranchManagerReports(bmRecords);
      setAccountReports(accountingRecords);
    } catch (caught) {
      if (!silent) toastError(caught instanceof Error ? caught.message : opText("មិនអាចផ្ទុករបាយការណ៍ដែលបានរក្សាទុក", "Could not load saved reports"));
    } finally {
      if (!silent) setReportsLoading(false);
    }
  }, [canManageReports, toastError]);

  useEffect(() => { void loadSavedReports(); }, [loadSavedReports]);

  useEffect(() => {
    if (!isBranchManagerReport || !canManageReports) return;
    const refreshSources = () => {
      if (document.visibilityState === "visible") void loadSavedReports({ silent: true });
    };
    const intervalId = window.setInterval(refreshSources, 30_000);
    window.addEventListener("focus", refreshSources);
    document.addEventListener("visibilitychange", refreshSources);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshSources);
      document.removeEventListener("visibilitychange", refreshSources);
    };
  }, [canManageReports, isBranchManagerReport, loadSavedReports]);

  useEffect(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(assetTypeStorageKey) || "[]") as unknown;
      setRememberedAssetTypes(Array.isArray(stored) ? stored.map(String).map((value) => value.trim()).filter(Boolean).slice(0, 100) : []);
    } catch {
      setRememberedAssetTypes([]);
    }
  }, [assetTypeStorageKey]);

  useEffect(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(localDraftStorageKey) || "null") as Partial<OperationReportLocalDraft> | null;
      if (stored) {
        if (typeof stored.reportDate === "string") setReportDate(stored.reportDate);
        if (typeof stored.branch === "string") setBranch(stored.branch);
        if (typeof stored.reporterName === "string") setReporterName(stored.reporterName);
        if (typeof stored.reporterRole === "string") setReporterRole(stored.reporterRole);
        if (typeof stored.department === "string") setDepartment(stored.department);
        if (stored.activeForm && ["summary", "collection", "decisions"].includes(stored.activeForm)) setActiveForm(stored.activeForm);
        if (stored.reportMode === "operation" || stored.reportMode === "branchManager") setReportMode(stored.reportMode);
        if (typeof stored.loadedReporterUsername === "string") setLoadedReporterUsername(stored.loadedReporterUsername);
        if (stored.loadedReportStatus && ["draft", "submitted", "reviewed", "approved", "returned"].includes(stored.loadedReportStatus)) setLoadedReportStatus(stored.loadedReportStatus);
        if (typeof stored.reviewComment === "string") setReviewComment(stored.reviewComment);
        if (Array.isArray(stored.collectionDueRows)) setCollectionDueRows(stored.collectionDueRows);
        if (Array.isArray(stored.collectionPaidRows)) setCollectionPaidRows(stored.collectionPaidRows);
        if (Array.isArray(stored.dueNoticeRows)) setDueNoticeRows(stored.dueNoticeRows);
        if (Array.isArray(stored.followUpRows)) setFollowUpRows(stored.followUpRows);
        if (Array.isArray(stored.formalNoticeRows)) setFormalNoticeRows(stored.formalNoticeRows);
        if (Array.isArray(stored.requestedRows)) setRequestedRows(stored.requestedRows);
        if (Array.isArray(stored.approvedRows)) setApprovedRows(stored.approvedRows);
        if (Array.isArray(stored.rejectedRows)) setRejectedRows(stored.rejectedRows);
      }
    } catch { /* Browser storage may be unavailable or contain an older format. */ }
    setLocalDraftHydrated(true);
  }, [localDraftStorageKey]);

  useEffect(() => {
    if (!localDraftHydrated) return;
    const draft: OperationReportLocalDraft = { reportDate, branch, reporterName, reporterRole, department, activeForm, reportMode, loadedReporterUsername, loadedReportStatus, reviewComment, collectionDueRows, collectionPaidRows, dueNoticeRows, followUpRows, formalNoticeRows, requestedRows, approvedRows, rejectedRows };
    try { window.localStorage.setItem(localDraftStorageKey, JSON.stringify(draft)); } catch { /* Browser storage may be unavailable. */ }
  }, [activeForm, approvedRows, branch, collectionDueRows, collectionPaidRows, department, dueNoticeRows, followUpRows, formalNoticeRows, loadedReportStatus, loadedReporterUsername, localDraftHydrated, localDraftStorageKey, rejectedRows, reportDate, reportMode, reporterName, reporterRole, requestedRows, reviewComment]);

  const rememberAssetType = (value: string) => {
    const normalized = value.trim();
    if (!normalized) return;
    setRememberedAssetTypes((current) => {
      const next = Array.from(new Set([...current, normalized])).sort((left, right) => left.localeCompare(right)).slice(0, 100);
      try { window.localStorage.setItem(assetTypeStorageKey, JSON.stringify(next)); } catch { /* Browser storage may be unavailable. */ }
      return next;
    });
  };

  const currentReportData = (): OperationReportSavedData => ({ collectionDueRows, collectionPaidRows, dueNoticeRows, followUpRows, formalNoticeRows, requestedRows, approvedRows, rejectedRows });

  const validateOperationReport = () => {
    const errors: string[] = [];
    if (!reportDate) errors.push(opText("ត្រូវបញ្ចូលកាលបរិច្ឆេទរបាយការណ៍", "Report date is required."));
    if (!branch.trim()) errors.push(opText("ត្រូវបញ្ចូលសាខា", "Branch is required."));
    if (!reporterName.trim()) errors.push(opText("ត្រូវបញ្ចូលឈ្មោះអ្នករាយការណ៍", "Reporter name is required."));
    if (!reporterRole.trim()) errors.push(opText("ត្រូវបញ្ចូលមុខតំណែង", "Position is required."));
    if (!department.trim()) errors.push(opText("ត្រូវបញ្ចូលនាយកដ្ឋាន", "Department is required."));
    const allRows = [...collectionDueRows, ...collectionPaidRows, ...dueNoticeRows, ...followUpRows, ...formalNoticeRows, ...requestedRows, ...approvedRows, ...rejectedRows];
    if (!allRows.some((row) => row.customer.trim())) errors.push(opText("បន្ថែមសកម្មភាពអតិថិជនយ៉ាងតិចមួយមុនពេលដាក់ស្នើ", "Add at least one customer activity before submitting."));
    if ([...collectionDueRows, ...collectionPaidRows, ...requestedRows, ...approvedRows, ...rejectedRows].some((row) => row.customer.trim() && operationNumber(row.amount) <= 0)) errors.push(opText("ចំនួនទឹកប្រាក់អតិថិជនត្រូវធំជាងសូន្យ", "Every customer amount must be greater than zero."));
    if (rejectedRows.some((row) => row.customer.trim() && !row.reason.trim())) errors.push(opText("ឥណទានដែលបដិសេធត្រូវមានមូលហេតុ", "Rejected loans require a reason."));
    const dueNames = collectionDueRows.map((row) => row.customer.trim().toLocaleLowerCase()).filter(Boolean);
    if (new Set(dueNames).size !== dueNames.length) errors.push(opText("បញ្ជីអតិថិជនត្រូវបង់មានឈ្មោះស្ទួន", "The due-customer list contains duplicate customers."));
    return errors;
  };

  const prepareDailyWork = () => {
    if (!myDueLoans.length) {
      toastError(opText("គ្មានឥណទានដល់ថ្ងៃបង់ ឬហួសកំណត់ដែលបានចាត់តាំងឱ្យអ្នកសម្រាប់ថ្ងៃនេះ", "No due or overdue loans are assigned to you for this date."));
      return;
    }
    const hasEnteredWork = [...collectionDueRows, ...dueNoticeRows, ...followUpRows, ...formalNoticeRows].some((row) => row.customer.trim());
    if (hasEnteredWork && !window.confirm(opText("ជំនួសទិន្នន័យបច្ចុប្បន្នដោយទិន្នន័យឥណទានផ្ទាល់មែនទេ?", "Replace the current rows with live loan data?"))) return;
    const reportTime = new Date(`${reportDate}T00:00:00`).getTime();
    const rowsFor = (items: LoanEntity[]) => {
      const rows = items.map((loan, index): OperationReportResolutionRow => ({ id: index + 1, customer: loan.borrower.fullName, assetType: loan.loanType, interest: "", penalty: "", principal: String(loan.outstandingBalance), solution: "" }));
      return rows.length >= OPERATION_REPORT_DEFAULT_ROWS ? rows : [...rows, ...createOperationResolutionRows().slice(0, OPERATION_REPORT_DEFAULT_ROWS - rows.length).map((row, index) => ({ ...row, id: rows.length + index + 1 }))];
    };
    const dueToday: LoanEntity[] = [];
    const followUp: LoanEntity[] = [];
    const formal: LoanEntity[] = [];
    myDueLoans.forEach((loan) => {
      const dueTime = new Date(`${loan.nextPaymentDate!.slice(0, 10)}T00:00:00`).getTime();
      const overdueDays = Math.max(0, Math.round((reportTime - dueTime) / 86_400_000));
      if (overdueDays === 0) dueToday.push(loan);
      else if (overdueDays <= 3) followUp.push(loan);
      else formal.push(loan);
    });
    const dueRows = myDueLoans.map((loan, index): OperationReportCollectionRow => {
      const dueTime = new Date(`${loan.nextPaymentDate!.slice(0, 10)}T00:00:00`).getTime();
      const overdueDays = Math.max(0, Math.round((reportTime - dueTime) / 86_400_000));
      return { id: index + 1, customer: loan.borrower.fullName, amount: String(loan.paymentAmount), reason: overdueDays ? opText(`ហួសកំណត់ ${overdueDays} ថ្ងៃ`, `${overdueDays} day(s) overdue`) : opText("ដល់ថ្ងៃបង់", "Due today") };
    });
    setCollectionDueRows(dueRows.length >= OPERATION_REPORT_DEFAULT_ROWS ? dueRows : [...dueRows, ...createOperationCollectionRows().slice(0, OPERATION_REPORT_DEFAULT_ROWS - dueRows.length).map((row, index) => ({ ...row, id: dueRows.length + index + 1 }))]);
    setDueNoticeRows(rowsFor(dueToday));
    setFollowUpRows(rowsFor(followUp));
    setFormalNoticeRows(rowsFor(formal));
    setValidationErrors([]);
    toastSuccess(opText(`បានរៀបចំអតិថិជនត្រូវបង់ ${myDueLoans.length} នាក់ពីទិន្នន័យឥណទានផ្ទាល់`, `Prepared ${myDueLoans.length} due customer(s) from live loans.`));
  };

  const saveOperationReport = async (status: "draft" | "submitted") => {
    if (reviewingAnotherSpecialist) {
      toastError(opText("កំណត់ត្រានេះជារបស់អ្នកឯកទេសផ្កល់កម្ចីផ្សេង ហើយអាចពិនិត្យមើលប៉ុណ្ណោះ", "This record belongs to another Loan Specialist and is review-only."));
      return;
    }
    if (reportLocked) {
      toastError(opText("របាយការណ៍នេះត្រូវបានចាក់សោសម្រាប់ពិនិត្យ។ អ្នកគ្រប់គ្រងត្រូវបញ្ជូនត្រឡប់មុនពេលកែប្រែ", "This report is locked for review."));
      return;
    }
    if (status === "submitted") {
      const errors = validateOperationReport();
      setValidationErrors(errors);
      if (errors.length) {
        toastError(opText("សូមកែតម្រូវតម្រូវការដែលបានបង្ហាញមុនពេលដាក់ស្នើ", "Please correct the highlighted requirements before submitting."));
        return;
      }
    }
    setSavingReport(status);
    try {
      const saved = await api<OperationReportRecord>("/api/loan/operation-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportDate, reporterName, reporterPosition: reporterRole, department, branch, status, data: currentReportData() }),
      });
      setLoadedReportStatus(saved.status);
      setValidationErrors([]);
      toastSuccess(status === "submitted" ? opText("បានដាក់ស្នើរបាយការណ៍ប្រចាំថ្ងៃ", "Daily report submitted.") : opText("បានរក្សាទុករបាយការណ៍ព្រាង", "Daily report draft saved."));
      await loadSavedReports();
    } catch (caught) {
      toastError(caught instanceof Error ? caught.message : opText("មិនអាចរក្សាទុករបាយការណ៍ប្រតិបត្តិការ", "Could not save Operation Report"));
    } finally {
      setSavingReport(null);
    }
  };

  const reviewOperationReport = async (action: "reviewed" | "approved" | "returned") => {
    const record = savedReports.find((item) => item.reporterUsername === loadedReporterUsername && item.reportDate === reportDate);
    if (!record || !reviewingAnotherSpecialist || !canManageReports) return;
    if (action === "returned" && !reviewComment.trim()) {
      setReviewCommentError(true);
      toastError(opText("សូមបញ្ចូលមតិកែតម្រូវមុនពេលបញ្ជូនរបាយការណ៍ត្រឡប់", "Add a correction comment before returning this report."));
      return;
    }
    setReviewCommentError(false);
    setReviewingAction(action);
    try {
      const updated = await api<OperationReportRecord>("/api/loan/operation-reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: record.id, action, comment: reviewComment }),
      });
      setLoadedReportStatus(updated.status);
      setReviewComment(updated.reviewComment);
      setReviewCommentError(false);
      toastSuccess(action === "returned" ? opText("បានបញ្ជូនរបាយការណ៍ត្រឡប់ឱ្យកែតម្រូវ", "Report returned for correction.") : opText(`បានកែស្ថានភាពរបាយការណ៍ជា ${operationReportStatusLabel(action, language)}`, `Report marked ${operationReportStatusLabel(action, language).toLocaleLowerCase()}.`));
      await loadSavedReports();
    } catch (caught) {
      toastError(caught instanceof Error ? caught.message : opText("មិនអាចធ្វើបច្ចុប្បន្នភាពការពិនិត្យ", "Could not update report review"));
    } finally {
      setReviewingAction(null);
    }
  };

  const reviewBranchManagerSubmission = async (record: OperationReportRecord, action: "reviewed" | "approved" | "returned") => {
    if (!canManageReports || record.reporterUsername === user.username) return;
    const comment = action === "returned" ? window.prompt(opText("បញ្ចូលមូលហេតុដែលត្រូវកែតម្រូវ", "Enter the correction required"), "")?.trim() || "" : "";
    if (action === "returned" && !comment) return;
    setReviewingAction(action);
    try {
      await api<OperationReportRecord>("/api/loan/operation-reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: record.id, action, comment }),
      });
      toastSuccess(action === "approved" ? opText("បានអនុម័តរបាយការណ៍ BM", "BM Report approved.") : action === "reviewed" ? opText("បានពិនិត្យរបាយការណ៍ BM", "BM Report marked reviewed.") : opText("បានបញ្ជូនរបាយការណ៍ BM ត្រឡប់ឱ្យកែតម្រូវ", "BM Report returned for correction."));
      await loadSavedReports();
    } catch (caught) {
      toastError(caught instanceof Error ? caught.message : opText("មិនអាចធ្វើបច្ចុប្បន្នភាពរបាយការណ៍ BM", "Could not update BM Report"));
    } finally {
      setReviewingAction(null);
    }
  };

  const reviewAccountReport = async (record: AccountReportRecord, action: "reviewed" | "approved" | "returned") => {
    const comment = action === "returned" ? window.prompt(opText("បញ្ចូលមូលហេតុដែលត្រូវកែតម្រូវ", "Enter the correction required"), "")?.trim() || "" : "";
    if (action === "returned" && !comment) return;
    setReviewingAction(action);
    try {
      await api<AccountReportRecord>("/api/loan/account-reports", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: record.id, action, comment }) });
      toastSuccess(action === "reviewed" ? opText("បានពិនិត្យរបាយការណ៍គណនេយ្យ", "Account Report marked reviewed.") : action === "approved" ? opText("បានអនុម័តរបាយការណ៍គណនេយ្យ", "Account Report approved.") : opText("បានបញ្ជូនរបាយការណ៍គណនេយ្យត្រឡប់", "Account Report returned for correction."));
      await loadSavedReports();
    } catch (caught) {
      toastError(caught instanceof Error ? caught.message : opText("មិនអាចធ្វើបច្ចុប្បន្នភាពរបាយការណ៍គណនេយ្យ", "Could not update Account Report"));
    } finally {
      setReviewingAction(null);
    }
  };

  useEffect(() => {
    if (searchParams.get("reportPanel") === "records") {
      setReportPanel("records");
      setActiveForm("summary");
      setViewOnly(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (reportPanel === "records") {
      setActiveForm("summary");
      setViewOnly(false);
    }
  }, [localDraftHydrated, reportPanel]);

  const openSavedReport = (record: OperationReportRecord, readOnly = false) => {
    setReportDate(record.reportDate);
    setBranch(record.branch);
    setReporterName(record.reporterName);
    setReporterRole(record.reporterPosition);
    setDepartment(record.department);
    setCollectionDueRows(record.data.collectionDueRows?.length ? record.data.collectionDueRows : createOperationCollectionRows());
    setCollectionPaidRows(record.data.collectionPaidRows?.length ? record.data.collectionPaidRows : createOperationCollectionRows());
    setDueNoticeRows(record.data.dueNoticeRows?.length ? record.data.dueNoticeRows : createOperationResolutionRows());
    setFollowUpRows(record.data.followUpRows?.length ? record.data.followUpRows : createOperationResolutionRows());
    setFormalNoticeRows(record.data.formalNoticeRows?.length ? record.data.formalNoticeRows : createOperationResolutionRows());
    setRequestedRows(record.data.requestedRows?.length ? record.data.requestedRows : [{ id: 1, customer: "", type: "", amount: "", reason: "" }]);
    setApprovedRows(record.data.approvedRows?.length ? record.data.approvedRows : [{ id: 1, customer: "", type: "", amount: "", reason: "" }]);
    setRejectedRows(record.data.rejectedRows?.length ? record.data.rejectedRows : [{ id: 1, customer: "", type: "", amount: "", reason: "" }]);
    setLoadedReporterUsername(record.reporterUsername);
    setLoadedReportStatus(record.status);
    setReviewComment(record.reviewComment || "");
    setValidationErrors([]);
    setActiveForm(readOnly ? "collection" : "summary");
    setViewOnly(readOnly);
    setReportPanel("form");
    window.scrollTo({ top: 0, behavior: "smooth" });
    toastSuccess(record.reporterUsername === user.username ? opText("បានផ្ទុករបាយការណ៍របស់អ្នក", "Your saved report was loaded.") : opText(`កំពុងពិនិត្យរបាយការណ៍របស់ ${record.reporterName}`, `Reviewing ${record.reporterName}'s report.`));
  };

  const editSavedReport = (record: OperationReportRecord) => {
    const ownsRecord = record.reporterUsername.trim().toLocaleLowerCase() === user.username.trim().toLocaleLowerCase();
    const editable = ownsRecord && ["draft", "returned"].includes(record.status);
    openSavedReport(record, !editable);
    setActiveForm("collection");
  };

  const deleteSavedReport = async (record: OperationReportRecord) => {
    const confirmed = window.confirm(opText(
      `លុបរបាយការណ៍របស់ ${record.reporterName || record.reporterUsername} សម្រាប់ថ្ងៃ ${record.reportDate} មែនទេ?`,
      `Delete ${record.reporterName || record.reporterUsername}'s report for ${record.reportDate}? This cannot be undone.`
    ));
    if (!confirmed) return;
    setDeletingReportId(record.id);
    try {
      await api<{ id: string }>(`/api/loan/operation-reports?id=${encodeURIComponent(record.id)}`, { method: "DELETE" });
      if (loadedReportRecord?.id === record.id) startOwnReport(reportDate);
      toastSuccess(opText("បានលុបរបាយការណ៍", "Report deleted."));
      await loadSavedReports();
    } catch (caught) {
      toastError(caught instanceof Error ? caught.message : opText("មិនអាចលុបរបាយការណ៍", "Could not delete report"));
    } finally {
      setDeletingReportId(null);
    }
  };

  const startOwnReport = (date = operationDateInputValue()) => {
    setReportPanel("form");
    setViewOnly(false);
    setReportDate(date);
    setBranch(user.branch || "Boeung Keng Kang");
    setReporterName(user.full_name || user.username);
    setReporterRole(user.position || user.role);
    setDepartment(user.department || "Loan Operations");
    setCollectionDueRows(createOperationCollectionRows());
    setCollectionPaidRows(createOperationCollectionRows());
    setDueNoticeRows(createOperationResolutionRows());
    setFollowUpRows(createOperationResolutionRows());
    setFormalNoticeRows(createOperationResolutionRows());
    setRequestedRows([{ id: 1, customer: "", type: "", amount: "", reason: "" }]);
    setApprovedRows([{ id: 1, customer: "", type: "", amount: "", reason: "" }]);
    setRejectedRows([{ id: 1, customer: "", type: "", amount: "", reason: "" }]);
    setLoadedReporterUsername(user.username);
    setLoadedReportStatus("draft");
    setReviewComment("");
    setValidationErrors([]);
  };

  const changeReportDate = (date: string) => {
    if (isBranchManagerReport) {
      setReportDate(date);
      setLoadedReporterUsername(user.username);
      setLoadedReportStatus("draft");
      setReviewComment("");
      setValidationErrors([]);
      return;
    }
    const saved = savedReports.find((record) => record.reporterUsername === user.username && record.reportDate === date);
    if (saved) openSavedReport(saved);
    else startOwnReport(date);
  };

  const refreshReportSources = () => {
    void loadSavedReports();
    onRefresh();
  };

  const openMyReport = () => {
    const saved = savedReports.find((record) => record.reporterUsername === user.username && record.reportDate === reportDate);
    if (saved) openSavedReport(saved);
    else startOwnReport(reportDate);
  };

  const startNewOperationReport = () => {
    const today = operationDateInputValue();
    const todayExists = savedReports.some((record) => record.reporterUsername === user.username && record.reportDate === today);
    const nextDate = todayExists
      ? window.prompt(opText("មានរបាយការណ៍សម្រាប់ថ្ងៃនេះរួចហើយ។ បញ្ចូលកាលបរិច្ឆេទថ្មី (YYYY-MM-DD)", "A report already exists for today. Enter a new report date (YYYY-MM-DD)"), today)?.trim() || ""
      : today;
    if (!isValidReportDateInput(nextDate)) {
      toastError(opText("សូមបញ្ចូលកាលបរិច្ឆេទត្រឹមត្រូវ។", "Enter a valid report date."));
      return;
    }
    const existing = savedReports.find((record) => record.reporterUsername === user.username && record.reportDate === nextDate);
    if (existing) {
      toastError(opText("មានរបាយការណ៍របស់អ្នកសម្រាប់កាលបរិច្ឆេទនេះរួចហើយ។ សូមជ្រើសរើសកាលបរិច្ឆេទថ្មី។", "You already have a report for this date. Choose a new date."));
      return;
    }
    startOwnReport(nextDate);
    setActiveForm("collection");
    setSavedValuesOpen(false);
    toastSuccess(opText("បានចាប់ផ្ដើមរបាយការណ៍ថ្មី។ កំណត់ត្រាចាស់មិនត្រូវបានលុបទេ។", "New report started. Existing report records were not deleted."));
  };

  const startNewLsReportFromRecords = () => {
    if (isBranchManagerReport) selectReportMode("operation");
    startNewOperationReport();
  };

  const saveBranchManagerReport = async (status: "draft" | "submitted") => {
    if (!canManageReports) return;
    if (!branchManagerRecords.length) {
      toastError(opText("មិនទាន់មានរបាយការណ៍ LS ដែលបានដាក់ស្នើសម្រាប់សាខា និងកាលបរិច្ឆេទនេះ", "No submitted LS reports are available for this branch and date."));
      return;
    }
    if (!branchAccountRecords.length) {
      toastError(opText("មិនទាន់មានរបាយការណ៍គណនេយ្យដែលបានដាក់ស្នើសម្រាប់សាខា និងកាលបរិច្ឆេទនេះ", "No submitted Account Report is available for this branch and date."));
      return;
    }
    const reportsAwaitingReview = branchManagerRecords.filter((record) => record.status === "submitted");
    const accountReportsAwaitingReview = branchAccountRecords.filter((record) => record.status === "submitted");
    if (status === "submitted" && (reportsAwaitingReview.length || accountReportsAwaitingReview.length)) {
      toastError(opText(`សូមពិនិត្យរបាយការណ៍ LS ចំនួន ${reportsAwaitingReview.length} និងរបាយការណ៍គណនេយ្យ ${accountReportsAwaitingReview.length} មុនពេលដាក់ស្នើរបាយការណ៍ BM`, `Review ${reportsAwaitingReview.length} LS report(s) and ${accountReportsAwaitingReview.length} Account Report(s) before submitting the BM report.`));
      return;
    }
    setSavingBranchManagerReport(status);
    try {
      await api<OperationReportRecord>("/api/loan/operation-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportType: "bm",
          reportDate,
          reporterName: user.full_name || user.username,
          reporterPosition: user.position || user.role,
          department: user.department || department,
          branch,
          status,
          data: { sourceReportIds: branchManagerRecords.map((record) => record.id), sourceAccountReportIds: branchAccountRecords.map((record) => record.id) },
        }),
      });
      toastSuccess(status === "submitted" ? opText("បានដាក់ស្នើរបាយការណ៍ BM ទៅថ្នាក់លើ", "BM Report submitted to upper management.") : opText("បានរក្សាទុករបាយការណ៍ BM ជាព្រាង", "BM Report saved as draft."));
      await loadSavedReports();
    } catch (caught) {
      toastError(caught instanceof Error ? caught.message : opText("មិនអាចរក្សាទុករបាយការណ៍ BM", "Could not save BM Report"));
    } finally {
      setSavingBranchManagerReport(null);
    }
  };

  async function exportOperationReport() {
    setExporting(true);
    try {
      const { exportBranchManagerOperationReportExcel, exportOperationReportExcel } = await import("@/systems/loan/utils/exportOperationReportExcel");
      const exportData = { reportDate, branch, reporterName, reporterRole, department, collectionDueRows, collectionPaidRows, dueNoticeRows, followUpRows, formalNoticeRows, requestedRows, approvedRows, rejectedRows };
      if (isBranchManagerReport) {
        await exportBranchManagerOperationReportExcel({ ...exportData, savedReports: branchManagerRecords, monthReports: branchManagerMonthRecords, yearReports: branchManagerYearRecords, accountReports: branchAccountRecords, monthAccountReports: branchAccountMonthRecords, yearAccountReports: branchAccountYearRecords, loans: branchManagerLoans });
      } else {
        await exportOperationReportExcel(exportData);
      }
      toastSuccess(opText("បាននាំចេញឯកសារ Excel", "Excel workbook exported."));
    } catch (caught) {
      toastError(caught instanceof Error ? caught.message : opText("មិនអាចនាំចេញឯកសារ Excel", "Could not export Excel workbook"));
    } finally {
      setExporting(false);
    }
  }

  const reusableOperationValues = (field: typeof OPERATION_REPORT_REUSABLE_FIELDS[number]) => Array.from(new Set([
    ...(rememberedFields[field] || []),
    ...(field === "customer" ? suggestedCustomers : []),
    ...(field === "assetType" || field === "type" ? selectableAssetTypes : []),
    ...(field === "reason" ? [...OPERATION_COLLECTION_REASONS, ...OPERATION_REJECTION_REASONS] : []),
    ...(field === "solution" ? OPERATION_RESOLUTION_OPTIONS : []),
  ])).filter(Boolean);
  const operationFieldProps = (field: typeof OPERATION_REPORT_REUSABLE_FIELDS[number]) => ({ list: `operation-report-${field}-options`, onBlur: (event: React.FocusEvent<HTMLInputElement>) => rememberField(field, event.currentTarget.value) });
  const datalist = <datalist id="operation-report-customers">{reusableOperationValues("customer").map((customer) => <option key={customer} value={customer} />)}</datalist>;
  const loanTypeDatalist = <datalist id="operation-report-loan-types">{suggestedLoanTypes.map((type) => <option key={type} value={type} />)}</datalist>;
  const assetTypeDatalist = <datalist id="operation-report-asset-types">{selectableAssetTypes.map((type) => <option key={type} value={type} />)}</datalist>;
  const reportFieldClass = "block w-full border-0 bg-transparent px-3 py-2 text-slate-950 outline-none focus:bg-emerald-50 disabled:opacity-100 dark:text-slate-100 dark:focus:bg-emerald-950/30";
  const standardReportSheetHeader = (
    <>
      <div className="relative flex min-h-36 items-center justify-center border-b border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-950">
        <div className="absolute inset-y-0 left-0 flex items-center justify-center p-4"><EmeraldCashLogo className="h-auto w-44 object-contain" /></div>
        <div className="font-khmer-muol-light w-full px-32 text-center text-3xl text-red-700">ក្រុមហ៊ុន អេមើរ៉ល ឃែស ឯ.ក</div>
      </div>
      <div className="font-khmer-muol-light flex items-center justify-center border-b border-slate-300 py-3 text-center text-2xl text-emerald-700 dark:border-slate-700">របាយការណ៍លទ្ធផលប្រចាំថ្ងៃ សាខា បឹងកេងកង</div>
      <div className="grid grid-cols-[1fr_180px_1.4fr_1fr] border-b border-slate-300 dark:border-slate-700">
        <div className="border-r border-slate-300 dark:border-slate-700" />
        <div className="col-span-2 grid grid-cols-[180px_minmax(0,1fr)]">
          <div className="flex min-h-12 items-center justify-end whitespace-nowrap border-b border-slate-300 px-3 py-2 text-right font-semibold dark:border-slate-700">កាលបរិច្ឆេទ៖</div>
          <DateInput title="Report date" disabled={reviewingAnotherSpecialist || reportLocked} value={reportDate} onChange={changeReportDate} className={`${reportFieldClass} min-h-12 border-b border-slate-300 dark:border-slate-700`} />
          <div className="flex min-h-12 items-center justify-end whitespace-nowrap border-b border-slate-300 px-3 py-2 text-right font-semibold dark:border-slate-700">ឈ្មោះ៖</div>
          <input disabled={reviewingAnotherSpecialist || reportLocked} {...operationFieldProps("reporterName")} value={reporterName} onChange={(event) => setReporterName(event.target.value)} className={`${reportFieldClass} min-h-12 border-b border-slate-300 dark:border-slate-700`} />
          <div className="flex min-h-12 items-center justify-end whitespace-nowrap border-b border-slate-300 px-3 py-2 text-right font-semibold dark:border-slate-700">តួនាទី៖</div>
          <input disabled={reviewingAnotherSpecialist || reportLocked} {...operationFieldProps("reporterRole")} value={reporterRole} onChange={(event) => setReporterRole(event.target.value)} className={`${reportFieldClass} min-h-12 border-b border-slate-300 dark:border-slate-700`} />
          <div className="flex min-h-12 items-center justify-end whitespace-nowrap px-3 py-2 text-right font-semibold">នាយកដ្ឋាន៖</div>
          <input disabled={reviewingAnotherSpecialist || reportLocked} {...operationFieldProps("department")} value={department} onChange={(event) => setDepartment(event.target.value)} className={`${reportFieldClass} min-h-12`} />
        </div>
        <div aria-hidden="true" className="border-l border-slate-300 dark:border-slate-700" />
      </div>
      <div className="h-10 border-b border-slate-300 dark:border-slate-700" />
    </>
  );
  const branchManagerBrandHeader = (
    <div className="grid min-h-28 grid-cols-[220px_1fr] border-b border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-950">
      <div className="flex items-center justify-center p-4"><EmeraldCashLogo className="h-auto w-44 object-contain" /></div>
      <div className="font-khmer-muol-light flex items-center justify-center px-5 text-center text-3xl text-emerald-800 dark:text-emerald-300">ក្រុមហ៊ុន អេមើរ៉ល ឃែស ឯ.ក</div>
    </div>
  );
  const branchManagerReportSheetHeader = activeForm === "collection" ? (
    <>
      {branchManagerBrandHeader}
      <div className="font-khmer-muol-light flex min-h-14 items-center justify-center border-b border-slate-300 px-5 text-center text-2xl text-emerald-800 dark:border-slate-700 dark:text-emerald-300">ទិន្នន័យប្រកាសសរុបពីមន្ត្រីឥណទានទាំងអស់ប្រចាំថ្ងៃ</div>
    </>
  ) : (
    <>
      {branchManagerBrandHeader}
      <div className="font-khmer-muol-light flex items-center justify-center border-b border-slate-300 py-3 text-center text-2xl text-emerald-800 dark:border-slate-700 dark:text-emerald-300">របាយការណ៍សង្ខេបលទ្ធផលប្រចាំថ្ងៃ - ថ្នាក់ប្រធានសាខា (Branch Manager Daily Report)</div>
      <div className="grid grid-cols-[150px_minmax(0,1fr)_180px_minmax(0,1fr)] border-b border-slate-300 dark:border-slate-700">
        <div className="flex min-h-12 items-center justify-end whitespace-nowrap border-b border-r border-slate-300 px-3 py-2 font-semibold dark:border-slate-700">សាខា៖</div>
        <input disabled={reviewingAnotherSpecialist || reportLocked} {...operationFieldProps("branch")} value={branch} onChange={(event) => setBranch(event.target.value)} className={`${reportFieldClass} min-h-12 border-b border-r border-slate-300 dark:border-slate-700`} />
        <div className="flex min-h-12 items-center justify-end whitespace-nowrap border-b border-r border-slate-300 px-3 py-2 font-semibold dark:border-slate-700">កាលបរិច្ឆេទ៖</div>
                  <DateInput title="Report date" disabled={reviewingAnotherSpecialist || reportLocked} value={reportDate} onChange={changeReportDate} className={`${reportFieldClass} min-h-12 border-b border-slate-300 dark:border-slate-700`} />
        <div className="flex min-h-12 items-center justify-end whitespace-nowrap border-r border-slate-300 px-3 py-2 font-semibold dark:border-slate-700">ឈ្មោះប្រធានសាខា៖</div>
        <input disabled={reviewingAnotherSpecialist || reportLocked} {...operationFieldProps("reporterName")} value={reporterName} onChange={(event) => setReporterName(event.target.value)} className={`${reportFieldClass} min-h-12 border-r border-slate-300 dark:border-slate-700`} />
        <div className="flex min-h-12 items-center justify-end whitespace-nowrap border-r border-slate-300 px-3 py-2 font-semibold dark:border-slate-700">នាយកដ្ឋាន៖</div>
        <input disabled={reviewingAnotherSpecialist || reportLocked} {...operationFieldProps("department")} value={department} onChange={(event) => setDepartment(event.target.value)} className={`${reportFieldClass} min-h-12`} />
      </div>
    </>
  );
  const reportSheetHeader = isBranchManagerReport ? branchManagerReportSheetHeader : standardReportSheetHeader;
  const displayedReportStatus = isBranchManagerReport ? branchManagerReportStatus : effectiveReportStatus;
  const reportSaveDisabled = isBranchManagerReport ? Boolean(savingBranchManagerReport) || branchManagerReportLocked : Boolean(savingReport) || reviewingAnotherSpecialist || reportLocked;
  const ownSavedReport = !isBranchManagerReport ? savedReports.find((record) => record.reporterUsername === user.username && record.reportDate === reportDate) : undefined;
  const hasEnteredOperationData = !isBranchManagerReport && [...collectionDueRows, ...collectionPaidRows, ...dueNoticeRows, ...followUpRows, ...formalNoticeRows, ...requestedRows, ...approvedRows, ...rejectedRows].some((row) => row.customer.trim());
  const hasUnsavedChanges = hasEnteredOperationData && (!ownSavedReport || JSON.stringify(currentReportData()) !== JSON.stringify(ownSavedReport.data));
  const submissionRequirements = !isBranchManagerReport && !reviewingAnotherSpecialist && !reportLocked ? validateOperationReport() : [];
  const branchManagerSubmissionRequirements = isBranchManagerReport ? [
    !branchManagerRecords.length ? opText("មិនទាន់មានរបាយការណ៍ LS ដែលបានដាក់ស្នើ", "A submitted LS report is required") : "",
    !branchAccountRecords.length ? opText("មិនទាន់មានរបាយការណ៍គណនេយ្យដែលបានដាក់ស្នើ", "A submitted Account Report is required") : "",
    branchManagerRecords.some((record) => record.status === "submitted") ? opText("ត្រូវពិនិត្យរបាយការណ៍ LS ដែលបានដាក់ស្នើ", "Review submitted LS reports") : "",
    branchAccountRecords.some((record) => record.status === "submitted") ? opText("ត្រូវពិនិត្យរបាយការណ៍គណនេយ្យដែលបានដាក់ស្នើ", "Review submitted Account Reports") : "",
  ].filter(Boolean) : [];
  const submitRequirements = isBranchManagerReport ? branchManagerSubmissionRequirements : submissionRequirements;
  const reportSubmitDisabled = reportSaveDisabled;
  const reportFormTabClass = (value: "summary" | "collection" | "decisions") => {
    const color = value === "summary"
      ? activeForm === value ? "border-blue-700 bg-blue-600 text-white ring-blue-200 hover:bg-blue-700 dark:ring-blue-900" : "border-blue-200 bg-blue-50 text-blue-800 hover:border-blue-400 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200 dark:hover:bg-blue-900/60"
      : value === "collection"
        ? activeForm === value ? "border-emerald-700 bg-emerald-600 text-white ring-emerald-200 hover:bg-emerald-700 dark:ring-emerald-900" : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-400 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200 dark:hover:bg-emerald-900/60"
        : activeForm === value ? "border-amber-600 bg-amber-500 text-white ring-amber-200 hover:bg-amber-600 dark:ring-amber-900" : "border-amber-200 bg-amber-50 text-amber-800 hover:border-amber-400 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-900/60";
    return `min-h-12 min-w-0 rounded-xl border-2 px-4 py-2 text-center text-base font-bold shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${activeForm === value ? "shadow-md ring-2" : ""} ${color}`;
  };

  const canViewBothReports = ["admin", "system administrator", "manager / approver", "branch manager", "bm", "credit manager", "credit / approver", "executive viewer"].includes(normalizedUserRole);
  const accountOnlyUser = !canViewBothReports && (["finance", "accountant", "assistant accountant"].includes(normalizedUserRole)
    || (user.position || "").trim().toLocaleLowerCase().includes("accountant")
    || (user.position || "").trim().toLocaleLowerCase().includes("finance"));
  if (accountOnlyUser) {
    return <Card className="border-amber-200 bg-amber-50 p-6 text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">{opText("គណនេយ្យអាចមើលបានតែរបាយការណ៍គណនេយ្យប៉ុណ្ណោះ។", "Accounting users can view Account Reports only.")}</Card>;
  }

  return (
    <div className="min-w-0 space-y-4 pb-10 lg:[zoom:0.9]">
      {datalist}
      {loanTypeDatalist}
      {assetTypeDatalist}
      {OPERATION_REPORT_REUSABLE_FIELDS.map((field) => <datalist key={field} id={`operation-report-${field}-options`}>{reusableOperationValues(field).map((value) => <option key={value} value={value} />)}</datalist>)}
      <datalist id="operation-report-reasons">{OPERATION_COLLECTION_REASONS.map((reason) => <option key={reason} value={reason} />)}</datalist>
      <datalist id="operation-report-solutions">{OPERATION_RESOLUTION_OPTIONS.map((solution) => <option key={solution} value={solution} />)}</datalist>
      <datalist id="operation-report-rejection-reasons">{OPERATION_REJECTION_REASONS.map((reason) => <option key={reason} value={reason} />)}</datalist>

      <div className={`${reportPanel === "records" ? "hidden" : "sticky"} top-0 z-40 space-y-2 border-b border-slate-200 bg-slate-50/95 pb-2 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/95 print:static print:border-0 print:bg-transparent print:pb-0`}>
      <section className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-900 print:hidden">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex shrink-0 items-center gap-2">
            {canManageReports ? <div className="inline-flex overflow-hidden rounded-xl border border-slate-300 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-950"><button type="button" onClick={() => selectReportMode("operation")} className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${reportMode === "operation" ? "bg-white text-emerald-700 shadow-sm hover:bg-emerald-50 dark:bg-slate-800 dark:text-emerald-300 dark:hover:bg-emerald-950/40" : "text-slate-500 hover:bg-emerald-100 hover:text-emerald-800 dark:text-slate-400 dark:hover:bg-emerald-950/50 dark:hover:text-emerald-200"}`}>{opText("របាយការណ៍ LS", "LS Report")}</button><button type="button" onClick={() => selectReportMode("branchManager")} className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${reportMode === "branchManager" ? "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700" : "text-slate-500 hover:bg-blue-100 hover:text-blue-800 dark:text-slate-400 dark:hover:bg-blue-950/50 dark:hover:text-blue-200"}`}>{opText("របាយការណ៍ BM", "BM Report")}</button></div> : null}
            <span className={`inline-flex items-center rounded-lg px-3 py-2 text-sm font-semibold ${operationReportStatusClass(displayedReportStatus)}`}>{operationReportStatusLabel(displayedReportStatus, language)}</span>
            {!isBranchManagerReport && reviewingAnotherSpecialist ? <button type="button" onClick={openMyReport} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"><FilePlus2 className="h-4 w-4" />{opText("របាយការណ៍ខ្ញុំ", "My Report")}</button> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setReportPanel("records")} className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300"><List className="h-4 w-4" />{opText("កំណត់ត្រា", "Records")}</button>
            <button type="button" onClick={() => setSavedValuesOpen((open) => !open)} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"><List className="h-4 w-4" />{opText("តម្លៃដែលបានរក្សាទុក", "Saved values")}</button>
            {!isBranchManagerReport ? <button type="button" onClick={startNewOperationReport} className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"><FilePlus2 className="h-4 w-4" />{opText("របាយការណ៍ថ្មី", "New Report")}</button> : null}
            <button type="button" disabled={reportSaveDisabled} onClick={() => void (isBranchManagerReport ? saveBranchManagerReport("draft") : saveOperationReport("draft"))} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">{(isBranchManagerReport ? savingBranchManagerReport : savingReport) === "draft" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{opText("រក្សាទុកព្រាង", "Save Draft")}</button>
            <button type="button" disabled={reportSubmitDisabled} title={submitRequirements.length ? submitRequirements.join(" · ") : undefined} onClick={() => void (isBranchManagerReport ? saveBranchManagerReport("submitted") : saveOperationReport("submitted"))} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">{(isBranchManagerReport ? savingBranchManagerReport : savingReport) === "submitted" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}{isBranchManagerReport ? opText("ដាក់ស្នើទៅថ្នាក់លើ", "Submit to Management") : opText("ដាក់ស្នើទៅ BM", "Submit to BM")}</button>
            {canViewLoanData ? <button type="button" disabled={loading || reportsLoading} onClick={refreshReportSources} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"><RefreshCw className={`h-4 w-4 ${loading || reportsLoading ? "animate-spin" : ""}`} />{opText("ផ្ទុកទិន្នន័យឡើងវិញ", "Refresh data")}</button> : null}
            <button type="button" disabled={exporting} onClick={() => void exportOperationReport()} className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:cursor-wait disabled:opacity-60 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">{exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}{exporting ? opText("កំពុងបង្កើត Excel…", "Creating Excel…") : opText("នាំចេញ Excel", "Export Excel")}</button>
            <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"><Printer className="h-4 w-4" />{opText("បោះពុម្ព", "Print")}</button>
          </div>
        </div>
      </section>
      {!reviewingAnotherSpecialist ? <section className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm dark:border-slate-800 dark:bg-slate-900">{!isBranchManagerReport ? <><span className={`font-semibold ${hasUnsavedChanges ? "text-amber-700 dark:text-amber-300" : "text-emerald-700 dark:text-emerald-300"}`}>{hasUnsavedChanges ? opText("មានការកែប្រែមិនទាន់រក្សាទុក", "Unsaved changes") : opText("ទិន្នន័យបានរក្សាទុក", "Saved")}</span>{ownSavedReport?.updatedAt ? <span className="text-slate-500">{opText("រក្សាទុកចុងក្រោយ", "Last saved")}: {new Date(ownSavedReport.updatedAt).toLocaleString()}</span> : null}</> : <><span className="font-semibold text-slate-600 dark:text-slate-300">{opText("ស្ថានភាពរបាយការណ៍ BM", "BM report status")}</span><span className="text-slate-500">{opText(`ទិន្នន័យប្រចាំថ្ងៃ៖ LS ${branchManagerRecords.length} · គណនេយ្យ ${branchAccountRecords.length} · ធ្វើបច្ចុប្បន្នភាពស្វ័យប្រវត្តិ`, `Daily sources: LS ${branchManagerRecords.length} · Account ${branchAccountRecords.length} · auto-updated`)}</span></>}<span className={`font-semibold ${submitRequirements.length ? "text-amber-700 dark:text-amber-300" : "text-emerald-700 dark:text-emerald-300"}`}>{submitRequirements.length ? opText(`ត្រូវបំពេញ ${submitRequirements.length} ចំណុច មុនដាក់ស្នើ`, `${submitRequirements.length} requirement(s) before submit`) : isBranchManagerReport ? opText("រួចរាល់សម្រាប់ដាក់ស្នើទៅថ្នាក់លើ", "Ready to submit to management") : opText("រួចរាល់សម្រាប់ដាក់ស្នើទៅ BM", "Ready to submit to BM")}</span></section> : null}
      {!isBranchManagerReport && !reviewingAnotherSpecialist && reportLocked ? <section className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/25 dark:text-amber-100"><strong>{opText("របាយការណ៍ត្រូវបានចាក់សោសម្រាប់ពិនិត្យ៖", "Report locked for review:")}</strong> {opText("របាយការណ៍ដែលបានដាក់ស្នើ មិនអាចកែប្រែ ឬដាក់ស្នើម្តងទៀតបានទេ រហូតដល់ BM បញ្ជូនត្រឡប់ឱ្យកែតម្រូវ។ សម្រាប់របាយការណ៍ថ្មី សូមជ្រើសរើសកាលបរិច្ឆេទថ្មី។", "A submitted report cannot be changed or submitted again until the BM returns it for correction. Choose a new report date to create a new report.")}</section> : null}

      <div role="tablist" aria-label="Operation Report forms" className="font-khmer-battambang rounded-xl border border-slate-200 bg-slate-100 p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900 print:hidden">
        <div className={`grid grid-cols-1 gap-2 sm:grid-cols-2 ${isBranchManagerReport ? "" : "xl:grid-cols-3"}`}>
          {(isBranchManagerReport ? ([
            ["summary", opText("សង្ខេបប្រចាំសាខា", "Dashboard")],
            ["collection", opText("ទិន្នន័យរួម LS + គណនេយ្យប្រចាំថ្ងៃ", "Daily LS + Account Consolidation")],
          ] as const) : ([
            ["summary", opText("របាយការណ៍សង្ខេប", "Summary")],
            ["collection", opText("អតិថិជនប្រមូល និងដោះស្រាយ", "Collection & Resolution")],
            ["decisions", opText("ឥណទានស្នើសុំ អនុម័ត និងបដិសេធ", "Loan Decisions")],
          ] as const)).map(([value, label]) => <button key={value} type="button" role="tab" aria-selected={activeForm === value} onClick={() => setActiveForm(value)} className={reportFormTabClass(value)}>{label}</button>)}
        </div>
      </div>
      </div>
      {reportPanel === "form" && savedValuesOpen ? <RememberedReportValuesManager fields={rememberedFields} onRemove={forgetField} onClose={() => setSavedValuesOpen(false)} /> : null}

      {reportPanel === "form" && reviewingAnotherSpecialist ? <section className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/25 dark:text-amber-100">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><span><strong>{opText("សម្រាប់ពិនិត្យប៉ុណ្ណោះ៖", "Review only:")}</strong> {opText("របាយការណ៍នេះជារបស់", "This report belongs to")} {reporterName || loadedReporterUsername}.</span><button type="button" onClick={openMyReport} className="shrink-0 font-semibold underline underline-offset-2">{opText("ត្រឡប់ទៅរបាយការណ៍ខ្ញុំ", "Return to My Report")}</button></div>
        {loadedReportRecord?.reviewComment ? <div className="mt-3 border-t border-amber-200 pt-3 dark:border-amber-800"><p className="font-semibold">{opText("មតិយោបល់ពិនិត្យ", "Review Comment")}{loadedReportRecord.reviewedBy ? `: ${loadedReportRecord.reviewedBy}` : ""}</p><p className="mt-1 whitespace-pre-wrap">{loadedReportRecord.reviewComment}</p></div> : null}
        {reviewCommentError ? <div role="alert" className="mt-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 font-semibold text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">{opText("សូមសរសេរមូលហេតុក្នុងប្រអប់មតិយោបល់សិន រួចចុច «បញ្ជូនត្រឡប់ឱ្យកែតម្រូវ» ម្តងទៀត។", "Enter the correction reason in the comment box, then click Return for Correction again.")}</div> : null}
        {canManageReports && ["submitted", "reviewed"].includes(loadedReportStatus) ? <div className="mt-4 border-t border-amber-200 pt-4 dark:border-amber-800"><Field label={opText("មតិយោបល់របស់អ្នកគ្រប់គ្រង", "Manager Review Comment")}><textarea rows={2} value={reviewComment} onChange={(event) => setReviewComment(event.target.value)} placeholder={opText("ត្រូវបញ្ចូលពេលបញ្ជូនត្រឡប់", "Required when returning for correction")} className={inputClass} /></Field><div className="mt-3 flex flex-wrap gap-2">{loadedReportStatus === "submitted" ? <button type="button" disabled={Boolean(reviewingAction)} onClick={() => void reviewOperationReport("reviewed")} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{reviewingAction === "reviewed" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}{opText("សម្គាល់ថាបានពិនិត្យ", "Mark Reviewed")}</button> : null}{loadedReportStatus === "reviewed" ? <button type="button" disabled={Boolean(reviewingAction)} onClick={() => void reviewOperationReport("approved")} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">{reviewingAction === "approved" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}{opText("អនុម័ត", "Approve")}</button> : null}<button type="button" disabled={Boolean(reviewingAction)} onClick={() => void reviewOperationReport("returned")} className="inline-flex items-center gap-2 rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50 dark:bg-slate-950 dark:text-red-300">{reviewingAction === "returned" ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}{opText("បញ្ជូនត្រឡប់ឱ្យកែតម្រូវ", "Return for Correction")}</button></div></div> : null}
      </section> : loadedReportStatus === "returned" && loadedReportRecord?.reviewComment ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-800 dark:bg-red-950/25 dark:text-red-200"><strong>{opText("បានបញ្ជូនត្រឡប់ឱ្យកែតម្រូវ៖", "Returned for correction:")}</strong> {loadedReportRecord.reviewComment}</div> : null}

      {reportPanel === "form" && validationErrors.length ? <section role="alert" className="rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-900 dark:border-red-800 dark:bg-red-950/25 dark:text-red-200"><p className="font-bold">{opText("សូមបំពេញតម្រូវការទាំងនេះមុនពេលដាក់ស្នើ៖", "Complete these requirements before submitting:")}</p><ul className="mt-2 list-disc space-y-1 pl-5">{validationErrors.map((error) => <li key={error}>{error}</li>)}</ul></section> : null}
      <Card className="min-w-0 overflow-x-auto rounded-xl border border-slate-300 bg-white p-0 shadow-sm dark:border-slate-700 dark:bg-slate-950">
        <fieldset disabled={reportPanel === "records" || reportSaveDisabled || viewOnly} className="min-w-0 border-0 p-0 disabled:opacity-90">
        <div className="overflow-hidden">
          <div className="font-khmer-battambang min-w-0 text-slate-950 dark:text-slate-100">
            {!viewOnly ? reportSheetHeader : null}
            {activeForm === "summary" ? isBranchManagerReport ? <BranchManagerDashboardReport records={branchManagerRecords} monthRecords={branchManagerMonthRecords} yearRecords={branchManagerYearRecords} accountRecords={branchAccountRecords} monthAccountRecords={branchAccountMonthRecords} yearAccountRecords={branchAccountYearRecords} loans={branchManagerLoans} reportDate={reportDate} /> : <OperationSummaryTable dueCount={dueCustomerCount} paidCount={paidCustomerCount} collectionRate={collectionRate} followUpRows={followUpRows} formalNoticeRows={formalNoticeRows} requestedRows={requestedRows} approvedRows={approvedRows} rejectedRows={rejectedRows} /> : null}
            {activeForm === "collection" ? isBranchManagerReport ? <BranchManagerConsolidatedReport records={branchManagerRecords} accountRecords={branchAccountRecords} loans={branchManagerLoans} /> : <>
              <div className="grid grid-cols-1 lg:grid-cols-2"><CollectionReportTable title={opText("អតិថិជនដែលត្រូវប្រមូលសរុប", "Total Customers Due")} rows={collectionDueRows} onChange={setCollectionDueRows} onRememberField={rememberField} /><CollectionReportTable title={opText("អតិថិជនដែលប្រមូលបានសរុប", "Total Customers Collected")} rows={collectionPaidRows} onChange={setCollectionPaidRows} accent="red" onRememberField={rememberField} /></div>
              <div className="space-y-8 border-t-4 border-double border-slate-900 pt-6"><ResolutionTable title={opText("អតិថិជនដែលដោះស្រាយសរុប", "Total Customers to Resolve")} rows={followUpRows} onChange={setFollowUpRows} onRememberAssetType={rememberAssetType} onRememberField={rememberField} /><ResolutionTable title={opText("អតិថិជនដែលដោះស្រាយបានសរុប", "Total Customers Resolved")} rows={formalNoticeRows} onChange={setFormalNoticeRows} onRememberAssetType={rememberAssetType} onRememberField={rememberField} /></div>
            </> : null}
            {!isBranchManagerReport && activeForm === "decisions" ? <div className="space-y-8 pb-4"><DecisionTable title={opText("អតិថិជនដែលស្នើឥណទាន", "Loan Requests")} rows={requestedRows} total={sumRows(requestedRows, "amount")} onChange={setRequestedRows} loans={visibleLoans} statusGroup="requested" onRememberType={rememberAssetType} onRememberField={rememberField} /><DecisionTable title={opText("អតិថិជនដែលបានអនុម័ត", "Approved Loans")} rows={approvedRows} total={sumRows(approvedRows, "amount")} onChange={setApprovedRows} loans={visibleLoans} statusGroup="approved" onRememberType={rememberAssetType} onRememberField={rememberField} /><DecisionTable title={opText("អតិថិជនដែលបានបដិសេធ", "Rejected Loans")} rows={rejectedRows} total={sumRows(rejectedRows, "amount")} onChange={setRejectedRows} loans={visibleLoans} statusGroup="rejected" showReason onRememberType={rememberAssetType} onRememberField={rememberField} /></div> : null}
          </div>
        </div>
        </fieldset>
      </Card>

      {reportPanel === "records" ? (
        <div className="space-y-6 print:hidden">
          {isBranchManagerReport ? (
            <>
              <BranchManagerWorkflowPanel sourceRecords={branchManagerRecords} sourceReportHistory={branchLoanSpecialistRecords} accountRecords={branchAccountRecords} accountReportHistory={branchAccountReportHistory} submissions={branchManagerReports} reportDate={reportDate} branch={branch} currentUsername={user.username} reviewingAction={reviewingAction} onOpen={(record) => { setReportDate(record.reportDate); setBranch(record.branch); setReportPanel("form"); setViewOnly(true); }} onReview={(record, action) => void reviewBranchManagerSubmission(record, action)} onReviewAccount={(record, action) => void reviewAccountReport(record, action)} />
              <OperationReportRecordsDashboard records={branchLoanSpecialistRecords} loading={reportsLoading} currentUsername={user.username} canManageReports={canManageReports} canDeleteReports={["admin", "system administrator"].includes(normalizedUserRole)} deletingReportId={deletingReportId} onCreate={startNewLsReportFromRecords} onView={(record) => openSavedReport(record, true)} onEdit={editSavedReport} onDelete={deleteSavedReport} />
            </>
          ) : (
            <OperationReportRecordsDashboard records={visibleSavedReports} loading={reportsLoading} currentUsername={user.username} canManageReports={canManageReports} canDeleteReports={["admin", "system administrator"].includes(normalizedUserRole)} deletingReportId={deletingReportId} onCreate={startNewLsReportFromRecords} onView={(record) => openSavedReport(record, true)} onEdit={editSavedReport} onDelete={deleteSavedReport} />
          )}
        </div>
      ) : null}
    </div>
  );
}

function BranchManagerWorkflowPanel({ sourceRecords, sourceReportHistory, accountRecords, accountReportHistory, submissions, reportDate, branch, currentUsername, reviewingAction, onOpen, onReview, onReviewAccount }: { sourceRecords: OperationReportRecord[]; sourceReportHistory: OperationReportRecord[]; accountRecords: AccountReportRecord[]; accountReportHistory: AccountReportRecord[]; submissions: OperationReportRecord[]; reportDate: string; branch: string; currentUsername: string; reviewingAction: "reviewed" | "approved" | "returned" | null; onOpen: (record: OperationReportRecord) => void; onReview: (record: OperationReportRecord, action: "reviewed" | "approved" | "returned") => void; onReviewAccount: (record: AccountReportRecord, action: "reviewed" | "approved" | "returned") => void }) {
  const { language } = useLanguage();
  const text = (km: string, en: string) => language === "km" ? km : en;
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reporterFilter, setReporterFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | OperationReportRecord["status"]>("");
  const branchSubmissions = submissions.filter((record) => !branch.trim() || record.branch.trim().toLocaleLowerCase() === branch.trim().toLocaleLowerCase());
  const reporterOptions = useMemo(() => Array.from(new Map([...accountReportHistory, ...branchSubmissions].map((record) => [record.reporterUsername, record.reporterName || record.reporterUsername])).entries()).sort((left, right) => left[1].localeCompare(right[1])), [accountReportHistory, branchSubmissions]);
  const matchesReviewFilter = (record: Pick<OperationReportRecord, "reportDate" | "reporterUsername" | "status">) => (!fromDate || record.reportDate >= fromDate) && (!toDate || record.reportDate <= toDate) && (!reporterFilter || record.reporterUsername === reporterFilter) && (!statusFilter || record.status === statusFilter);
  const filteredAccountRecords = accountReportHistory.filter(matchesReviewFilter);
  const filteredBranchSubmissions = branchSubmissions.filter(matchesReviewFilter);
  const activeFilterCount = [fromDate, toDate, reporterFilter, statusFilter].filter(Boolean).length;
  const currentSubmission = branchSubmissions.find((record) => record.reportDate === reportDate && record.reporterUsername === currentUsername);
  const currentLsReports = sourceReportHistory.filter((record) => record.reportDate === reportDate);
  const currentAccountReports = accountReportHistory.filter((record) => record.reportDate === reportDate);
  const reportStatuses: OperationReportRecord["status"][] = ["draft", "submitted", "reviewed", "approved", "returned"];
  const statusCount = (records: Array<Pick<OperationReportRecord, "status">>, status: OperationReportRecord["status"]) => records.filter((record) => record.status === status).length;
  const awaitingReview = sourceRecords.filter((record) => record.status === "submitted").length;
  const accountAwaitingReview = accountRecords.filter((record) => record.status === "submitted").length;
  return (
    <section className="overflow-hidden rounded-xl border border-emerald-200 bg-white shadow-sm dark:border-emerald-900 dark:bg-slate-900">
      <div className="border-b border-emerald-200 bg-emerald-50 px-5 py-4 dark:border-emerald-900 dark:bg-emerald-950/30"><p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{text("លំហូររបាយការណ៍ LS + គណនេយ្យ → BM → ថ្នាក់លើ", "LS + Account Reports → BM → Management")}</p><h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{text("ការដាក់ស្នើរបាយការណ៍ប្រចាំសាខា", "Branch Report Submission")}</h2></div>
      <div className="grid border-b border-slate-200 sm:grid-cols-4 dark:border-slate-800">
        {[[text("របាយការណ៍ LS បានទទួល", "LS Reports Received"), sourceRecords.length], [text("របាយការណ៍គណនេយ្យ", "Account Reports"), accountRecords.length], [text("រង់ចាំ BM ពិនិត្យ", "Awaiting BM Review"), awaitingReview + accountAwaitingReview], [text("ស្ថានភាព BM", "BM Status"), operationReportStatusLabel(currentSubmission?.status || "draft", language)]].map(([label, value]) => <div key={label} className="border-b border-slate-200 px-5 py-4 sm:border-b-0 sm:border-r dark:border-slate-800"><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{value}</p></div>)}
      </div>
      <div className="border-b border-slate-200 bg-slate-50/70 px-5 py-4 dark:border-slate-800 dark:bg-slate-950/30"><div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center"><div><p className="text-sm font-bold text-slate-800 dark:text-slate-100">{text("ស្ថានភាពទិន្នន័យសម្រាប់ BM", "BM Data Readiness")}</p><p className="text-xs text-slate-500">{text(`កាលបរិច្ឆេទ ${reportDate} · សាខា ${branch || "-"}`, `Date ${reportDate} · Branch ${branch || "-"}`)}</p></div><p className={`text-sm font-semibold ${sourceRecords.length ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"}`}>{sourceRecords.length ? text("របាយការណ៍ LS រួចរាល់សម្រាប់សង្ខេប", "Eligible LS reports are ready for consolidation") : text("មិនទាន់មានរបាយការណ៍ LS ដែលអាចសង្ខេបបាន", "No eligible LS reports for consolidation")}</p></div><div className="mt-3 grid gap-3 sm:grid-cols-2"><div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"><p className="text-xs font-bold text-slate-700 dark:text-slate-200">{text("របាយការណ៍អ្នកឯកទេសផ្ដល់កម្ចី", "Loan Specialist Reports")}</p><div className="mt-2 flex flex-wrap gap-2">{reportStatuses.map((status) => <span key={`ls-${status}`} className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold ${operationReportStatusClass(status)}`}>{operationReportStatusLabel(status, language)}: {statusCount(currentLsReports, status)}</span>)}</div></div><div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"><p className="text-xs font-bold text-slate-700 dark:text-slate-200">{text("របាយការណ៍គណនេយ្យ", "Account Reports")}</p><div className="mt-2 flex flex-wrap gap-2">{reportStatuses.map((status) => <span key={`account-${status}`} className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold ${operationReportStatusClass(status)}`}>{operationReportStatusLabel(status, language)}: {statusCount(currentAccountReports, status)}</span>)}</div></div></div></div>
      <div className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">{awaitingReview || accountAwaitingReview ? text(`ត្រូវពិនិត្យរបាយការណ៍ LS ${awaitingReview} និងគណនេយ្យ ${accountAwaitingReview} មុនពេលដាក់ស្នើ BM Report ទៅថ្នាក់លើ។`, `Review ${awaitingReview} LS and ${accountAwaitingReview} Account Report(s) before submitting the BM Report.`) : sourceRecords.length && accountRecords.length ? text("របាយការណ៍ LS និងគណនេយ្យទាំងអស់បានត្រៀមរួចរាល់សម្រាប់ BM Report។", "All LS and Account Reports are ready for consolidation.") : text(`មិនមានរបាយការណ៍ LS ដែលបានដាក់ស្នើ/ពិនិត្យ/អនុម័តសម្រាប់ ${reportDate} នៅសាខា ${branch || "នេះ"} ទេ។`, `No submitted, reviewed, or approved LS report exists for ${reportDate} at ${branch || "this branch"}.`)}</div>
      {accountReportHistory.length || branchSubmissions.length ? <div className="border-t border-slate-200 dark:border-slate-800"><div className="flex flex-col gap-3 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:bg-slate-950"><div><p className="text-sm font-bold text-slate-700 dark:text-slate-200">{text("តម្រងសម្រាប់ពិនិត្យ", "Review Filters")}</p><p className="text-xs text-slate-500">{text("របាយការណ៍គណនេយ្យសម្រាប់សាខានេះអាចត្រូវបានស្វែងរកតាមថ្ងៃ អ្នករាយការណ៍ និងស្ថានភាព។ តម្រងមិនប្ដូរប្រភព BM Report ទេ។", "Account Reports for this branch can be searched by date, reporter, and status. Filters never change BM Report sources.")}</p></div><button type="button" aria-expanded={showAdvancedFilter} onClick={() => setShowAdvancedFilter((current) => !current)} className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${showAdvancedFilter || activeFilterCount ? "border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300" : "border-slate-300 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"}`}><Filter className="h-4 w-4" />{text("តម្រងកម្រិតខ្ពស់", "Advanced Filter")}{activeFilterCount ? <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-700 px-1.5 text-xs text-white">{activeFilterCount}</span> : null}<ChevronDown className={`h-4 w-4 transition ${showAdvancedFilter ? "rotate-180" : ""}`} /></button></div>{showAdvancedFilter ? <div className="grid gap-3 border-t border-slate-200 p-4 sm:grid-cols-2 lg:grid-cols-3 dark:border-slate-800"><Field label={text("ចាប់ពីថ្ងៃ", "From Date")}><DateInput title={text("ចាប់ពីថ្ងៃ", "From Date")} value={fromDate} max={toDate || undefined} onChange={setFromDate} className={inputClass} /></Field><Field label={text("ដល់ថ្ងៃ", "To Date")}><DateInput title={text("ដល់ថ្ងៃ", "To Date")} value={toDate} min={fromDate || undefined} onChange={setToDate} className={inputClass} /></Field><Field label={text("អ្នករាយការណ៍", "Reporter")}><select value={reporterFilter} onChange={(event) => setReporterFilter(event.target.value)} className={inputClass}><option value="">{text("អ្នករាយការណ៍ទាំងអស់", "All Reporters")}</option>{reporterOptions.map(([username, name]) => <option key={username} value={username}>{name}{name !== username ? ` (${username})` : ""}</option>)}</select></Field><Field label={text("ស្ថានភាព", "Status")}><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "" | OperationReportRecord["status"])} className={inputClass}><option value="">{text("ស្ថានភាពទាំងអស់", "All Statuses")}</option><option value="draft">{operationReportStatusLabel("draft", language)}</option><option value="submitted">{operationReportStatusLabel("submitted", language)}</option><option value="reviewed">{operationReportStatusLabel("reviewed", language)}</option><option value="approved">{operationReportStatusLabel("approved", language)}</option><option value="returned">{operationReportStatusLabel("returned", language)}</option></select></Field><div className="flex items-end"><button type="button" disabled={!activeFilterCount} onClick={() => { setFromDate(""); setToDate(""); setReporterFilter(""); setStatusFilter(""); }} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800"><X className="h-4 w-4" />{text("សម្អាតតម្រង", "Clear Filters")}</button></div></div> : null}</div> : null}
      {accountReportHistory.length ? <div className="max-h-64 overflow-auto border-t border-slate-200 dark:border-slate-800"><div className="bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700 dark:bg-slate-950 dark:text-slate-200">{text("កំណត់ត្រារបាយការណ៍គណនេយ្យសាខា", "Branch Account Report Records")}</div><table className="min-w-[720px] w-full text-left text-sm"><thead className="bg-slate-100 text-slate-600 dark:bg-slate-950 dark:text-slate-300"><tr><th className="px-4 py-3">{text("ថ្ងៃ", "Date")}</th><th className="px-4 py-3">{text("អ្នករាយការណ៍", "Reporter")}</th><th className="px-4 py-3">{text("សាខា", "Branch")}</th><th className="px-4 py-3">{text("ស្ថានភាព", "Status")}</th><th className="px-4 py-3 text-right">{text("សកម្មភាព", "Actions")}</th></tr></thead><tbody>{filteredAccountRecords.length ? filteredAccountRecords.map((record) => <tr key={record.id} className="border-t border-slate-200 dark:border-slate-800"><td className="px-4 py-3 font-semibold">{record.reportDate}</td><td className="px-4 py-3">{record.reporterName || record.reporterUsername}</td><td className="px-4 py-3">{record.branch}</td><td className="px-4 py-3"><span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${operationReportStatusClass(record.status)}`}>{operationReportStatusLabel(record.status, language)}</span></td><td className="px-4 py-3"><div className="flex justify-end gap-2">{record.status === "submitted" ? <button type="button" disabled={Boolean(reviewingAction)} onClick={() => onReviewAccount(record, "reviewed")} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{text("ពិនិត្យ", "Review")}</button> : null}{record.status === "reviewed" ? <button type="button" disabled={Boolean(reviewingAction)} onClick={() => onReviewAccount(record, "approved")} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{text("អនុម័ត", "Approve")}</button> : null}{["submitted", "reviewed"].includes(record.status) ? <button type="button" disabled={Boolean(reviewingAction)} onClick={() => onReviewAccount(record, "returned")} className="rounded-lg border border-red-300 px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-50 dark:text-red-300">{text("ត្រឡប់", "Return")}</button> : null}</div></td></tr>) : <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">{text("មិនមានរបាយការណ៍គណនេយ្យត្រូវនឹងតម្រង", "No Account Reports match the filters.")}</td></tr>}</tbody></table></div> : null}
      {branchSubmissions.length ? <div className="max-h-72 overflow-auto border-t border-slate-200 dark:border-slate-800"><table className="min-w-[820px] w-full text-left text-sm"><thead className="bg-slate-100 text-slate-600 dark:bg-slate-950 dark:text-slate-300"><tr><th className="px-4 py-3">{text("ថ្ងៃ", "Date")}</th><th className="px-4 py-3">{text("អ្នករាយការណ៍ BM", "BM Reporter")}</th><th className="px-4 py-3">{text("សាខា", "Branch")}</th><th className="px-4 py-3 text-center">{text("ប្រភពដែលបានភ្ជាប់", "Linked Sources")}</th><th className="px-4 py-3">{text("ស្ថានភាព", "Status")}</th><th className="px-4 py-3 text-right">{text("សកម្មភាព", "Actions")}</th></tr></thead><tbody>{filteredBranchSubmissions.length ? filteredBranchSubmissions.map((record) => { const ownsRecord = record.reporterUsername === currentUsername; return <tr key={record.id} className="border-t border-slate-200 dark:border-slate-800"><td className="px-4 py-3 font-semibold">{record.reportDate}</td><td className="px-4 py-3">{record.reporterName || record.reporterUsername}</td><td className="px-4 py-3">{record.branch || "-"}</td><td className="px-4 py-3 text-center font-semibold">LS {record.data.sourceReportIds?.length || 0} / Account {record.data.sourceAccountReportIds?.length || 0}</td><td className="px-4 py-3"><span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${operationReportStatusClass(record.status)}`}>{operationReportStatusLabel(record.status, language)}</span></td><td className="px-4 py-3"><div className="flex justify-end gap-2"><button type="button" onClick={() => onOpen(record)} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"><Eye className="h-3.5 w-3.5" />{text("មើល", "View")}</button>{!ownsRecord && record.status === "submitted" ? <button type="button" disabled={Boolean(reviewingAction)} onClick={() => onReview(record, "reviewed")} className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"><Check className="h-3.5 w-3.5" />{text("ពិនិត្យ", "Review")}</button> : null}{!ownsRecord && record.status === "reviewed" ? <button type="button" disabled={Boolean(reviewingAction)} onClick={() => onReview(record, "approved")} className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"><ShieldCheck className="h-3.5 w-3.5" />{text("អនុម័ត", "Approve")}</button> : null}{!ownsRecord && ["submitted", "reviewed"].includes(record.status) ? <button type="button" disabled={Boolean(reviewingAction)} onClick={() => onReview(record, "returned")} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-red-300 px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-50 dark:text-red-300"><XCircle className="h-3.5 w-3.5" />{text("ត្រឡប់", "Return")}</button> : null}</div></td></tr>; }) : <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">{text("មិនមានរបាយការណ៍ BM ត្រូវនឹងតម្រង", "No BM Reports match the filters.")}</td></tr>}</tbody></table></div> : null}
    </section>
  );
}

function OperationMyWorkToday({ loans, report, reportDate, canPrepare, onPrepare, onOpenLoan }: { loans: LoanEntity[]; report?: OperationReportRecord; reportDate: string; canPrepare: boolean; onPrepare: () => void; onOpenLoan: (loan: LoanEntity) => void }) {
  const { language } = useLanguage();
  const text = (km: string, en: string) => language === "km" ? km : en;
  const [expanded, setExpanded] = useState(false);
  const overdue = loans.filter((loan) => String(loan.nextPaymentDate).slice(0, 10) < reportDate);
  const dueToday = loans.filter((loan) => String(loan.nextPaymentDate).slice(0, 10) === reportDate);
  const totalDue = loans.reduce((total, loan) => total + loan.paymentAmount, 0);
  return (
    <section aria-label="My work for selected report date" className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800 sm:flex-row sm:items-center"><div><p className="text-sm font-semibold text-emerald-700">{text("ការងាររបស់ខ្ញុំថ្ងៃនេះ", "My Work Today")}</p><h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{text("ការងារប្រចាំថ្ងៃដែលបានចាត់តាំង", "Assigned Daily Work")}</h2><p className="mt-1 text-sm text-slate-500">{text(`ឥណទានដែលបានចាត់តាំង និងដល់ថ្ងៃបង់ត្រឹម ${reportDate}`, `Assigned loans due on or before ${reportDate}`)}</p></div><div className="flex flex-wrap gap-2"><button type="button" disabled={!canPrepare || !loans.length} onClick={onPrepare} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-45"><RefreshCw className="h-4 w-4" />{text("រៀបចំរបាយការណ៍ពីឥណទាន", "Prepare from Loans")}</button><button type="button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">{expanded ? text("លាក់", "Hide") : text("បង្ហាញ", "Show")}<ChevronDown className={`h-4 w-4 transition ${expanded ? "rotate-180" : ""}`} /></button></div></div>
      {expanded ? <><div className="grid border-b border-slate-200 sm:grid-cols-2 xl:grid-cols-4 dark:border-slate-800">
        <div className="border-b border-slate-200 px-5 py-4 sm:border-r xl:border-b-0 dark:border-slate-800"><p className="text-xs font-semibold text-slate-500">{text("ដល់ថ្ងៃបង់", "Due Today")}</p><p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{dueToday.length}</p></div>
        <div className="border-b border-slate-200 px-5 py-4 sm:border-r xl:border-b-0 dark:border-slate-800"><p className="text-xs font-semibold text-slate-500">{text("ហួសកំណត់", "Overdue")}</p><p className="mt-1 text-2xl font-bold text-red-700">{overdue.length}</p></div>
        <div className="border-b border-slate-200 px-5 py-4 sm:border-r xl:border-b-0 dark:border-slate-800"><p className="text-xs font-semibold text-slate-500">{text("ប្រាក់ត្រូវបង់", "Installments Due")}</p><p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{operationCurrency(totalDue)}</p></div>
        <div className="px-5 py-4"><p className="text-xs font-semibold text-slate-500">{text("របាយការណ៍ប្រចាំថ្ងៃ", "Daily Report")}</p><span className={`mt-2 inline-flex rounded-md px-2 py-1 text-xs font-semibold ${operationReportStatusClass(report?.status || "draft")}`}>{report ? operationReportStatusLabel(report.status, language) : text("មិនទាន់រក្សាទុក", "Not Saved")}</span></div>
      </div>
      {loans.length ? <div className="max-h-72 overflow-auto"><table className="min-w-[900px] w-full text-left text-sm"><thead className="sticky top-0 z-10 bg-slate-100 text-slate-600 dark:bg-slate-950 dark:text-slate-300"><tr><th className="px-4 py-3">{text("ថ្ងៃបង់", "Payment Date")}</th><th className="px-4 py-3">{text("អតិថិជន", "Customer")}</th><th className="px-4 py-3">{text("សាខា", "Branch")}</th><th className="px-4 py-3 text-right">{text("ប្រាក់ត្រូវបង់", "Installment")}</th><th className="px-4 py-3">{text("អាទិភាព", "Priority")}</th><th className="w-24 px-4 py-3 text-center">{text("លម្អិត", "Details")}</th></tr></thead><tbody>{loans.map((loan) => { const days = Math.max(0, Math.round((new Date(`${reportDate}T00:00:00`).getTime() - new Date(`${loan.nextPaymentDate!.slice(0, 10)}T00:00:00`).getTime()) / 86_400_000)); return <tr key={loan.id} className="border-t border-slate-200 dark:border-slate-800"><td className="whitespace-nowrap px-4 py-3 font-semibold">{loan.nextPaymentDate?.slice(0, 10)}</td><td className="px-4 py-3"><p className="font-semibold text-slate-900 dark:text-white">{loan.borrower.fullName}</p><p className="text-xs text-slate-500">{loan.loanNumber || loan.loanType}</p></td><td className="px-4 py-3 text-slate-600 dark:text-slate-300">{loan.branchLocation || "-"}</td><td className="px-4 py-3 text-right font-semibold">{operationCurrency(loan.paymentAmount)}</td><td className={`px-4 py-3 font-semibold ${days ? "text-red-700" : "text-amber-700"}`}>{days ? text(`ហួសកំណត់ ${days} ថ្ងៃ`, `${days} day(s) overdue`) : text("ដល់ថ្ងៃបង់", "Due today")}</td><td className="px-4 py-3 text-center"><button type="button" onClick={() => onOpenLoan(loan)} title={`${text("មើល", "View")} ${loan.borrower.fullName}`} aria-label={`${text("មើល", "View")} ${loan.borrower.fullName}`} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/30"><Eye className="h-4 w-4" /></button></td></tr>; })}</tbody></table></div> : <div className="px-5 py-8 text-center text-sm text-slate-500">{text("គ្មានឥណទានដល់ថ្ងៃបង់ ឬហួសកំណត់ដែលបានចាត់តាំងសម្រាប់ថ្ងៃនេះ", "No assigned due or overdue loans for this date.")}</div>}</> : null}
    </section>
  );
}

function OperationReportRecordsDashboard({ records, loading, currentUsername, canManageReports, canDeleteReports, deletingReportId, onCreate, onView, onEdit, onDelete }: { records: OperationReportRecord[]; loading: boolean; currentUsername: string; canManageReports: boolean; canDeleteReports: boolean; deletingReportId: string | null; onCreate: () => void; onView: (record: OperationReportRecord) => void; onEdit: (record: OperationReportRecord) => void; onDelete: (record: OperationReportRecord) => void }) {
  const { language } = useLanguage();
  const { success: toastSuccess, error: toastError } = useToast();
  const text = (km: string, en: string) => language === "km" ? km : en;
  const [query, setQuery] = useState("");
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [specialist, setSpecialist] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [positionFilter, setPositionFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | OperationReportRecord["status"]>("");
  const [reportPeriod, setReportPeriod] = useState<"all" | "daily" | "monthly" | "yearly">("all");
  const [periodValue, setPeriodValue] = useState("");
  const [exportingHistory, setExportingHistory] = useState(false);
  const specialistOptions = useMemo(() => Array.from(new Map(records.map((record) => [record.reporterUsername, record.reporterName || record.reporterUsername])).entries()).sort((a, b) => a[1].localeCompare(b[1])), [records]);
  const branchOptions = useMemo(() => Array.from(new Set(records.map((record) => record.branch).filter(Boolean))).sort(), [records]);
  const departmentOptions = useMemo(() => Array.from(new Set(records.map((record) => record.department).filter(Boolean))).sort(), [records]);
  const positionOptions = useMemo(() => Array.from(new Set(records.map((record) => record.reporterPosition).filter(Boolean))).sort(), [records]);
  const yearOptions = useMemo(() => Array.from(new Set([String(new Date().getFullYear()), ...records.map((record) => record.reportDate.slice(0, 4))])).filter(Boolean).sort((left, right) => right.localeCompare(left)), [records]);
  const filtered = useMemo(() => {
    const search = query.trim().toLocaleLowerCase();
    return records.filter((record) => {
      const matchesSearch = !search || `${record.reportDate} ${record.reporterName} ${record.reporterUsername} ${record.reporterPosition} ${record.branch} ${record.department} ${record.status}`.toLocaleLowerCase().includes(search);
      const matchesPeriod = reportPeriod === "all" || !periodValue
        || (reportPeriod === "daily" && record.reportDate === periodValue)
        || (reportPeriod === "monthly" && record.reportDate.startsWith(`${periodValue}-`))
        || (reportPeriod === "yearly" && record.reportDate.startsWith(`${periodValue}-`));
      return matchesSearch
        && matchesPeriod
        && (!fromDate || record.reportDate >= fromDate)
        && (!toDate || record.reportDate <= toDate)
        && (!specialist || record.reporterUsername === specialist)
        && (!branchFilter || record.branch === branchFilter)
        && (!departmentFilter || record.department === departmentFilter)
        && (!positionFilter || record.reporterPosition === positionFilter)
        && (!statusFilter || record.status === statusFilter);
    });
  }, [branchFilter, departmentFilter, fromDate, periodValue, positionFilter, query, records, reportPeriod, specialist, statusFilter, toDate]);
  const advancedFilterCount = [reportPeriod !== "all" ? reportPeriod : "", fromDate, toDate, specialist, branchFilter, departmentFilter, positionFilter, statusFilter].filter(Boolean).length;
  const changeReportPeriod = (period: "all" | "daily" | "monthly" | "yearly") => {
    const today = operationDateInputValue();
    setReportPeriod(period);
    setPeriodValue(period === "daily" ? today : period === "monthly" ? today.slice(0, 7) : period === "yearly" ? today.slice(0, 4) : "");
  };
  const clearAdvancedSearch = () => {
    setReportPeriod("all");
    setPeriodValue("");
    setFromDate("");
    setToDate("");
    setSpecialist("");
    setBranchFilter("");
    setDepartmentFilter("");
    setPositionFilter("");
    setStatusFilter("");
  };
  const submitted = filtered.filter((record) => record.status === "submitted").length;
  const specialists = new Set(filtered.map((record) => record.reporterUsername)).size;
  const today = operationDateInputValue();
  const todayReports = filtered.filter((record) => record.reportDate === today).length;
  const rowCount = (record: OperationReportRecord, key: Exclude<keyof OperationReportSavedData, "sourceReportIds" | "sourceAccountReportIds">) => (record.data[key] || []).filter((row) => row.customer.trim()).length;
  const periodLabel = reportPeriod === "daily" ? periodValue || "daily"
    : reportPeriod === "monthly" ? periodValue || "monthly"
      : reportPeriod === "yearly" ? periodValue || "yearly"
        : fromDate || toDate ? `${fromDate || "start"}-to-${toDate || "end"}` : "all-reports";
  const exportHistory = async () => {
    if (!filtered.length) { toastError(text("មិនមានរបាយការណ៍សម្រាប់នាំចេញទេ។", "There are no matching reports to export.")); return; }
    setExportingHistory(true);
    try {
      const { exportLsReportHistoryExcel } = await import("@/systems/loan/utils/exportReportHistoryExcel");
      await exportLsReportHistoryExcel(filtered, periodLabel);
      toastSuccess(text("បាននាំចេញរបាយការណ៍ LS ទៅ Excel។", "LS Reports exported to Excel."));
    } catch (caught) {
      toastError(caught instanceof Error ? caught.message : "Could not export LS Reports");
    } finally {
      setExportingHistory(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-sm font-semibold text-emerald-700">{canManageReports ? text("អ្នកឯកទេសផ្ដល់កម្ចីទាំងអស់", "All Loan Specialists") : text("របាយការណ៍របស់ខ្ញុំ", "My LS Reports")}</p><h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{text("កំណត់ត្រារបាយការណ៍ LS ប្រចាំថ្ងៃ / ខែ / ឆ្នាំ", "Daily / Monthly / Yearly LS Report Records")}</h2></div>
        <button type="button" onClick={onCreate} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700"><FilePlus2 className="h-4 w-4" />{text("របាយការណ៍ថ្មី", "New Report")}</button>
      </div>
      <div className="grid border-b border-slate-200 sm:grid-cols-2 xl:grid-cols-4 dark:border-slate-800">
        {[[text("កំណត់ត្រាសរុប", "Total Records"), filtered.length], [text("បានដាក់ស្នើ", "Submitted"), submitted], [text("អ្នកឯកទេសផ្កល់កម្ចី", "Loan Specialists"), specialists], [text("បានរាយការណ៍ថ្ងៃនេះ", "Reported Today"), todayReports]].map(([label, value]) => <div key={label} className="border-b border-slate-200 px-5 py-4 last:border-b-0 sm:border-r xl:border-b-0 dark:border-slate-800"><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{value}</p></div>)}
      </div>
      <div className="border-b border-slate-200 dark:border-slate-800">
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={text("ស្វែងរកកាលបរិច្ឆេទ ឈ្មោះ មុខតំណែង សាខា នាយកដ្ឋាន ឬស្ថានភាព", "Search date, specialist, position, branch, department, or status")} className={`${inputClass} pl-10`} /></div>
          <button type="button" disabled={exportingHistory || !filtered.length} onClick={() => void exportHistory()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">{exportingHistory ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}{text("នាំចេញ Excel", "Export Excel")}</button><button type="button" aria-expanded={showAdvancedSearch} onClick={() => setShowAdvancedSearch((current) => !current)} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition ${showAdvancedSearch || advancedFilterCount ? "border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"}`}><Filter className="h-4 w-4" />{text("ស្វែងរកកម្រិតខ្ពស់", "Advanced Search")}{advancedFilterCount ? <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-700 px-1.5 text-xs text-white">{advancedFilterCount}</span> : null}<ChevronDown className={`h-4 w-4 transition ${showAdvancedSearch ? "rotate-180" : ""}`} /></button>
        </div>
        {showAdvancedSearch ? <div className="grid gap-3 border-t border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/40 sm:grid-cols-2 lg:grid-cols-4">
          <Field label={text("ប្រភេទរយៈពេល", "Report Period")}><select value={reportPeriod} onChange={(event) => changeReportPeriod(event.target.value as "all" | "daily" | "monthly" | "yearly")} className={inputClass}><option value="all">{text("របាយការណ៍ទាំងអស់", "All Reports")}</option><option value="daily">{text("របាយការណ៍ប្រចាំថ្ងៃ", "Daily Report")}</option><option value="monthly">{text("របាយការណ៍ប្រចាំខែ", "Monthly Report")}</option><option value="yearly">{text("របាយការណ៍ប្រចាំឆ្នាំ", "Yearly Report")}</option></select></Field>
          {reportPeriod === "daily" ? <Field label={text("ជ្រើសរើសថ្ងៃ", "Select Day")}><DateInput title={text("ជ្រើសរើសថ្ងៃ", "Select Day")} value={periodValue} onChange={setPeriodValue} className={inputClass} /></Field> : null}
          {reportPeriod === "monthly" ? <Field label={text("ជ្រើសរើសខែ", "Select Month")}><DateInput type="month" title={text("ជ្រើសរើសខែ", "Select Month")} value={periodValue} onChange={setPeriodValue} className={inputClass} /></Field> : null}
          {reportPeriod === "yearly" ? <Field label={text("ជ្រើសរើសឆ្នាំ", "Select Year")}><select value={periodValue} onChange={(event) => setPeriodValue(event.target.value)} className={inputClass}>{yearOptions.map((year) => <option key={year} value={year}>{year}</option>)}</select></Field> : null}
          <Field label={text("ចាប់ពីថ្ងៃ", "From Date")}><DateInput title={text("ចាប់ពីថ្ងៃ", "From Date")} value={fromDate} max={toDate || undefined} onChange={setFromDate} className={inputClass} /></Field>
          <Field label={text("ដល់ថ្ងៃ", "To Date")}><DateInput title={text("ដល់ថ្ងៃ", "To Date")} value={toDate} min={fromDate || undefined} onChange={setToDate} className={inputClass} /></Field>
          <Field label={text("អ្នកឯកទេសផ្កល់កម្ចី", "Loan Specialist")}><select value={specialist} onChange={(event) => setSpecialist(event.target.value)} className={inputClass}><option value="">{text("អ្នកឯកទេសទាំងអស់", "All Specialists")}</option>{specialistOptions.map(([username, name]) => <option key={username} value={username}>{name}{name !== username ? ` (${username})` : ""}</option>)}</select></Field>
          <Field label={text("ស្ថានភាព", "Status")}><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "" | OperationReportRecord["status"])} className={inputClass}><option value="">{text("ស្ថានភាពទាំងអស់", "All Statuses")}</option><option value="draft">{operationReportStatusLabel("draft", language)}</option><option value="submitted">{operationReportStatusLabel("submitted", language)}</option><option value="reviewed">{operationReportStatusLabel("reviewed", language)}</option><option value="approved">{operationReportStatusLabel("approved", language)}</option><option value="returned">{operationReportStatusLabel("returned", language)}</option></select></Field>
          <Field label={text("សាខា", "Branch")}><select value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)} className={inputClass}><option value="">{text("សាខាទាំងអស់", "All Branches")}</option>{branchOptions.map((branch) => <option key={branch} value={branch}>{branch}</option>)}</select></Field>
          <Field label={text("នាយកដ្ឋាន", "Department")}><select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)} className={inputClass}><option value="">{text("នាយកដ្ឋានទាំងអស់", "All Departments")}</option>{departmentOptions.map((department) => <option key={department} value={department}>{department}</option>)}</select></Field>
          <Field label={text("មុខតំណែង", "Position")}><select value={positionFilter} onChange={(event) => setPositionFilter(event.target.value)} className={inputClass}><option value="">{text("មុខតំណែងទាំងអស់", "All Positions")}</option>{positionOptions.map((position) => <option key={position} value={position}>{position}</option>)}</select></Field>
          <div className="flex items-end justify-between gap-3"><p className="pb-3 text-sm text-slate-500"><strong className="text-slate-900 dark:text-white">{filtered.length}</strong> {text(`ក្នុងចំណោម ${records.length} កំណត់ត្រា`, `of ${records.length} records`)}</p><button type="button" disabled={!advancedFilterCount} onClick={clearAdvancedSearch} className="mb-0.5 inline-flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800"><X className="h-4 w-4" />{text("សម្អាត", "Clear")}</button></div>
        </div> : null}
      </div>
      <div className="max-h-96 overflow-x-auto overflow-y-auto overscroll-x-contain">
        <table className="min-w-[920px] w-full text-left text-sm">
          <thead className="sticky top-0 z-10 bg-slate-100 text-slate-600 dark:bg-slate-950 dark:text-slate-300"><tr><th className="px-4 py-3">{text("ថ្ងៃ", "Date")}</th><th className="px-4 py-3">{text("អ្នកឯកទេសផ្កល់កម្ចី", "Loan Specialist")}</th><th className="px-4 py-3">{text("សាខា", "Branch")}</th><th className="px-4 py-3 text-center">{text("ត្រូវបង់", "Due")}</th><th className="px-4 py-3 text-center">{text("បានបង់", "Paid")}</th><th className="px-4 py-3 text-center">{text("សំណើ", "Requests")}</th><th className="px-4 py-3">{text("ស្ថានភាព", "Status")}</th><th className="min-w-32 px-3 py-3 text-right sm:min-w-56 sm:px-4">{text("សកម្មភាព", "Actions")}</th></tr></thead>
          <tbody>{loading ? <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-500"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />{text("កំពុងផ្ទុកកំណត់ត្រា...", "Loading records...")}</td></tr> : filtered.length ? filtered.map((record) => {
            const ownsRecord = record.reporterUsername.trim().toLocaleLowerCase() === currentUsername.trim().toLocaleLowerCase();
            const canEdit = ownsRecord && ["draft", "returned"].includes(record.status);
            const canDelete = canDeleteReports;
            const canOpen = ownsRecord || canManageReports;
            const reviewing = canManageReports && !ownsRecord;
            const openLabel = canEdit ? text("កែសម្រួល និងធ្វើបច្ចុប្បន្នភាព", "Edit and update report") : reviewing ? text("ពិនិត្យ និងធ្វើបច្ចុប្បន្នភាពស្ថានភាព", "Review and update status") : text("មើលរបាយការណ៍របស់អ្នក", "View your report");
            const deleteLabel = text("លុបរបាយការណ៍", "Delete report");
            return <tr key={record.id} className="border-t border-slate-200 dark:border-slate-800"><td className="whitespace-nowrap px-4 py-3 font-semibold">{record.reportDate}</td><td className="px-4 py-3"><p className="font-semibold text-slate-900 dark:text-white">{record.reporterName || record.reporterUsername}</p><p className="text-xs text-slate-500">{record.reporterPosition}</p></td><td className="px-4 py-3 text-slate-600 dark:text-slate-300">{record.branch || "-"}</td><td className="px-4 py-3 text-center font-semibold">{rowCount(record, "collectionDueRows")}</td><td className="px-4 py-3 text-center font-semibold">{rowCount(record, "collectionPaidRows")}</td><td className="px-4 py-3 text-center font-semibold">{rowCount(record, "requestedRows")}</td><td className="px-4 py-3"><span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${operationReportStatusClass(record.status)}`}>{operationReportStatusLabel(record.status, language)}</span></td><td className="px-3 py-3 sm:px-4"><div className="flex flex-nowrap justify-end gap-2"><button type="button" disabled={!canOpen} onClick={() => onEdit(record)} title={openLabel} aria-label={openLabel} className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400 sm:px-3 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300 dark:disabled:border-slate-800 dark:disabled:bg-slate-900 dark:disabled:text-slate-600">{canEdit || reviewing ? <Pencil className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}<span className="hidden sm:inline">{reviewing ? text("ពិនិត្យ/ធ្វើបច្ចុប្បន្នភាព", "Review / Update") : canEdit ? text("កែ/ធ្វើបច្ចុប្បន្នភាព", "Edit / Update") : text("មើល", "View")}</span></button><button type="button" disabled={!canDelete || deletingReportId === record.id} onClick={() => onDelete(record)} title={deleteLabel} aria-label={deleteLabel} className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white p-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 sm:px-3 dark:border-red-900 dark:bg-slate-950 dark:text-red-300 dark:disabled:border-slate-800 dark:disabled:bg-slate-900 dark:disabled:text-slate-600">{deletingReportId === record.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}<span className="hidden sm:inline">{text("លុប", "Delete")}</span></button></div></td></tr>;
          }) : <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-500">{text("រកមិនឃើញរបាយការណ៍ដែលបានរក្សាទុក", "No saved reports found.")}</td></tr>}</tbody>
        </table>
      </div>
    </section>
  );
}

function PaymentDateAlerts({ loans, canViewLoanData, onOpenLoan }: { loans: LoanEntity[]; canViewLoanData: boolean; onOpenLoan: (loan: LoanEntity) => void }) {
  const { language } = useLanguage();
  const text = (km: string, en: string) => language === "km" ? km : en;
  const [expanded, setExpanded] = useState(false);
  const today = new Date(`${operationDateInputValue()}T00:00:00`).getTime();
  const alerts = useMemo(() => loans.flatMap((loan) => {
    if (!loan.nextPaymentDate || loan.repaymentStatus === "Closed" || loan.repaymentStatus === "Rejected") return [];
    const due = new Date(`${loan.nextPaymentDate.slice(0, 10)}T00:00:00`).getTime();
    const days = Math.round((due - today) / 86_400_000);
    return days <= 7 ? [{ loan, days }] : [];
  }).sort((a, b) => a.days - b.days), [loans, today]);
  const overdue = alerts.filter((alert) => alert.days < 0).length;
  const dueToday = alerts.filter((alert) => alert.days === 0).length;
  const upcoming = alerts.filter((alert) => alert.days > 0).length;

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800"><div><p className="text-sm font-semibold text-red-700">{text("ការតាមដានការបង់ប្រាក់", "Payment Monitoring")}</p><h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{text("ការជូនដំណឹងថ្ងៃបង់ប្រាក់", "Payment Date Alerts")}</h2></div><button type="button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">{expanded ? text("លាក់", "Hide") : text("បង្ហាញ", "Show")}<ChevronDown className={`h-4 w-4 transition ${expanded ? "rotate-180" : ""}`} /></button></div>
      {expanded ? <><div className="grid border-b border-slate-200 sm:grid-cols-3 dark:border-slate-800">{[[text("ហួសកំណត់", "Overdue"), overdue, "text-red-700"], [text("ដល់ថ្ងៃបង់", "Due Today"), dueToday, "text-amber-700"], [text("៧ថ្ងៃបន្ទាប់", "Next 7 Days"), upcoming, "text-emerald-700"]].map(([label, value, color]) => <div key={label} className="border-b border-slate-200 px-5 py-4 last:border-b-0 sm:border-b-0 sm:border-r dark:border-slate-800"><p className="text-xs font-semibold text-slate-500">{label}</p><p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p></div>)}</div>
      {!canViewLoanData ? <div className="px-5 py-8 text-center text-sm text-slate-500">{text("ត្រូវការសិទ្ធិមើលឥណទានដើម្បីមើលការជូនដំណឹង", "Loan-view permission is required for payment alerts.")}</div> : <div className="max-h-80 overflow-auto"><table className="min-w-[920px] w-full text-left text-sm"><thead className="sticky top-0 bg-slate-100 text-slate-600 dark:bg-slate-950 dark:text-slate-300"><tr><th className="px-4 py-3">{text("ថ្ងៃបង់", "Payment Date")}</th><th className="px-4 py-3">{text("អតិថិជន", "Client")}</th><th className="px-4 py-3">{text("អ្នកឯកទេសផ្កល់កម្ចី", "Loan Specialist")}</th><th className="px-4 py-3 text-right">{text("ប្រាក់នៅសល់", "Outstanding")}</th><th className="px-4 py-3">{text("ការជូនដំណឹង", "Alert")}</th><th className="w-24 px-4 py-3 text-center">{text("លម្អិត", "Details")}</th></tr></thead><tbody>{alerts.length ? alerts.map(({ loan, days }) => <tr key={loan.id} className="border-t border-slate-200 dark:border-slate-800"><td className="px-4 py-3 font-semibold">{loan.nextPaymentDate?.slice(0, 10)}</td><td className="px-4 py-3"><p className="font-semibold text-slate-900 dark:text-white">{loan.borrower.fullName}</p><p className="text-xs text-slate-500">{loan.loanNumber || loan.loanType}</p></td><td className="px-4 py-3 text-slate-600 dark:text-slate-300">{loan.loanContacts.loanSpecialist || loan.loanOfficer || "-"}</td><td className="px-4 py-3 text-right font-semibold">{operationCurrency(loan.outstandingBalance)}</td><td className="px-4 py-3"><span className={`font-semibold ${days < 0 ? "text-red-700" : days === 0 ? "text-amber-700" : "text-emerald-700"}`}>{days < 0 ? text(`ហួសកំណត់ ${Math.abs(days)} ថ្ងៃ`, `${Math.abs(days)} day(s) overdue`) : days === 0 ? text("ដល់ថ្ងៃបង់", "Due today") : text(`ដល់ថ្ងៃបង់ក្នុង ${days} ថ្ងៃ`, `Due in ${days} day(s)`)}</span></td><td className="px-4 py-3 text-center"><button type="button" onClick={() => onOpenLoan(loan)} title={`${text("មើល", "View")} ${loan.borrower.fullName}`} aria-label={`${text("មើល", "View")} ${loan.borrower.fullName}`} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/30"><Eye className="h-4 w-4" /></button></td></tr>) : <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">{text("គ្មានការបង់ប្រាក់ហួសកំណត់ ឬត្រូវបង់ក្នុង ៧ថ្ងៃបន្ទាប់", "No overdue or upcoming payments in the next 7 days.")}</td></tr>}</tbody></table></div>}
      </> : null}
    </section>
  );
}

function OperationSummaryTable({ dueCount, paidCount, collectionRate, followUpRows, formalNoticeRows, requestedRows, approvedRows, rejectedRows }: { dueCount: number; paidCount: number; collectionRate: number; followUpRows: OperationReportResolutionRow[]; formalNoticeRows: OperationReportResolutionRow[]; requestedRows: OperationReportLoanDecisionRow[]; approvedRows: OperationReportLoanDecisionRow[]; rejectedRows: OperationReportLoanDecisionRow[] }) {
  const { language } = useLanguage();
  const text = (km: string, en: string) => language === "km" ? km : en;
  const resolutionCount = (rows: OperationReportResolutionRow[]) => rows.filter((row) => row.customer.trim()).length;
  const decisionCount = (rows: OperationReportLoanDecisionRow[]) => rows.filter((row) => row.customer.trim()).length;
  const decisionTotal = (rows: OperationReportLoanDecisionRow[]) => rows.reduce((sum, row) => sum + operationNumber(row.amount), 0);
  const toResolveCount = resolutionCount(followUpRows);
  const resolvedCount = resolutionCount(formalNoticeRows);
  const resolutionRate = toResolveCount ? Math.round((resolvedCount / toResolveCount) * 100) : null;
  const loanRows: Array<[string, number, string]> = [
    [text("ចំនួនឯកសារស្នើឥណទានដាក់ចូល", "Loan Applications Submitted"), decisionCount(requestedRows), decisionTotal(requestedRows) ? operationCurrency(decisionTotal(requestedRows)) : "-"],
    [text("ចំនួនឥណទានបានអនុម័ត", "Loans Approved"), decisionCount(approvedRows), decisionTotal(approvedRows) ? operationCurrency(decisionTotal(approvedRows)) : "-"],
    [text("ចំនួនឥណទានបដិសេធ", "Loans Rejected"), decisionCount(rejectedRows), decisionTotal(rejectedRows) ? operationCurrency(decisionTotal(rejectedRows)) : "-"],
  ];
  const totalLoanCount = loanRows.reduce((sum, row) => sum + row[1], 0);
  const totalLoanAmount = decisionTotal(requestedRows) + decisionTotal(approvedRows) + decisionTotal(rejectedRows);

  return (
    <section aria-label="Operation Report summary">
      <table className="w-full table-fixed border-collapse text-sm [&_td]:border [&_td]:border-slate-300 [&_th]:border [&_th]:border-slate-300 dark:[&_td]:border-slate-700 dark:[&_th]:border-slate-700">
        <thead className="bg-[#087323] text-white"><tr><th className="px-3 py-3 text-center">{text("ការប្រមូល និង ដោះស្រាយ", "Collection & Resolution")}</th><th className="w-64 px-3 py-3 text-center">{text("ចំនួនប្រមូល (នាក់)", "Collected Customers")}</th><th className="w-64 px-3 py-3 text-center">{text("ចំនួនដោះស្រាយ (នាក់)", "Resolved Customers")}</th></tr></thead>
        <tbody><tr><td className="px-3 py-3 font-semibold">{text("អតិថិជនប្រមូល និងដោះស្រាយសរុប", "Total Customers for Collection & Resolution")}</td><td className="px-3 py-3 text-center font-bold">{dueCount}</td><td className="px-3 py-3 text-center font-bold">{toResolveCount}</td></tr><tr><td className="px-3 py-3 font-semibold">{text("ចំនួនអតិថិជនដែលប្រមូល និងដោះស្រាយបាន", "Customers Collected & Resolved")}</td><td className="px-3 py-3 text-center font-bold">{paidCount}</td><td className="px-3 py-3 text-center font-bold">{resolvedCount}</td></tr><tr><td className="px-3 py-3 font-semibold">{text("អត្រាប្រមូលចូលគិតជាភាគរយ", "Collection & Resolution Rate")}</td><td className="px-3 py-3 text-center font-bold">{dueCount ? `${collectionRate}%` : "0%"}</td><td className="px-3 py-3 text-center font-bold">{resolutionRate === null ? "0%" : `${resolutionRate}%`}</td></tr></tbody>
        <thead className="bg-[#087323] text-white"><tr><th className="px-3 py-3 text-center">{text("ការចេញឥណទាន", "Loan Issuance")}</th><th className="w-64 px-3 py-3 text-center">{text("ចំនួន (នាក់)", "Count")}</th><th className="w-64 px-3 py-3 text-center">{text("ជាសាច់ប្រាក់ (សរុបគិតជាដុល្លារ)", "Total Amount ($)")}</th></tr></thead>
        <tbody>{loanRows.map(([label, count, amount]) => <tr key={label}><td className="px-3 py-3 font-semibold">{label}</td><td className="px-3 py-3 text-center font-bold">{count}</td><td className="px-3 py-3 text-right font-semibold tabular-nums">{amount}</td></tr>)}</tbody>
        <tfoot className="border-y-2 border-double border-slate-900 bg-slate-100 font-bold text-red-700 dark:bg-slate-800"><tr><td className="px-3 py-3 text-center">{text("សរុប", "Total")}</td><td className="px-3 py-3 text-center">{totalLoanCount}</td><td className="px-3 py-3 text-right tabular-nums">{totalLoanAmount ? operationCurrency(totalLoanAmount) : "-"}</td></tr></tfoot>
      </table>
    </section>
  );
}

function branchManagerStaffPerformance(records: OperationReportRecord[]) {
  const grouped = new Map<string, { name: string; requested: number; approved: number; collected: number; rejected: number; contacts: number }>();
  records.forEach((record) => {
    const key = record.reporterUsername || record.reporterName;
    const current = grouped.get(key) || { name: record.reporterName || record.reporterUsername, requested: 0, approved: 0, collected: 0, rejected: 0, contacts: 0 };
    current.requested += (record.data.requestedRows || []).reduce((sum, row) => sum + operationNumber(row.amount), 0);
    current.approved += (record.data.approvedRows || []).reduce((sum, row) => sum + operationNumber(row.amount), 0);
    current.collected += (record.data.collectionPaidRows || []).reduce((sum, row) => sum + operationNumber(row.amount), 0);
    current.rejected += (record.data.rejectedRows || []).reduce((sum, row) => sum + operationNumber(row.amount), 0);
    current.contacts += (record.data.collectionDueRows || []).filter((row) => row.customer.trim()).length;
    grouped.set(key, current);
  });
  return Array.from(grouped.values()).sort((left, right) => right.requested - left.requested || left.name.localeCompare(right.name));
}

function BranchManagerSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="bg-[#087323] px-3 py-3 text-lg font-bold text-white">{title}</h2>
      {children}
    </section>
  );
}

function BranchManagerDashboardReport({ records, monthRecords, yearRecords, accountRecords, monthAccountRecords, yearAccountRecords, loans, reportDate }: { records: OperationReportRecord[]; monthRecords: OperationReportRecord[]; yearRecords: OperationReportRecord[]; accountRecords: AccountReportRecord[]; monthAccountRecords: AccountReportRecord[]; yearAccountRecords: AccountReportRecord[]; loans: LoanEntity[]; reportDate: string }) {
  const { language } = useLanguage();
  const text = (km: string, en: string) => language === "km" ? km : en;
  const [viewPeriod, setViewPeriod] = useState<"daily" | "monthly" | "yearly">("daily");
  const staffRows = branchManagerStaffPerformance(records);
  const approvedAmount = staffRows.reduce((sum, row) => sum + row.approved, 0);
  const monthStaffRows = branchManagerStaffPerformance(monthRecords);
  const monthApprovedAmount = monthStaffRows.reduce((sum, row) => sum + row.approved, 0);
  const approvedCustomers = records.reduce((sum, record) => sum + (record.data.approvedRows || []).filter((row) => row.customer.trim()).length, 0);
  const monthApprovedCustomers = monthRecords.reduce((sum, record) => sum + (record.data.approvedRows || []).filter((row) => row.customer.trim()).length, 0);
  const accountCount = (items: AccountReportRecord[], key: keyof Pick<AccountReportSavedData, "dueRows" | "paidRows" | "dueNoticeRows" | "promiseRows" | "closedRows">) => items.reduce((sum, record) => sum + (record.data[key] || []).filter((row) => row.customer.trim()).length, 0);
  const accountAmount = (items: AccountReportRecord[], key: "paidRows") => items.reduce((sum, record) => sum + (record.data[key] || []).reduce((rowSum, row) => rowSum + accountNumber(row.amount), 0), 0);
  const dueCustomers = accountCount(accountRecords, "dueRows");
  const paidCustomers = accountCount(accountRecords, "paidRows");
  const monthDueCustomers = accountCount(monthAccountRecords, "dueRows");
  const monthPaidCustomers = accountCount(monthAccountRecords, "paidRows");
  const collectedAmount = accountAmount(accountRecords, "paidRows");
  const monthCollectedAmount = accountAmount(monthAccountRecords, "paidRows");
  const outstanding = loans.filter((loan) => !["Closed", "Rejected", "Draft"].includes(loan.repaymentStatus)).reduce((sum, loan) => sum + loan.outstandingBalance, 0);
  const overdueLoans = loans.filter((loan) => loan.nextPaymentDate && loan.nextPaymentDate.slice(0, 10) < reportDate && !["Closed", "Rejected"].includes(loan.repaymentStatus));
  const overdueOutstanding = overdueLoans.reduce((sum, loan) => sum + loan.outstandingBalance, 0);
  const overdue30Outstanding = overdueLoans.filter((loan) => Math.floor((new Date(`${reportDate}T00:00:00Z`).getTime() - new Date(`${loan.nextPaymentDate!.slice(0, 10)}T00:00:00Z`).getTime()) / 86_400_000) > 30).reduce((sum, loan) => sum + loan.outstandingBalance, 0);
  const actionLoans = [
    ...loans.filter((loan) => loan.nextPaymentDate && loan.nextPaymentDate.slice(0, 10) <= reportDate && !["Closed", "Rejected"].includes(loan.repaymentStatus)),
    ...accountRecords.flatMap((record) => [...(record.data.dueNoticeRows || []), ...(record.data.promiseRows || []), ...(record.data.closedRows || [])].filter((row) => row.customer.trim()).map((row, index) => ({ id: `account-action-${record.id}-${index}`, nextPaymentDate: reportDate, borrower: { fullName: row.customer }, outstandingBalance: accountNumber(row.principal), loanContacts: { loanSpecialist: record.reporterName }, loanOfficer: record.reporterName, repaymentStatus: "Active" }))),
  ].slice(0, 8);
  const collectionRate = dueCustomers ? paidCustomers / dueCustomers : 0;
  const monthCollectionRate = monthDueCustomers ? monthPaidCustomers / monthDueCustomers : 0;
  const par1 = outstanding ? overdueOutstanding / outstanding : 0;
  const par30 = outstanding ? overdue30Outstanding / outstanding : 0;
  const dueNoticeCount = accountCount(accountRecords, "dueNoticeRows");
  const followUpCount = accountCount(accountRecords, "promiseRows");
  const formalNoticeCount = accountCount(accountRecords, "closedRows");
  const monthDueNoticeCount = accountCount(monthAccountRecords, "dueNoticeRows");
  const monthFollowUpCount = accountCount(monthAccountRecords, "promiseRows");
  const monthFormalNoticeCount = accountCount(monthAccountRecords, "closedRows");
  const periodRecords = viewPeriod === "daily" ? records : viewPeriod === "monthly" ? monthRecords : yearRecords;
  const periodAccountRecords = viewPeriod === "daily" ? accountRecords : viewPeriod === "monthly" ? monthAccountRecords : yearAccountRecords;
  const periodStaffRows = branchManagerStaffPerformance(periodRecords);
  const periodRequestedCustomers = periodRecords.reduce((sum, record) => sum + (record.data.requestedRows || []).filter((row) => row.customer.trim()).length, 0);
  const periodApprovedCustomers = periodRecords.reduce((sum, record) => sum + (record.data.approvedRows || []).filter((row) => row.customer.trim()).length, 0);
  const periodApprovedAmount = periodStaffRows.reduce((sum, row) => sum + row.approved, 0);
  const periodDueCustomers = accountCount(periodAccountRecords, "dueRows");
  const periodPaidCustomers = accountCount(periodAccountRecords, "paidRows");
  const periodCollectedAmount = accountAmount(periodAccountRecords, "paidRows");
  const periodCollectionRate = periodDueCustomers ? Math.round((periodPaidCustomers / periodDueCustomers) * 100) : 0;
  const periodResolutionActions = accountCount(periodAccountRecords, "dueNoticeRows") + accountCount(periodAccountRecords, "promiseRows") + accountCount(periodAccountRecords, "closedRows");
  const periodLabel = viewPeriod === "daily" ? reportDate : viewPeriod === "monthly" ? reportDate.slice(0, 7) : reportDate.slice(0, 4);
  const kpiRows = [
    ["1", "ចំនួនទម្លាក់ឥណទានថ្មី ($)", operationCurrency(150000), operationCurrency(approvedAmount), operationCurrency(monthApprovedAmount), `${((monthApprovedAmount / 150000) * 100).toFixed(2)}%`, `សម្រេចបាន ${((monthApprovedAmount / 150000) * 100).toFixed(1)}% នៃគោលដៅខែ`],
    ["2", "ចំនួនអតិថិជនថ្មី (នាក់)", 30, approvedCustomers, monthApprovedCustomers, `${((monthApprovedCustomers / 30) * 100).toFixed(2)}%`, "ជិតសម្រេចបានតាមផែនការ"],
    ["3", "អត្រាប្រមូលប្រាក់ (%)", "95.00%", `${(collectionRate * 100).toFixed(2)}%`, `${(monthCollectionRate * 100).toFixed(2)}%`, `${((monthCollectionRate / 0.95) * 100).toFixed(2)}%`, "ត្រូវរុញច្រានការប្រមូលប្រាក់បន្ថែម"],
    ["4", "ចំនួនប្រាក់ប្រមូលបាន ($)", operationCurrency(10000), operationCurrency(collectedAmount), operationCurrency(monthCollectedAmount), `${((monthCollectedAmount / 10000) * 100).toFixed(2)}%`, `ប្រមូលបាន ${((monthCollectedAmount / 10000) * 100).toFixed(1)}% នៃផែនការខែ`],
    ["5", "អត្រាឥណទានយឺតយ៉ាវ PAR > 1 day (%)", "2.50%", `${(par1 * 100).toFixed(2)}%`, `${(par1 * 100).toFixed(2)}%`, `${((par1 / 0.025) * 100).toFixed(2)}%`, "លើសពីកម្រិតកំណត់ 1.2%"],
    ["6", "អត្រាឥណទានយឺតយ៉ាវ PAR > 30 day (%)", "1.00%", `${(par30 * 100).toFixed(2)}%`, `${(par30 * 100).toFixed(2)}%`, `${((par30 / 0.01) * 100).toFixed(2)}%`, "លើសពីកម្រិតកំណត់ 1.2%"],
    ["7", "ជូនដំណឹងទៅអតិថិជនមុន ៣ថ្ងៃ ដល់ថ្ងៃកំណត់ត្រូវបង់ (នាក់)", 0, dueNoticeCount, monthDueNoticeCount, "", ""],
    ["8", "ជូនដំណឹងទៅអតិថិជនមុន ១ថ្ងៃ ដល់ថ្ងៃកំណត់ត្រូវបង់ (នាក់)", 0, followUpCount, monthFollowUpCount, "", ""],
    ["9", "ជូនដំណឹងទៅអតិថិជន ដល់ថ្ងៃកំណត់ត្រូវបង់ (នាក់)", 0, formalNoticeCount, monthFormalNoticeCount, "", ""],
  ];

  return (
    <div className="space-y-6 pb-6">
      <section className="overflow-hidden border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-950">
        <div className="flex flex-col justify-between gap-3 bg-slate-100 px-4 py-3 sm:flex-row sm:items-center dark:bg-slate-900">
          <div><p className="font-bold text-slate-900 dark:text-white">{text("ទិន្នន័យ BM តាមរយៈពេល", "BM Data by Period")}</p><p className="text-xs text-slate-500">{text(`សាខាសរុបសម្រាប់ ${periodLabel}`, `Branch totals for ${periodLabel}`)}</p></div>
          <div className="inline-flex rounded-xl border border-slate-300 bg-white p-1 dark:border-slate-700 dark:bg-slate-950">{([['daily', text("ប្រចាំថ្ងៃ", "Daily")], ['monthly', text("ប្រចាំខែ", "Monthly")], ['yearly', text("ប្រចាំឆ្នាំ", "Yearly")]] as const).map(([period, label]) => <button key={period} type="button" onClick={() => setViewPeriod(period)} className={`rounded-lg px-3 py-2 text-sm font-semibold ${viewPeriod === period ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`}>{label}</button>)}</div>
        </div>
        <div className="grid sm:grid-cols-2 xl:grid-cols-4">{[
          [text("របាយការណ៍ LS", "LS Reports"), periodRecords.length],
          [text("របាយការណ៍គណនេយ្យ", "Account Reports"), periodAccountRecords.length],
          [text("សំណើ / អនុម័ត", "Requested / Approved"), `${periodRequestedCustomers} / ${periodApprovedCustomers}`],
          [text("ប្រាក់អនុម័ត", "Approved Amount"), operationCurrency(periodApprovedAmount)],
          [text("ត្រូវប្រមូល / ប្រមូលបាន", "Due / Collected"), `${periodDueCustomers} / ${periodPaidCustomers}`],
          [text("អត្រាប្រមូល", "Collection Rate"), `${periodCollectionRate}%`],
          [text("ចំនួនប្រាក់ប្រមូលបាន", "Collected Amount"), operationCurrency(periodCollectedAmount)],
          [text("សកម្មភាពដោះស្រាយ", "Resolution Actions"), periodResolutionActions],
        ].map(([label, value]) => <div key={label} className="border-t border-slate-200 px-4 py-3 sm:border-r dark:border-slate-800"><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{value}</p></div>)}</div>
        {viewPeriod !== "daily" ? <div className="overflow-x-auto border-t border-slate-300 dark:border-slate-700"><BranchManagerStaffTable rows={periodStaffRows} /></div> : null}
      </section>
      <BranchManagerSection title="១. សង្ខេបសូចនាករផលសម្រេចគន្លឹះរបស់សាខា (Branch Key KPI Summary)">
        <table className="w-full table-fixed border-collapse text-sm [&_td]:border [&_td]:border-slate-300 [&_th]:border [&_th]:border-slate-300"><colgroup><col className="w-12" /><col className="w-[29%]" /><col /><col /><col /><col /><col className="w-[22%]" /></colgroup><thead className="bg-[#087323] text-white"><tr>{["ល.រ", "សូចនាករគន្លឹះ (KPIs)", "គោលដៅប្រចាំខែ", "សម្រេចបានថ្ងៃនេះ", "សម្រេចបានសរុបប្រចាំខែ", "% សម្រេចធៀប KPI", "កំណត់សម្គាល់"].map((header) => <th key={header} className="px-3 py-3 text-center">{header}</th>)}</tr></thead><tbody>{kpiRows.map((row) => <tr key={String(row[0])}>{row.map((cell, index) => <td key={`${row[0]}-${index}`} className={`px-3 py-2 ${index === 0 ? "text-center" : index >= 2 && index <= 5 ? "text-right tabular-nums" : ""}`}>{cell}</td>)}</tr>)}</tbody></table>
      </BranchManagerSection>
      <BranchManagerSection title="២. សង្ខេបលទ្ធផលតាមមន្ត្រីឥណទាន (Staff Performance Breakdown)">
        <BranchManagerStaffTable rows={staffRows} />
      </BranchManagerSection>
      <BranchManagerSection title="៣. បញ្ហាប្រឈមគន្លឹះ និង ផែនការសកម្មភាពដោះស្រាយរបស់ប្រធានសាខា (Key Issues & Action Plan)">
        <table className="w-full table-fixed border-collapse text-sm [&_td]:border [&_td]:border-slate-300 [&_th]:border [&_th]:border-slate-300"><colgroup><col className="w-12" /><col className="w-[20%]" /><col className="w-[15%]" /><col className="w-[10%]" /><col className="w-[24%]" /><col className="w-[15%]" /><col /></colgroup><thead className="bg-[#087323] text-white"><tr>{["ល.រ", "បញ្ហាប្រឈម / ករណីយឺតយ៉ាវ", "ឈ្មោះអតិថិជន/មន្ត្រី", "ប្រាក់ដើម ($)", "ដំណោះស្រាយ/សកម្មភាពឆ្លើយតប", "អ្នកទទួលខុសត្រូវ", "កាលបរិច្ឆេទបញ្ចប់"].map((header) => <th key={header} className="px-3 py-3">{header}</th>)}</tr></thead><tbody>{actionLoans.length ? actionLoans.map((loan, index) => <tr key={loan.id}><td className="px-3 py-3 text-center">{index + 1}</td><td className="px-3 py-3">{loan.nextPaymentDate && loan.nextPaymentDate.slice(0, 10) < reportDate ? "អតិថិជនយឺតយ៉ាវត្រូវតាមដាន" : "អតិថិជនដល់ថ្ងៃបង់ត្រូវជូនដំណឹង"}</td><td className="px-3 py-3">{loan.borrower.fullName}</td><td className="px-3 py-3 text-right tabular-nums">{operationCurrency(loan.outstandingBalance)}</td><td className="px-3 py-3">{loan.nextPaymentDate && loan.nextPaymentDate.slice(0, 10) < reportDate ? "ប្រធានសាខាចុះផ្ទាល់ជាមួយ LS ដើម្បីសម្រុះសម្រួល" : "ជូនដំណឹងអតិថិជនដល់ថ្ងៃបង់"}</td><td className="px-3 py-3">{`BM & ${loan.loanContacts.loanSpecialist || loan.loanOfficer || ""}`.trim()}</td><td className="px-3 py-3 text-center">{loan.nextPaymentDate?.slice(0, 10) || reportDate}</td></tr>) : <tr><td colSpan={7} className="px-3 py-8 text-center text-slate-500">No key issues for this report date.</td></tr>}</tbody></table>
      </BranchManagerSection>
    </div>
  );
}

function BranchManagerStaffTable({ rows }: { rows: Array<{ name: string; requested: number; approved: number; collected: number; rejected: number; contacts: number }> }) {
  const totals = rows.reduce((sum, row) => ({ requested: sum.requested + row.requested, approved: sum.approved + row.approved, collected: sum.collected + row.collected, rejected: sum.rejected + row.rejected, contacts: sum.contacts + row.contacts }), { requested: 0, approved: 0, collected: 0, rejected: 0, contacts: 0 });
  return (
    <table className="w-full table-fixed border-collapse text-sm [&_td]:border [&_td]:border-slate-300 [&_th]:border [&_th]:border-slate-300"><colgroup><col className="w-12" /><col className="w-[30%]" /><col /><col /><col /><col /><col /></colgroup>
      <thead className="bg-[#087323] text-white"><tr>{["ល.រ", "ឈ្មោះមន្ត្រីឥណទាន", "ស្នើសុំ ($)", "អនុម័ត ($)", "បដិសេធ ($)", "ប្រមូលបាន ($)", "អតិថិជនដោះស្រាយ (នាក់)"].map((header) => <th key={header} className="px-3 py-3">{header}</th>)}</tr></thead>
      <tbody>{rows.length ? rows.map((row, index) => <tr key={row.name}><td className="px-3 py-2 text-center">{index + 1}</td><td className="px-3 py-2">{row.name}</td><td className="px-3 py-2 text-right tabular-nums">{operationCurrency(row.requested)}</td><td className="px-3 py-2 text-right tabular-nums">{operationCurrency(row.approved)}</td><td className="px-3 py-2 text-right tabular-nums">{operationCurrency(row.rejected)}</td><td className="px-3 py-2 text-right tabular-nums">{operationCurrency(row.collected)}</td><td className="px-3 py-2 text-center">{row.contacts}</td></tr>) : <tr><td colSpan={7} className="px-3 py-8 text-center text-slate-500">No staff reports for this date.</td></tr>}</tbody>
      <tfoot className="border-t-2 border-slate-900 bg-slate-100 font-bold text-red-700"><tr><td colSpan={2} className="px-3 py-3 text-center">សរុបសាខា (Total)</td><td className="px-3 py-3 text-right tabular-nums">{operationCurrency(totals.requested)}</td><td className="px-3 py-3 text-right tabular-nums">{operationCurrency(totals.approved)}</td><td className="px-3 py-3 text-right tabular-nums">{operationCurrency(totals.rejected)}</td><td className="px-3 py-3 text-right tabular-nums">{operationCurrency(totals.collected)}</td><td className="px-3 py-3 text-center">{totals.contacts}</td></tr></tfoot>
    </table>
  );
}

function BranchManagerConsolidatedReport({ records, accountRecords, loans }: { records: OperationReportRecord[]; accountRecords: AccountReportRecord[]; loans: LoanEntity[] }) {
  const staffRows = branchManagerStaffPerformance(records);
  const outstanding = loans.filter((loan) => !["Closed", "Rejected", "Draft"].includes(loan.repaymentStatus)).reduce((sum, loan) => sum + loan.outstandingBalance, 0);
  const collectionDueRows = accountRecords.flatMap((record) => record.data.dueRows || []);
  const collectionPaidRows = accountRecords.flatMap((record) => record.data.paidRows || []);
  const collectionDueCount = collectionDueRows.filter((row) => row.customer.trim()).length;
  const collectionPaidCount = collectionPaidRows.filter((row) => row.customer.trim()).length;
  const collectionDueAmount = collectionDueRows.reduce((sum, row) => sum + accountNumber(row.amount), 0);
  const collectionPaidAmount = collectionPaidRows.reduce((sum, row) => sum + accountNumber(row.amount), 0);
  const dueNoticeRows = accountRecords.flatMap((record) => record.data.dueNoticeRows || []);
  const followUpRows = accountRecords.flatMap((record) => record.data.promiseRows || []);
  const formalRows = accountRecords.flatMap((record) => record.data.closedRows || []);
  const paidRows = accountRecords.flatMap((record) => (record.data.paidRows || []).map((row) => ({ staff: record.reporterName, customer: row.customer, activity: "ប្រមូលប្រាក់", amount: accountNumber(row.amount), principal: 0, status: row.reason, note: row.reason })));
  const detailRows = [
    ...paidRows,
    ...accountRecords.flatMap((record) => (record.data.dueNoticeRows || []).map((row) => ({ staff: record.reporterName, customer: row.customer, activity: "ជូនដំណឹង", amount: accountNumber(row.interest), principal: accountNumber(row.principal), status: row.assetType, note: row.note }))),
    ...accountRecords.flatMap((record) => (record.data.promiseRows || []).map((row) => ({ staff: record.reporterName, customer: row.customer, activity: "តាមដាន", amount: accountNumber(row.interest), principal: accountNumber(row.principal), status: row.assetType, note: row.note }))),
    ...accountRecords.flatMap((record) => (record.data.closedRows || []).map((row) => ({ staff: record.reporterName, customer: row.customer, activity: "លិខិតជូនដំណឹង", amount: accountNumber(row.interest), principal: accountNumber(row.principal), status: row.assetType, note: row.note }))),
  ].filter((row) => row.customer.trim());
  const activeLoanCount = loans.filter((loan) => !["Closed", "Rejected", "Draft"].includes(loan.repaymentStatus)).length;
  const actionInterest = followUpRows.reduce((sum, row) => sum + accountNumber(row.interest), 0) + formalRows.reduce((sum, row) => sum + accountNumber(row.interest), 0);
  const actionPenalty = followUpRows.reduce((sum, row) => sum + accountNumber(row.penalty), 0) + formalRows.reduce((sum, row) => sum + accountNumber(row.penalty), 0);
  const actionPrincipal = followUpRows.reduce((sum, row) => sum + accountNumber(row.principal), 0) + formalRows.reduce((sum, row) => sum + accountNumber(row.principal), 0);
  const actionCustomers = followUpRows.filter((row) => row.customer.trim()).length + formalRows.filter((row) => row.customer.trim()).length;
  const detailCashTotal = detailRows.reduce((sum, row) => sum + row.amount, 0);
  const detailPrincipalTotal = detailRows.reduce((sum, row) => sum + row.principal, 0);

  return (
    <div className="space-y-8 pb-6">
      <BranchManagerSection title="1. សង្ខេបលទ្ធផលការងារបុគ្គលិកឥណទាន (Staff Performance Breakdown)">
        <BranchManagerStaffTable rows={staffRows} />
      </BranchManagerSection>
      <BranchManagerSection title="2. លទ្ធផលប្រមូលប្រាក់ពីរបាយការណ៍គណនេយ្យ (Account Collection Results)">
        <table className="w-full table-fixed border-collapse text-sm [&_td]:border [&_td]:border-slate-300 [&_th]:border [&_th]:border-slate-300"><thead className="bg-[#087323] text-white"><tr><th className="px-3 py-3">ល.រ</th><th className="px-3 py-3">ប្រភេទការប្រមូល</th><th className="px-3 py-3 text-center">ចំនួនអតិថិជន (នាក់)</th><th className="px-3 py-3 text-right">ចំនួនទឹកប្រាក់ ($)</th></tr></thead><tbody><tr><td className="px-3 py-3 text-center">1</td><td className="px-3 py-3">អតិថិជនដែលប្រមូលសរុប</td><td className="px-3 py-3 text-center">{collectionDueCount}</td><td className="px-3 py-3 text-right tabular-nums">{operationCurrency(collectionDueAmount)}</td></tr><tr><td className="px-3 py-3 text-center">2</td><td className="px-3 py-3">អតិថិជនដែលប្រមូលបានសរុប</td><td className="px-3 py-3 text-center">{collectionPaidCount}</td><td className="px-3 py-3 text-right tabular-nums">{operationCurrency(collectionPaidAmount)}</td></tr></tbody><tfoot className="border-t-2 border-slate-900 bg-slate-100 font-bold text-red-700"><tr><td colSpan={2} className="px-3 py-3 text-center">សរុប</td><td className="px-3 py-3 text-center">{collectionPaidCount}</td><td className="px-3 py-3 text-right tabular-nums">{operationCurrency(collectionPaidAmount)}</td></tr></tfoot></table>
      </BranchManagerSection>
      <BranchManagerSection title="3. សង្ខេបលទ្ធផលរបស់គណនេយ្យ (Summary of account results)">
        <table className="w-full table-fixed border-collapse text-sm [&_td]:border [&_td]:border-slate-300 [&_th]:border [&_th]:border-slate-300"><thead className="bg-[#087323] text-white"><tr>{["ល.រ", "ប្រភេទសកម្មភាព", "អតិថិជនទាក់ទង/ដោះស្រាយ", "ការប្រាក់ ($)", "ពិន័យ ($)", "ប្រាក់ដើម ($)", "អតិថិជនសរុប/ដោះស្រាយ (នាក់)"].map((header) => <th key={header} className="px-3 py-3">{header}</th>)}</tr></thead><tbody>{[
          [1, "សរុបបំណុលដែលមាននៅសល់ (Total outstanding debt)", "", "", "", outstanding, activeLoanCount],
          [2, "ជូនដំណឹងទៅអតិថិជន ដល់ថ្ងៃកំណត់ត្រូវបង់", dueNoticeRows.filter((row) => row.customer.trim()).length, "", "", "", dueNoticeRows.filter((row) => row.customer.trim()).length],
          [3, "អតិថិជនដែលយឺតចាប់ពី ១ថ្ងៃ ដល់ ៣ថ្ងៃ", "", followUpRows.reduce((sum, row) => sum + accountNumber(row.interest), 0), followUpRows.reduce((sum, row) => sum + accountNumber(row.penalty), 0), followUpRows.reduce((sum, row) => sum + accountNumber(row.principal), 0), followUpRows.filter((row) => row.customer.trim()).length],
          [4, "អតិថិជនដែលយឺតចាប់ពី ៤ថ្ងៃឡើងទៅ", "", formalRows.reduce((sum, row) => sum + accountNumber(row.interest), 0), formalRows.reduce((sum, row) => sum + accountNumber(row.penalty), 0), formalRows.reduce((sum, row) => sum + accountNumber(row.principal), 0), formalRows.filter((row) => row.customer.trim()).length],
        ].map((row) => <tr key={String(row[0])}>{row.map((cell, index) => <td key={`${row[0]}-${index}`} className={`px-3 py-3 ${index === 0 || index === 2 || index === 6 ? "text-center" : index >= 3 && index <= 5 ? "text-right tabular-nums" : ""}`}>{typeof cell === "number" && index >= 3 && index <= 5 ? operationCurrency(cell) : cell}</td>)}</tr>)}</tbody><tfoot className="border-t-2 border-slate-900 bg-slate-100 font-bold text-red-700"><tr><td colSpan={2} className="px-3 py-3 text-center">សរុប</td><td className="px-3 py-3 text-center">{actionCustomers}</td><td className="px-3 py-3 text-right tabular-nums">{operationCurrency(actionInterest)}</td><td className="px-3 py-3 text-right tabular-nums">{operationCurrency(actionPenalty)}</td><td className="px-3 py-3 text-right tabular-nums">{operationCurrency(actionPrincipal)}</td><td className="px-3 py-3 text-center">{actionCustomers}</td></tr></tfoot></table>
      </BranchManagerSection>
      <BranchManagerSection title="បញ្ជីលម្អិតប្រមូលប្រាក់ប្រចាំថ្ងៃ">
        <table className="w-full table-fixed border-collapse text-sm [&_td]:border [&_td]:border-slate-300 [&_th]:border [&_th]:border-slate-300"><thead className="bg-[#087323] text-white"><tr>{["ល.រ", "ឈ្មោះមន្ត្រីឥណទាន", "ឈ្មោះអតិថិជន", "ប្រភេទសកម្មភាព", "សាច់ប្រាក់ ($)", "ប្រាក់ដើម ($)", "ស្ថានភាព/ដំណោះស្រាយ", "មូលហេតុ/ចំណាត់ការ"].map((header) => <th key={header} className="px-3 py-3">{header}</th>)}</tr></thead><tbody>{detailRows.length ? detailRows.map((row, index) => <tr key={`${row.staff}-${row.customer}-${index}`}><td className="px-3 py-2 text-center">{index + 1}</td><td className="px-3 py-2">{row.staff}</td><td className="px-3 py-2">{row.customer}</td><td className="px-3 py-2">{row.activity}</td><td className="px-3 py-2 text-right tabular-nums">{operationCurrency(row.amount)}</td><td className="px-3 py-2 text-right tabular-nums">{operationCurrency(row.principal)}</td><td className="px-3 py-2">{row.status}</td><td className="px-3 py-2">{row.note}</td></tr>) : <tr><td colSpan={8} className="px-3 py-8 text-center text-slate-500">No consolidated detail for this date.</td></tr>}</tbody>{detailRows.length ? <tfoot className="border-t-2 border-slate-900 bg-slate-100 font-bold text-red-700"><tr><td colSpan={4} className="px-3 py-3 text-center">សរុប</td><td className="px-3 py-3 text-right tabular-nums">{operationCurrency(detailCashTotal)}</td><td className="px-3 py-3 text-right tabular-nums">{operationCurrency(detailPrincipalTotal)}</td><td colSpan={2} /></tr></tfoot> : null}</table>
      </BranchManagerSection>
    </div>
  );
}

function ReportTable({ title, count, total, children, titleTone = "green", onRemoveLast }: { title: string; count: number; total: number; children: ReactNode; titleTone?: "green" | "red"; onRemoveLast?: () => void }) {
  void count;
  void total;
  const titleColor = titleTone === "red" ? "text-red-700 dark:text-red-300" : "text-emerald-800 dark:text-emerald-300";
  return (
    <section>
      <h2 className={`flex items-center justify-between gap-3 border-b border-slate-300 px-3 py-2 text-sm font-bold dark:border-slate-700 ${titleColor}`}><span>{title}</span>{onRemoveLast ? <button type="button" onClick={onRemoveLast} className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs hover:bg-red-50 hover:text-red-700"><X className="h-3.5 w-3.5" />Remove last row</button> : null}</h2>
      <table className="w-full table-fixed border-collapse text-left text-sm [&_td]:border [&_td]:border-slate-300 [&_th]:border [&_th]:border-slate-300 dark:[&_td]:border-slate-700 dark:[&_th]:border-slate-700">{children}</table>
    </section>
  );
}

function OperationReportImageCell({ images, imageUrl, imageName, onChange, compact = false }: OperationReportAttachment & { onChange: (attachment: OperationReportAttachment) => void; compact?: boolean }) {
  const { error: toastError, success: toastSuccess } = useToast();
  const { language } = useLanguage();
  const text = (km: string, en: string) => language === "km" ? km : en;
  const [uploading, setUploading] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [zoom, setZoom] = useState(100);
  const attachments = images?.length ? images : imageUrl ? [{ imageUrl, imageName }] : [];

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;
    setUploading(true);
    try {
      const uploaded = await Promise.all(files.map(async (file): Promise<OperationReportImage> => {
        const data = new FormData();
        data.append("file", file);
        const response = await fetch("/api/loan/operation-report-image", { method: "POST", credentials: "include", body: data });
        const payload = await response.json().catch(() => null) as ApiResponse<{ name: string; url: string }> | null;
        if (!response.ok || !payload?.success || !payload.data) throw new Error(payload?.error || text("មិនអាចបង្ហោះរូបភាព", "Could not upload image"));
        return { imageUrl: payload.data.url, imageName: payload.data.name };
      }));
      onChange({ images: [...attachments, ...uploaded], imageUrl: undefined, imageName: undefined });
      toastSuccess(text(`បានបង្ហោះរូបភាព ${uploaded.length}`, `${uploaded.length} photo${uploaded.length === 1 ? "" : "s"} uploaded.`));
    } catch (caught) {
      toastError(caught instanceof Error ? caught.message : text("មិនអាចបង្ហោះរូបភាព", "Could not upload image"));
    } finally {
      setUploading(false);
    }
  };

  const openViewer = (index: number) => {
    setZoom(100);
    setViewerIndex(index);
  };

  const removeImage = (index: number) => {
    onChange({ images: attachments.filter((_, imageIndex) => imageIndex !== index), imageUrl: undefined, imageName: undefined });
    setViewerIndex(null);
  };
  const zoomBy = (amount: number) => setZoom((current) => Math.min(400, Math.max(50, current + amount)));
  const viewedImage = viewerIndex === null ? null : attachments[viewerIndex];

  return (
    <div className={`flex flex-wrap items-center gap-2 ${compact ? "shrink-0" : "min-w-40"}`}>
      {attachments.map((image, index) => <span key={`${image.imageUrl}-${index}`} className="group relative shrink-0">
        <button type="button" onClick={() => openViewer(index)} title={text("បើកកម្មវិធីមើលរូបភាព", "Open photo viewer")}><img src={image.imageUrl} alt={image.imageName || text("ឯកសារភ្ជាប់ជួរ", "Row attachment")} className="h-12 w-12 rounded-md border border-slate-200 object-cover transition hover:border-emerald-400 dark:border-slate-700" /></button>
        <button type="button" onClick={() => removeImage(index)} title={text("លុបរូបភាព", "Remove photo")} aria-label={text("លុបរូបភាព", "Remove photo")} className="absolute -right-1.5 -top-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white shadow hover:bg-red-700"><X className="h-3 w-3" /></button>
      </span>)}
      <label title={text("បន្ថែមរូបភាព", "Add photos")} className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 hover:border-emerald-400 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
        <input type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => void upload(event)} disabled={uploading} className="sr-only" />
      </label>
      {viewedImage ? createPortal(
        <div role="dialog" aria-modal="true" aria-label={text("កម្មវិធីមើលរូបភាព", "Photo viewer")} onClick={() => setViewerIndex(null)} className="fixed inset-0 z-[100] flex flex-col bg-slate-950/95 p-3 sm:p-5">
          <div onClick={(event) => event.stopPropagation()} className="mb-3 flex shrink-0 items-center justify-between gap-3 rounded-lg bg-slate-900 px-3 py-2 text-white shadow-lg">
            <p className="min-w-0 truncate text-sm font-semibold">{viewedImage.imageName || text("រូបភាពរបាយការណ៍ប្រតិបត្តិការ", "Operation Report photo")} <span className="ml-2 text-slate-400">{viewerIndex! + 1}/{attachments.length}</span></p>
            <div className="flex shrink-0 items-center gap-1">
              {attachments.length > 1 ? <button type="button" onClick={() => { setZoom(100); setViewerIndex((viewerIndex! - 1 + attachments.length) % attachments.length); }} title={text("រូបភាពមុន", "Previous photo")} aria-label={text("រូបភាពមុន", "Previous photo")} className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-white/10"><ChevronDown className="h-5 w-5 rotate-90" /></button> : null}
              {attachments.length > 1 ? <button type="button" onClick={() => { setZoom(100); setViewerIndex((viewerIndex! + 1) % attachments.length); }} title={text("រូបភាពបន្ទាប់", "Next photo")} aria-label={text("រូបភាពបន្ទាប់", "Next photo")} className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-white/10"><ChevronDown className="h-5 w-5 -rotate-90" /></button> : null}
              <button type="button" onClick={() => zoomBy(-25)} disabled={zoom <= 50} title={text("បង្រួម", "Zoom out")} aria-label={text("បង្រួម", "Zoom out")} className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-white/10 disabled:opacity-40"><ZoomOut className="h-5 w-5" /></button>
              <button type="button" onClick={() => setZoom(100)} title={text("កំណត់ទំហំឡើងវិញ", "Reset zoom")} className="h-9 min-w-14 rounded-md px-2 text-sm font-semibold hover:bg-white/10">{zoom}%</button>
              <button type="button" onClick={() => zoomBy(25)} disabled={zoom >= 400} title={text("ពង្រីក", "Zoom in")} aria-label={text("ពង្រីក", "Zoom in")} className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-white/10 disabled:opacity-40"><ZoomIn className="h-5 w-5" /></button>
              <button type="button" onClick={() => removeImage(viewerIndex!)} title={text("លុបរូបភាព", "Remove photo")} aria-label={text("លុបរូបភាព", "Remove photo")} className="ml-1 inline-flex h-9 w-9 items-center justify-center rounded-md text-red-300 hover:bg-red-500/20"><Trash2 className="h-5 w-5" /></button>
              <button type="button" onClick={() => setViewerIndex(null)} title={text("បិទ", "Close viewer")} aria-label={text("បិទ", "Close viewer")} className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-white/10"><X className="h-5 w-5" /></button>
            </div>
          </div>
          <div onClick={(event) => event.stopPropagation()} className="min-h-0 flex-1 overflow-auto rounded-lg bg-black/30">
            <div className="flex min-h-full min-w-full items-center justify-center p-4">
              <img src={viewedImage.imageUrl} alt={viewedImage.imageName || text("ឯកសារភ្ជាប់របាយការណ៍ប្រតិបត្តិការ", "Operation Report attachment")} style={{ width: `${zoom}%`, maxWidth: "none" }} className="h-auto object-contain shadow-2xl" />
            </div>
          </div>
        </div>,
        document.body
      ) : null}
    </div>
  );
}

function CollectionReportTable({ title, rows, onChange, accent = "green", onRememberField }: { title: string; rows: OperationReportCollectionRow[]; onChange: (rows: OperationReportCollectionRow[]) => void; accent?: "green" | "red"; onRememberField: (field: string, value: string) => void }) {
  const { language } = useLanguage();
  const text = (km: string, en: string) => language === "km" ? km : en;
  const total = rows.reduce((sum, row) => sum + operationNumber(row.amount), 0);
  const header = accent === "red" ? "bg-red-700" : "bg-emerald-800";
  const onEnter = (event: ReactKeyboardEvent<HTMLInputElement>, index: number, field: keyof OperationReportCollectionRow) => appendOperationRowOnEnter(
    event,
    index,
    rows,
    onChange,
    (id) => ({ id, customer: "", amount: "", reason: "" }),
    field
  );
  return (
    <ReportTable title={title} count={rows.filter((row) => row.customer.trim()).length} total={total} titleTone={accent} onRemoveLast={() => onChange(rows.length > 1 ? rows.slice(0, -1) : createOperationCollectionRows().slice(0, 1))}>
      <thead className={`${header} text-white`}><tr><th className="w-14 px-3 py-3">{text("ល.រ", "No.")}</th><th className="px-3 py-3">{text("ឈ្មោះអតិថិជន", "Customer Name")}</th><th className="w-40 px-3 py-3 text-right">{text("ជាសាច់ប្រាក់ ($)", "Amount ($)")}</th><th className="px-3 py-3">{text("មូលហេតុ", "Reason")}</th></tr></thead>
      <tbody>{rows.map((row, index) => <tr key={row.id}><td className="px-3 py-2 text-center text-slate-500">{index + 1}</td><td className="px-2 py-1"><input data-operation-row={index} data-operation-field="customer" list="operation-report-customer-options" value={row.customer} onBlur={(event) => onRememberField("customer", event.target.value)} onKeyDown={(event) => onEnter(event, index, "customer")} onChange={(event) => onChange(rows.map((item) => item.id === row.id ? { ...item, customer: event.target.value } : item))} className={inputClass} placeholder={text("ឈ្មោះអតិថិជន", "Customer name")} /></td><td className="px-2 py-1"><input data-operation-row={index} data-operation-field="amount" list="operation-report-amount-options" type="number" min="0" value={row.amount} onBlur={(event) => onRememberField("amount", event.target.value)} onKeyDown={(event) => onEnter(event, index, "amount")} onChange={(event) => onChange(rows.map((item) => item.id === row.id ? { ...item, amount: event.target.value } : item))} className={`${inputClass} text-right`} placeholder="0.00" /></td><td className="px-2 py-1"><div className="flex items-center gap-2"><input data-operation-row={index} data-operation-field="reason" list="operation-report-reason-options" value={row.reason} onBlur={(event) => onRememberField("reason", event.target.value)} onKeyDown={(event) => onEnter(event, index, "reason")} onChange={(event) => onChange(rows.map((item) => item.id === row.id ? { ...item, reason: event.target.value } : item))} className={inputClass} placeholder={text("មូលហេតុ", "Reason")} /><OperationReportImageCell compact images={row.images} imageUrl={row.imageUrl} imageName={row.imageName} onChange={(attachment) => onChange(rows.map((item) => item.id === row.id ? { ...item, ...attachment } : item))} /></div></td></tr>)}</tbody>
      <tfoot className="border-t-2 border-slate-900 bg-slate-100 font-bold text-red-700 dark:bg-slate-800"><tr><td colSpan={2} className="px-3 py-3 text-center">{text("សរុប", "Total")}</td><td className="px-3 py-3 text-right">{operationCurrency(total)}</td><td /></tr></tfoot>
    </ReportTable>
  );
}

function ResolutionTable({ title, rows, onChange, onRememberAssetType, onRememberField }: { title: string; rows: OperationReportResolutionRow[]; onChange: (rows: OperationReportResolutionRow[]) => void; onRememberAssetType?: (value: string) => void; onRememberField: (field: string, value: string) => void }) {
  const { language } = useLanguage();
  const text = (km: string, en: string) => language === "km" ? km : en;
  const interestTotal = rows.reduce((sum, row) => sum + operationNumber(row.interest), 0);
  const penaltyTotal = rows.reduce((sum, row) => sum + operationNumber(row.penalty), 0);
  const principalTotal = rows.reduce((sum, row) => sum + operationNumber(row.principal), 0);
  const onEnter = (event: ReactKeyboardEvent<HTMLInputElement>, index: number, field: keyof OperationReportResolutionRow) => appendOperationRowOnEnter(
    event,
    index,
    rows,
    onChange,
    (id) => ({ id, customer: "", assetType: "", interest: "", penalty: "", principal: "", solution: "" }),
    field
  );
  return (
    <ReportTable title={title} count={rows.filter((row) => row.customer.trim()).length} total={interestTotal} onRemoveLast={() => onChange(rows.length > 1 ? rows.slice(0, -1) : createOperationResolutionRows().slice(0, 1))}>
      <thead className="bg-emerald-800 text-white"><tr><th className="w-14 px-3 py-3">{text("ល.រ", "No.")}</th><th className="px-3 py-3">{text("ឈ្មោះអតិថិជន", "Customer Name")}</th><th className="px-3 py-3">{text("ប្រភេទទ្រព្យ", "Asset Type")}</th><th className="w-36 px-3 py-3 text-right">{text("ការប្រាក់ ($)", "Interest ($)")}</th><th className="w-32 px-3 py-3 text-right">{text("ពិន័យ ($)", "Penalty ($)")}</th><th className="w-40 px-3 py-3 text-right">{text("ប្រាក់ដើម ($)", "Principal ($)")}</th><th className="px-3 py-3">{text("ដំណោះស្រាយ", "Solution")}</th></tr></thead>
      <tbody>{rows.map((row, index) => <tr key={row.id}><td className="px-3 py-2 text-center text-slate-500">{index + 1}</td><td className="px-2 py-1"><input data-operation-row={index} data-operation-field="customer" list="operation-report-customer-options" value={row.customer} onBlur={(event) => onRememberField("customer", event.target.value)} onKeyDown={(event) => onEnter(event, index, "customer")} onChange={(event) => onChange(rows.map((item) => item.id === row.id ? { ...item, customer: event.target.value } : item))} className={inputClass} placeholder={text("ឈ្មោះអតិថិជន", "Customer name")} /></td><td className="px-2 py-1"><input data-operation-row={index} data-operation-field="assetType" list="operation-report-assetType-options" value={row.assetType} onBlur={(event) => { onRememberAssetType?.(event.target.value); onRememberField("assetType", event.target.value); }} onKeyDown={(event) => { if (event.key === "Enter") onRememberAssetType?.(event.currentTarget.value); onEnter(event, index, "assetType"); }} onChange={(event) => onChange(rows.map((item) => item.id === row.id ? { ...item, assetType: event.target.value } : item))} className={inputClass} placeholder={text("ជ្រើសរើស ឬបញ្ចូលប្រភេទទ្រព្យ", "Select or enter asset type")} /></td><td className="px-2 py-1"><input data-operation-row={index} data-operation-field="interest" list="operation-report-interest-options" type="number" min="0" value={row.interest} onBlur={(event) => onRememberField("interest", event.target.value)} onKeyDown={(event) => onEnter(event, index, "interest")} onChange={(event) => onChange(rows.map((item) => item.id === row.id ? { ...item, interest: event.target.value } : item))} className={`${inputClass} text-right`} placeholder="0.00" /></td><td className="px-2 py-1"><input data-operation-row={index} data-operation-field="penalty" list="operation-report-penalty-options" type="number" min="0" value={row.penalty} onBlur={(event) => onRememberField("penalty", event.target.value)} onKeyDown={(event) => onEnter(event, index, "penalty")} onChange={(event) => onChange(rows.map((item) => item.id === row.id ? { ...item, penalty: event.target.value } : item))} className={`${inputClass} text-right`} placeholder="0.00" /></td><td className="px-2 py-1"><input data-operation-row={index} data-operation-field="principal" list="operation-report-principal-options" type="number" min="0" value={row.principal} onBlur={(event) => onRememberField("principal", event.target.value)} onKeyDown={(event) => onEnter(event, index, "principal")} onChange={(event) => onChange(rows.map((item) => item.id === row.id ? { ...item, principal: event.target.value } : item))} className={`${inputClass} text-right`} placeholder="0.00" /></td><td className="px-2 py-1"><div className="flex items-center gap-2"><input data-operation-row={index} data-operation-field="solution" list="operation-report-solution-options" value={row.solution} onBlur={(event) => onRememberField("solution", event.target.value)} onKeyDown={(event) => onEnter(event, index, "solution")} onChange={(event) => onChange(rows.map((item) => item.id === row.id ? { ...item, solution: event.target.value } : item))} className={inputClass} placeholder={text("ដំណោះស្រាយ", "Solution")} /><OperationReportImageCell compact images={row.images} imageUrl={row.imageUrl} imageName={row.imageName} onChange={(attachment) => onChange(rows.map((item) => item.id === row.id ? { ...item, ...attachment } : item))} /></div></td></tr>)}</tbody>
      <tfoot className="border-t-2 border-slate-900 bg-slate-100 font-bold text-red-700 dark:bg-slate-800"><tr><td colSpan={3} className="px-3 py-3 text-center">{text("សរុប", "Total")}</td><td className="px-3 py-3 text-right">{operationCurrency(interestTotal)}</td><td className="px-3 py-3 text-right">{operationCurrency(penaltyTotal)}</td><td className="px-3 py-3 text-right">{operationCurrency(principalTotal)}</td><td /></tr></tfoot>
    </ReportTable>
  );
}

function DecisionTable({ title, rows, total, onChange, loans, statusGroup, showReason = false, onRememberType, onRememberField }: { title: string; rows: OperationReportLoanDecisionRow[]; total: number; onChange: (rows: OperationReportLoanDecisionRow[]) => void; loans: LoanEntity[]; statusGroup: "requested" | "approved" | "rejected"; showReason?: boolean; onRememberType: (value: string) => void; onRememberField: (field: string, value: string) => void }) {
  const { language } = useLanguage();
  const text = (km: string, en: string) => language === "km" ? km : en;
  const loansForGroup = useMemo(() => {
    const approvedStatuses = new Set<LoanEntity["repaymentStatus"]>(["Approved", "Progress", "Due Soon", "Overdue", "Closed", "Defaulted"]);
    return loans.filter((loan) => statusGroup === "rejected" ? loan.repaymentStatus === "Rejected" : statusGroup === "approved" ? approvedStatuses.has(loan.repaymentStatus) : true);
  }, [loans, statusGroup]);

  const findLoan = (customer: string) => {
    const normalized = customer.trim().toLocaleLowerCase();
    if (!normalized) return null;
    const relevant = loansForGroup.find((loan) => loan.borrower.fullName.trim().toLocaleLowerCase() === normalized);
    return relevant || loans.find((loan) => loan.borrower.fullName.trim().toLocaleLowerCase() === normalized) || null;
  };

  const changeCustomer = (row: OperationReportLoanDecisionRow, customer: string) => {
    const linkedLoan = findLoan(customer);
    onChange(rows.map((item) => item.id === row.id ? {
      ...item,
      customer,
      ...(linkedLoan ? {
        type: item.type.trim() ? item.type : linkedLoan.loanType,
        amount: item.amount.trim() ? item.amount : String(linkedLoan.principal),
      } : {}),
    } : item));
  };

  const onEnter = (event: ReactKeyboardEvent<HTMLInputElement>, index: number, field: keyof OperationReportLoanDecisionRow) => appendOperationRowOnEnter(
    event,
    index,
    rows,
    onChange,
    (id) => ({ id, customer: "", type: "", amount: "", reason: "" }),
    field
  );
  return (
    <ReportTable title={title} count={rows.filter((row) => row.customer.trim()).length} total={total} onRemoveLast={() => onChange(rows.length > 1 ? rows.slice(0, -1) : [{ id: 1, customer: "", type: "", amount: "", reason: "" }])}>
      <thead className="bg-emerald-800 text-white"><tr><th className="w-14 px-3 py-3">{text("ល.រ", "No.")}</th><th className="min-w-44 px-3 py-3">{text("ឈ្មោះអតិថិជន", "Customer")}</th><th className="min-w-36 px-3 py-3">{text("ប្រភេទ", "Type")}</th><th className="min-w-28 px-3 py-3 text-right">{text("សាច់ប្រាក់", "Amount")}</th>{showReason ? <th className="min-w-44 px-3 py-3">{text("មូលហេតុ", "Reason")}</th> : null}<th className="min-w-48 px-3 py-3">{text("រូបភាព", "Photos")}</th></tr></thead>
      <tbody>{rows.map((row, index) => <tr key={row.id} className="border-t border-slate-200 dark:border-slate-800"><td className="px-3 py-2 text-slate-500">{index + 1}</td><td className="px-3 py-2"><input data-operation-row={index} data-operation-field="customer" list="operation-report-customer-options" value={row.customer} onBlur={(event) => onRememberField("customer", event.target.value)} onKeyDown={(event) => onEnter(event, index, "customer")} onChange={(event) => changeCustomer(row, event.target.value)} className={inputClass} placeholder={text("ឈ្មោះអតិថិជន", "Customer name")} /></td><td className="px-3 py-2"><input data-operation-row={index} data-operation-field="type" list="operation-report-type-options" value={row.type} onBlur={(event) => { onRememberType(event.target.value); onRememberField("type", event.target.value); }} onKeyDown={(event) => { if (event.key === "Enter") onRememberType(event.currentTarget.value); onEnter(event, index, "type"); }} onChange={(event) => onChange(rows.map((item) => item.id === row.id ? { ...item, type: event.target.value } : item))} className={inputClass} placeholder={text("ជ្រើសរើស ឬបញ្ចូលប្រភេទ", "Select or enter type")} /></td><td className="px-3 py-2"><input data-operation-row={index} data-operation-field="amount" list="operation-report-amount-options" type="number" min="0" value={row.amount} onBlur={(event) => onRememberField("amount", event.target.value)} onKeyDown={(event) => onEnter(event, index, "amount")} onChange={(event) => onChange(rows.map((item) => item.id === row.id ? { ...item, amount: event.target.value } : item))} className={`${inputClass} text-right`} placeholder="0.00" /></td>{showReason ? <td className="px-3 py-2"><input data-operation-row={index} data-operation-field="reason" list="operation-report-reason-options" value={row.reason} onBlur={(event) => onRememberField("reason", event.target.value)} onKeyDown={(event) => onEnter(event, index, "reason")} onChange={(event) => onChange(rows.map((item) => item.id === row.id ? { ...item, reason: event.target.value } : item))} className={inputClass} placeholder={text("ជ្រើសរើស ឬបញ្ចូលមូលហេតុ", "Select or enter a reason")} /></td> : null}<td className="px-3 py-2"><OperationReportImageCell images={row.images} imageUrl={row.imageUrl} imageName={row.imageName} onChange={(attachment) => onChange(rows.map((item) => item.id === row.id ? { ...item, ...attachment } : item))} /></td></tr>)}</tbody>
      <tfoot className="border-t-2 border-slate-900 bg-slate-100 font-bold text-red-700 dark:bg-slate-800"><tr><td colSpan={3} className="px-3 py-3 text-center">{text("សរុប", "Total")}</td><td className="px-3 py-3 text-right tabular-nums">{operationCurrency(total)}</td><td colSpan={showReason ? 2 : 1} /></tr></tfoot>
    </ReportTable>
  );
}

export default function LoanDashboard() {
  const { success: toastSuccess, error: toastError, warning: toastWarning, info: toastInfo } = useToast();
  const user = useAuthUser();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [dashboard, setDashboard] = useState<LoanDashboardData | null>(null);
  const [loanList, setLoanList] = useState<LoanEntity[]>([]);
  const [loanListLoading, setLoanListLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingLoan, setEditingLoan] = useState<LoanEntity | null>(null);
  const [selectedLoan, setSelectedLoan] = useState<LoanEntity | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeView, setActiveView] = useState<LoanDashboardView>("summary");
  const [journalAccount, setJournalAccount] = useState<JournalViewAccount | null>(null);
  const [journalReturnView, setJournalReturnView] = useState<"loans" | "accounting">("loans");
  const [borrowerLoans, setBorrowerLoans] = useState<LoanEntity[]>([]);
  const [borrowersLoading, setBorrowersLoading] = useState(false);
  const loansRef = useRef<HTMLDivElement | null>(null);
  const loanDetailRef = useRef<HTMLDivElement | null>(null);
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [dateFilterOption, setDateFilterOption] = useState<DateFilterOption>("all_time");
  const [showDateFilter, setShowDateFilter] = useState(false);
  const dateFilterRef = useRef<HTMLDivElement | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<LoanEntity["repaymentStatus"] | "">("");
  const [loanTypeFilter, setLoanTypeFilter] = useState("");
  const [myLoansOnly, setMyLoansOnly] = useState(false);
  const [archivedOnly, setArchivedOnly] = useState(false);
  const [loanListDateFilter, setLoanListDateFilter] = useState<LoanListDateFilter>("");
  const [customLoanFilter, setCustomLoanFilter] = useState<LoanListCustomFilter | null>(null);
  const [customLoanFilterDraft, setCustomLoanFilterDraft] = useState<LoanListCustomFilter>({ field: "customer", operator: "contains", value: "" });
  const [showCustomLoanFilter, setShowCustomLoanFilter] = useState(false);
  const [groupBy, setGroupBy] = useState<LoanListGroupBy>("none");
  const [showCustomLoanGroup, setShowCustomLoanGroup] = useState(false);
  const [showLoanFilterMenu, setShowLoanFilterMenu] = useState(false);
  const [showLoanDateMenu, setShowLoanDateMenu] = useState(false);
  const [showLoanTypeMenu, setShowLoanTypeMenu] = useState(false);
  const [showLoanGroupMenu, setShowLoanGroupMenu] = useState(false);
  const [showLoanBookmarks, setShowLoanBookmarks] = useState(false);
  const loanFilterMenuRef = useRef<HTMLDivElement | null>(null);
  const loanGroupMenuRef = useRef<HTMLDivElement | null>(null);
  const loanBookmarksRef = useRef<HTMLDivElement | null>(null);
  // Drilldown state: optional filters applied when a KPI or revenue card is clicked
  const [drilldownFilters, setDrilldownFilters] = useState<{ status?: LoanEntity["repaymentStatus"]; loanType?: string } | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 80;
  const [selectedLoanIds, setSelectedLoanIds] = useState<Set<string>>(() => new Set());
  const [deletingLoanId, setDeletingLoanId] = useState<string | null>(null);

  const canCreateLoans = hasAppPermission(user.role, "loans:create");
  const canViewLoans = hasAppPermission(user.role, "loans:view");
  const canEditLoans = hasAppPermission(user.role, "loans:edit");
  const canApproveLoans = hasAppPermission(user.role, "loans:approve");
  const canDisburseLoans = hasAppPermission(user.role, "loans:disburse");
  const canRecordRepayments = hasAppPermission(user.role, "loans:repay");
  const canDeleteLoans = hasAppPermission(user.role, "loans:delete");

  const loanTypes = useMemo(() => Array.from(new Set((loanList.length ? loanList : dashboard?.recentLoans ?? []).map((loan) => loan.loanType))).sort(), [dashboard?.recentLoans, loanList]);

  const showSummary = activeView === "summary";
  const showLoans = activeView === "loans";
  const showBorrowers = activeView === "borrowers";
  const showContacts = activeView === "contacts";
  const showAccounting = activeView === "accounting";
  const showOperationReport = activeView === "operationReport";
  const showJournalItems = activeView === "journalItems";

  const navigateLoanLocation = useCallback((view: LoanDashboardView, options?: { loanId?: string; editLoanId?: string; newLoan?: boolean; account?: JournalViewAccount; returnView?: "loans" | "accounting" }) => {
    const params = new URLSearchParams(searchParams.toString());
    ["view", "loan", "editLoan", "openLoan", "newLoan", "accountCode", "accountName", "returnView"].forEach((key) => params.delete(key));
    if (view !== "summary") params.set("view", view);
    if (options?.loanId) params.set("loan", options.loanId);
    if (options?.editLoanId) params.set("editLoan", options.editLoanId);
    if (options?.newLoan) params.set("newLoan", "1");
    if (options?.account) {
      params.set("accountCode", options.account.code);
      params.set("accountName", options.account.name);
      params.set("returnView", options.returnView || "loans");
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  const openLoansDashboard = () => {
    setActiveView("loans");
    setEditingLoan(null);
    setSelectedLoan(null);
    setShowForm(false);
    navigateLoanLocation("loans");
    setTimeout(() => loansRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const openSummaryDashboard = () => {
    setActiveView("summary");
    setEditingLoan(null);
    setSelectedLoan(null);
    setShowForm(false);
    navigateLoanLocation("summary");
  };

  const openJournalItems = (account: JournalViewAccount, returnView: "loans" | "accounting" = "loans") => {
    setJournalAccount(account);
    setJournalReturnView(returnView);
    setEditingLoan(null);
    setSelectedLoan(null);
    setShowForm(false);
    setActiveView("journalItems");
    navigateLoanLocation("journalItems", { account, returnView });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openLoanRecord = (loan: LoanEntity) => {
    setActiveView("loans");
    setEditingLoan(null);
    setShowForm(false);
    setSelectedLoan(loan);
    navigateLoanLocation("loans", { loanId: loan.id });
    window.setTimeout(() => loanDetailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  };

  const openBorrowerLoan = (loan: LoanEntity) => {
    openLoanRecord(loan);
  };

  const deleteLoan = async (loan: LoanEntity) => {
    const loanName = loan.loanNumber || loan.borrower.fullName || "this loan";
    if (!window.confirm(`Delete ${loanName}? This action cannot be undone.`)) return false;

    setDeletingLoanId(loan.id);
    try {
      const response = await fetch(`/api/loan/loans/${loan.id}`, { method: "DELETE", credentials: "include" });
      const payload = await response.json().catch(() => null) as ApiResponse<unknown> | null;
      if (!response.ok || !payload?.success) throw new Error(payload?.error || "Could not delete loan");
      toastSuccess("Loan deleted successfully.");
      setRefreshKey((current) => current + 1);
      return true;
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Could not delete loan";
      toastError(message);
      return false;
    } finally {
      setDeletingLoanId(null);
    }
  };

  // Apply drilldown filters and open loans view
  const openDrilldown = (filters: { status?: LoanEntity["repaymentStatus"]; loanType?: string }) => {
    setDrilldownFilters(filters);
    if (filters.status) setStatusFilter(filters.status);
    if (filters.loanType) setLoanTypeFilter(filters.loanType);
    setActiveView("loans");
    navigateLoanLocation("loans");
    setTimeout(() => loansRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const filteredLoans = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const loans = loanList.length ? loanList : dashboard?.recentLoans ?? [];
    if (!loans.length) return [];
    return loans.filter((loan) => {
      const terminalStatuses: LoanEntity["repaymentStatus"][] = ["Closed", "Rejected", "Defaulted"];
      if (statusFilter && loan.repaymentStatus !== statusFilter) return false;
      if (loanTypeFilter && loan.loanType !== loanTypeFilter) return false;
      if (archivedOnly && !terminalStatuses.includes(loan.repaymentStatus)) return false;
      if (myLoansOnly) {
        const owners = [loan.createdBy, loan.loanOfficer].filter(Boolean).map((value) => value!.trim().toLowerCase());
        const currentUserNames = [user.username, user.full_name].filter(Boolean).map((value) => value!.trim().toLowerCase());
        if (!owners.some((owner) => currentUserNames.includes(owner))) return false;
      }
      if (loanListDateFilter) {
        const loanDate = new Date(`${loan.startDate.slice(0, 10)}T00:00:00`);
        if (Number.isNaN(loanDate.getTime())) return false;
        const now = new Date();
        const ranges: Record<Exclude<LoanListDateFilter, "">, [Date, Date]> = {
          today: [startOfDay(now), endOfDay(now)],
          week: [startOfWeek(now, { weekStartsOn: 1 }), endOfWeek(now, { weekStartsOn: 1 })],
          month: [startOfMonth(now), endOfMonth(now)],
          year: [startOfYear(now), endOfYear(now)],
        };
        const [from, to] = ranges[loanListDateFilter];
        if (loanDate < from || loanDate > to) return false;
      }
      if (customLoanFilter) {
        const rawValue = customLoanFilter.field === "loanNumber" ? loan.loanNumber ?? ""
          : customLoanFilter.field === "customer" ? loan.borrower.fullName
            : customLoanFilter.field === "loanType" ? loan.loanType
              : customLoanFilter.field === "repaymentStatus" ? loan.repaymentStatus
                : customLoanFilter.field === "principal" ? loan.principal
                  : loan.termMonths;
        if (typeof rawValue === "number") {
          const target = Number(customLoanFilter.value);
          if (!Number.isFinite(target)) return false;
          if (customLoanFilter.operator === "equals" && rawValue !== target) return false;
          if (customLoanFilter.operator === "greaterThan" && rawValue <= target) return false;
          if (customLoanFilter.operator === "lessThan" && rawValue >= target) return false;
          if (customLoanFilter.operator === "contains" && !String(rawValue).includes(customLoanFilter.value.trim())) return false;
        } else {
          const value = rawValue.toLowerCase();
          const target = customLoanFilter.value.trim().toLowerCase();
          if (customLoanFilter.operator === "equals" && value !== target) return false;
          if (customLoanFilter.operator !== "equals" && !value.includes(target)) return false;
        }
      }
      if (!query) return true;
      const text = `${loan.loanNumber ?? ""} ${loan.borrower.fullName} ${loan.loanType} ${loan.repaymentStatus}`.toLowerCase();
      return text.includes(query);
    });
  }, [archivedOnly, customLoanFilter, dashboard?.recentLoans, loanList, loanListDateFilter, loanTypeFilter, myLoansOnly, searchQuery, statusFilter, user.full_name, user.username]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterFrom) params.set("from", filterFrom);
      if (filterTo) params.set("to", filterTo);
      const url = params.toString() ? `/api/loan/dashboard?${params.toString()}` : "/api/loan/dashboard";
      const data = await api<LoanDashboardData>(url);
      setDashboard(data);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Could not load loan dashboard";
      setError(message);
      toastError(message);
    } finally {
      setLoading(false);
    }
  }, [filterFrom, filterTo]);

  useEffect(() => {
    const requestedView = searchParams.get("view");
    if (["borrowers", "contacts", "accounting", "operationReport", "journalItems"].includes(requestedView || "")) {
      setLoading(false);
      return;
    }
    void load();
  }, [load, refreshKey, searchParams]);

  useEffect(() => {
    const requestedView = searchParams.get("view");
    if (requestedView === "borrowers") {
      setActiveView("borrowers");
      setEditingLoan(null);
      setShowForm(false);
      setSelectedLoan(null);
    } else if (requestedView === "contacts") {
      setActiveView("contacts");
      setEditingLoan(null);
      setShowForm(false);
      setSelectedLoan(null);
    } else if (requestedView === "accounting") {
      setActiveView("accounting");
      setEditingLoan(null);
      setShowForm(false);
      setSelectedLoan(null);
    } else if (requestedView === "operationReport") {
      setActiveView("operationReport");
      setEditingLoan(null);
      setShowForm(false);
      setSelectedLoan(null);
    } else if (requestedView === "journalItems") {
      const accountCode = searchParams.get("accountCode");
      const accountName = searchParams.get("accountName");
      if (accountCode && accountName) {
        setJournalAccount({ code: accountCode, name: accountName });
        setJournalReturnView(searchParams.get("returnView") === "accounting" ? "accounting" : "loans");
        setActiveView("journalItems");
        setEditingLoan(null);
        setShowForm(false);
        setSelectedLoan(null);
      } else {
        setActiveView("accounting");
      }
    } else if (requestedView === "loans") {
      setActiveView("loans");
      if (!searchParams.get("loan") && !searchParams.get("editLoan") && !searchParams.get("openLoan") && searchParams.get("newLoan") !== "1") {
        setEditingLoan(null);
        setShowForm(false);
        setSelectedLoan(null);
      }
    } else {
      setActiveView("summary");
      setEditingLoan(null);
      setShowForm(false);
      setSelectedLoan(null);
    }
  }, [searchParams]);

  useEffect(() => {
    const requestedRecordLoanId = searchParams.get("loan");
    const requestedEditLoanId = searchParams.get("editLoan") || searchParams.get("openLoan");
    const requestedLoanId = requestedRecordLoanId || requestedEditLoanId;
    const requestedNewLoan = searchParams.get("newLoan") === "1";
    if (requestedNewLoan && canCreateLoans) {
      setActiveView("loans");
      setEditingLoan(null);
      setSelectedLoan(null);
      setShowForm(true);
      return;
    }
    if (!requestedLoanId || !/^\d+$/.test(requestedLoanId)) return;
    let active = true;
    void api<LoanDetail>(`/api/loan/loans/${requestedLoanId}`)
      .then((detail) => {
        if (!active) return;
        setActiveView("loans");
        if (requestedEditLoanId && canEditLoans) {
          setSelectedLoan(null);
          setEditingLoan(detail.loan);
          setShowForm(true);
        } else {
          setEditingLoan(null);
          setShowForm(false);
          setSelectedLoan(detail.loan);
        }
      })
      .catch((caught) => { if (active) toastError(caught instanceof Error ? caught.message : "Could not open source loan"); });
    return () => { active = false; };
  }, [canCreateLoans, canEditLoans, searchParams, toastError]);

  useEffect(() => {
    if (!showBorrowers) return;
    let active = true;
    setBorrowersLoading(true);
    api<LoanEntity[]>("/api/loan/loans?limit=200")
      .then((data) => { if (active) setBorrowerLoans(data); })
      .catch((caught) => { if (active) toastError(caught instanceof Error ? caught.message : "Could not load borrowers"); })
      .finally(() => { if (active) setBorrowersLoading(false); });
    return () => { active = false; };
  }, [showBorrowers, refreshKey]);

  useEffect(() => {
    if (!showLoans && !showOperationReport) return;
    if (!canViewLoans) {
      setLoanList([]);
      setLoanListLoading(false);
      return;
    }
    let active = true;
    setLoanListLoading(true);
    void api<LoanEntity[]>("/api/loan/loans?limit=500")
      .then((loans) => { if (active) setLoanList(loans); })
      .catch((caught) => { if (active) toastError(caught instanceof Error ? caught.message : "Could not load loans"); })
      .finally(() => { if (active) setLoanListLoading(false); });
    return () => { active = false; };
  }, [canViewLoans, refreshKey, showLoans, showOperationReport, toastError]);

  useEffect(() => {
    setPage(1);
  }, [archivedOnly, customLoanFilter, groupBy, loanListDateFilter, loanTypeFilter, myLoansOnly, searchQuery, statusFilter, filterFrom, filterTo]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (showDateFilter && dateFilterRef.current && !dateFilterRef.current.contains(event.target as Node)) {
        setShowDateFilter(false);
      }
      if (showLoanFilterMenu && loanFilterMenuRef.current && !loanFilterMenuRef.current.contains(event.target as Node)) {
        setShowLoanFilterMenu(false);
        setShowLoanDateMenu(false);
        setShowLoanTypeMenu(false);
        setShowCustomLoanFilter(false);
      }
      if (showLoanGroupMenu && loanGroupMenuRef.current && !loanGroupMenuRef.current.contains(event.target as Node)) {
        setShowLoanGroupMenu(false);
        setShowCustomLoanGroup(false);
      }
      if (showLoanBookmarks && loanBookmarksRef.current && !loanBookmarksRef.current.contains(event.target as Node)) {
        setShowLoanBookmarks(false);
      }
    }
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [showDateFilter, showLoanBookmarks, showLoanFilterMenu, showLoanGroupMenu]);

  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });

  function exportCSV(loans: LoanEntity[]) {
    if (!loans.length) return;
    const rows = loans.map((l) => ({
      id: l.id,
      loanNumber: l.loanNumber,
      fullName: l.borrower.fullName,
      phone: l.borrower.phone || "",
      email: l.borrower.email || "",
      loanType: l.loanType,
      principal: l.principal,
      interestRate: l.interestRate,
      termMonths: l.termMonths,
      status: l.status,
      startDate: l.startDate,
    }));
    const csv = [Object.keys(rows[0] || {}).join(","), ...rows.map((r) => Object.values(r).map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `loans-export-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // Handle CSV import
  async function handleImportCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) return;
      const headers = lines[0].split(",").map((h) => h.trim());
      type CsvRow = Record<string, string>;
      const parsed = lines.slice(1).map((line) => {
        const cols = line.split(",").map((c) => c.replace(/^"|"$/g, ""));
        const obj: CsvRow = {};
        headers.forEach((h, i) => { obj[h] = cols[i] ?? ""; });
        return obj as Partial<CreateLoanInput>;
      });
      setImportProgress({ done: parsed.length, total: parsed.length });
      // For safety, we just console.log parsed preview — integrating with API TODO
      // In future: batch upload via /api/loan/loans import endpoint
      console.info("Imported loans preview:", parsed.slice(0, 10));
      toastSuccess(`Imported ${parsed.length} rows (preview in console).`);
    } catch (err) {
      console.error(err);
      toastError("Failed to import CSV");
    } finally {
      setImporting(false);
    }
  }

  const totalRows = filteredLoans.length;
  const selectedLoanIndex = selectedLoan ? filteredLoans.findIndex((item) => item.id === selectedLoan.id) : -1;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const pageStart = totalRows === 0 ? 0 : (page - 1) * pageSize + 1;
  const pageEnd = Math.min(totalRows, page * pageSize);
  const pageLoans = filteredLoans.slice((page - 1) * pageSize, page * pageSize);

  const paginatedRows = useMemo(() => {
    const groups = new Map<string, LoanEntity[]>();
    if (groupBy === "none") {
      return pageLoans.map((loan) => ({ type: "loan" as const, loan }));
    }

    pageLoans.forEach((loan) => {
      let key = "Other";
      if (groupBy === "loanType") key = loan.loanType || "Other";
      else if (groupBy === "customer") key = loan.borrower.fullName || "Unknown customer";
      else if (groupBy === "creditOfficer") key = loan.loanOfficer || loan.createdBy || "Unassigned";
      else if (groupBy === "repaymentFrequency") key = loan.repaymentFrequency.replace(/(^|_)([a-z])/g, (_, prefix: string, letter: string) => `${prefix ? " " : ""}${letter.toUpperCase()}`);
      else if (groupBy === "repaymentStatus") key = loan.repaymentStatus;
      else if (groupBy === "term") key = `${loan.termMonths} Months`;
      else if (groupBy === "createdBy") key = loan.createdBy || "Unknown";
      else if (groupBy === "startMonth") key = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date(`${loan.startDate.slice(0, 10)}T00:00:00`));
      else if (groupBy === "amountBand") key = loan.principal < 1_000 ? "Under $1,000" : loan.principal < 5_000 ? "$1,000–$4,999" : loan.principal < 10_000 ? "$5,000–$9,999" : "$10,000 and above";
      const bucket = groups.get(key) ?? [];
      bucket.push(loan);
      groups.set(key, bucket);
    });

    return Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .flatMap(([groupKey, loans]) => [
        { type: "header" as const, label: `${({ loanType: "Type", customer: "Customer", creditOfficer: "Credit Officer", repaymentFrequency: "Method", repaymentStatus: "State", term: "Term", createdBy: "Created By", startMonth: "Start Month", amountBand: "Amount Range" } as Record<Exclude<LoanListGroupBy, "none">, string>)[groupBy]}: ${groupKey} (${loans.length})` },
        ...loans.map((loan) => ({ type: "loan" as const, loan })),
      ]);
  }, [groupBy, pageLoans]);
  const visibleLoanIds = pageLoans.map((loan) => loan.id);
  const allVisibleLoansSelected = visibleLoanIds.length > 0 && visibleLoanIds.every((id) => selectedLoanIds.has(id));

  function toggleVisibleLoanSelection(checked: boolean) {
    setSelectedLoanIds((current) => {
      const next = new Set(current);
      visibleLoanIds.forEach((id) => checked ? next.add(id) : next.delete(id));
      return next;
    });
  }

  const activeLoanFilterCount = [Boolean(statusFilter), Boolean(loanTypeFilter), myLoansOnly, archivedOnly, Boolean(loanListDateFilter), Boolean(customLoanFilter)].filter(Boolean).length;
  const activeGroupLabel = groupBy === "none" ? "Group By" : ({
    loanType: "Type",
    customer: "Customer",
    creditOfficer: "Credit Officer",
    repaymentFrequency: "Method",
    repaymentStatus: "State",
    term: "Term",
    createdBy: "Created By",
    startMonth: "Start Month",
    amountBand: "Amount Range",
  } as Record<Exclude<LoanListGroupBy, "none">, string>)[groupBy];

  function clearLoanListFilters() {
    setStatusFilter("");
    setLoanTypeFilter("");
    setMyLoansOnly(false);
    setArchivedOnly(false);
    setLoanListDateFilter("");
    setCustomLoanFilter(null);
  }

  function saveLoanBookmark() {
    window.localStorage.setItem("emerald-cash.loan-list-bookmark", JSON.stringify({ searchQuery, statusFilter, loanTypeFilter, myLoansOnly, archivedOnly, loanListDateFilter, customLoanFilter, groupBy }));
    setShowLoanBookmarks(false);
    toastSuccess("Loan list bookmark saved.");
  }

  function applyLoanBookmark() {
    try {
      const saved = JSON.parse(window.localStorage.getItem("emerald-cash.loan-list-bookmark") || "null") as Partial<{ searchQuery: string; statusFilter: LoanEntity["repaymentStatus"] | ""; loanTypeFilter: string; myLoansOnly: boolean; archivedOnly: boolean; loanListDateFilter: LoanListDateFilter; customLoanFilter: LoanListCustomFilter | null; groupBy: LoanListGroupBy }> | null;
      if (!saved) {
        toastInfo("No saved loan bookmark yet.");
        return;
      }
      setSearchQuery(saved.searchQuery || "");
      setStatusFilter(saved.statusFilter || "");
      setLoanTypeFilter(saved.loanTypeFilter || "");
      setMyLoansOnly(Boolean(saved.myLoansOnly));
      setArchivedOnly(Boolean(saved.archivedOnly));
      setLoanListDateFilter(saved.loanListDateFilter || "");
      setCustomLoanFilter(saved.customLoanFilter || null);
      setGroupBy(saved.groupBy || "none");
      setShowLoanBookmarks(false);
      toastSuccess("Loan list bookmark applied.");
    } catch {
      window.localStorage.removeItem("emerald-cash.loan-list-bookmark");
      toastWarning("The saved loan bookmark was invalid and has been cleared.");
    }
  }

  function clearLoanBookmark() {
    window.localStorage.removeItem("emerald-cash.loan-list-bookmark");
    setShowLoanBookmarks(false);
    toastSuccess("Loan list bookmark cleared.");
  }

  const totals = useMemo(() => {
    const stats = dashboard?.stats;
    return {
      loans: stats?.loans ?? 0,
      disbursed: stats?.totalDisbursed ?? 0,
      repayments: stats?.totalRepayments ?? 0,
      residual: stats?.totalOutstanding ?? 0,
      outstanding: stats?.totalOutstanding ?? 0,
      arrears: stats?.arrears ?? 0,
      collateralCount: stats?.collateralCount ?? 0,
      collateralValue: stats?.collateralValue ?? 0,
      collateralMarketValue: stats?.collateralMarketValue ?? 0,
    };
  }, [dashboard]);

  return (
    <div className="loan-system-flat-fields space-y-6 bg-slate-50/70 p-4 dark:bg-slate-950 sm:p-6">
      {!showSummary && !showLoans && !showJournalItems && !showContacts && !showAccounting && !showOperationReport ? (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Loan management</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Portfolio overview</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Monitor lending performance and take action from one workspace.</p>
        </div>
        <div className="relative flex flex-wrap items-center gap-2" ref={dateFilterRef}>
          {canCreateLoans ? (
            <button type="button" onClick={() => { setSelectedLoan(null); setEditingLoan(null); setActiveView("loans"); setShowForm(true); navigateLoanLocation("loans", { newLoan: true }); }} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-slate-950">
              <Plus className="h-4 w-4" /> New loan
            </button>
          ) : null}
          <button type="button" onClick={() => setShowDateFilter((current) => !current)} className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700/50 dark:bg-emerald-950/50 dark:text-emerald-200 dark:hover:bg-emerald-900/80">
            <CalendarDays className="h-4 w-4 text-emerald-700" />
            {DATE_FILTER_OPTIONS.find((option) => option.value === dateFilterOption)?.label ?? "Date Filter"}
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-700 text-xs text-white">▾</span>
          </button>
          <button type="button" onClick={() => setRefreshKey((current) => current + 1)} className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700/50 dark:bg-emerald-950/50 dark:text-emerald-200 dark:hover:bg-emerald-900/80">
            <RefreshCw className="h-4 w-4 text-emerald-700" /> Refresh
          </button>
          {showDateFilter ? (
            <div className="absolute right-0 top-full z-30 mt-3 w-[22rem] overflow-visible rounded-[28px] border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
              <div className="p-4">
                <div className="grid gap-1">
                  {DATE_FILTER_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setDateFilterOption(option.value);
                        if (option.value !== "custom") {
                          const range = applyDateFilterOption(option.value);
                          setFilterFrom(range.from);
                          setFilterTo(range.to);
                          setShowDateFilter(false);
                          setRefreshKey((current) => current + 1);
                        }
                      }}
                      className={`w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${dateFilterOption === option.value ? "bg-emerald-600 text-white" : "bg-slate-50 text-slate-800 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"}`}>
                      {option.label}
                    </button>
                  ))}
                </div>
                {dateFilterOption === "custom" ? (
                  <div className="mt-4 rounded-[24px] bg-slate-50 p-4 dark:bg-slate-900">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">From</span>
                        <DateInput title="From" value={filterFrom} onChange={setFilterFrom} max={filterTo || undefined} className={inputClass} />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">To</span>
                        <DateInput title="To" value={filterTo} onChange={setFilterTo} min={filterFrom || undefined} className={inputClass} />
                      </label>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <button type="button" onClick={() => { setShowDateFilter(false); setRefreshKey((current) => current + 1); }} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
                        Apply
                      </button>
                      <button type="button" onClick={() => { setDateFilterOption("all_time"); setFilterFrom(""); setFilterTo(""); setShowDateFilter(false); setRefreshKey((current) => current + 1); }} className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700/50 dark:text-emerald-200 dark:hover:bg-emerald-900/80">
                        Clear
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
      ) : null}

      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">{error}</div> : null}

      {showSummary ? (
        <Card className="flex overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 xl:h-[calc(100vh-7rem)] xl:min-h-[42rem] xl:flex-col">
          <div className="flex min-h-[5.5rem] shrink-0 flex-wrap items-center justify-between gap-4 border-b border-slate-300 px-6 py-4 dark:border-slate-800">
            <h1 className="text-3xl font-medium leading-none tracking-normal text-slate-700 dark:text-slate-100">Dashboard</h1>
            <div className="relative" ref={dateFilterRef}>
              <button type="button" onClick={() => setShowDateFilter((current) => !current)} className="inline-flex min-h-12 items-center gap-3 rounded-full bg-emerald-600 px-5 py-2.5 text-lg font-bold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-slate-950">
                <CalendarDays className="h-6 w-6" />
                Date Filter
                <ChevronDown className={`h-5 w-5 transition ${showDateFilter ? "rotate-180" : ""}`} />
              </button>
              {showDateFilter ? (
                <div className="absolute right-0 top-full z-30 mt-2 w-72 overflow-visible rounded-sm border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950">
                  <div className="max-h-[28rem] overflow-y-auto py-2">
                    {DATE_FILTER_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setDateFilterOption(option.value);
                          if (option.value !== "custom") {
                            const range = applyDateFilterOption(option.value);
                            setFilterFrom(range.from);
                            setFilterTo(range.to);
                            setShowDateFilter(false);
                            setRefreshKey((current) => current + 1);
                          }
                        }}
                        className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-base font-semibold transition ${dateFilterOption === option.value ? "text-slate-900 dark:text-white" : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900"}`}
                      >
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center">{dateFilterOption === option.value ? <Check className="h-5 w-5 text-emerald-600" /> : null}</span>
                        {option.label}
                      </button>
                    ))}
                  </div>
                  {dateFilterOption === "custom" ? (
                    <div className="border-t border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                      <div className="grid gap-3">
                        <label className="block">
                          <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">From</span>
                          <DateInput title="From" value={filterFrom} onChange={setFilterFrom} max={filterTo || undefined} className={inputClass} />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">To</span>
                          <DateInput title="To" value={filterTo} onChange={setFilterTo} min={filterFrom || undefined} className={inputClass} />
                        </label>
                      </div>
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <button type="button" onClick={() => { setShowDateFilter(false); setRefreshKey((current) => current + 1); }} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
                          Apply
                        </button>
                        <button type="button" onClick={() => { setDateFilterOption("all_time"); setFilterFrom(""); setFilterTo(""); setShowDateFilter(false); setRefreshKey((current) => current + 1); }} className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700/50 dark:text-emerald-200 dark:hover:bg-emerald-900/80">
                          Clear
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-5 bg-white p-5 dark:bg-slate-950/40">
            <div className="grid shrink-0 grid-cols-1 gap-5 lg:grid-cols-2 xl:h-[clamp(8rem,16vh,10rem)] xl:grid-cols-5">
              <DashboardMetricCard className="h-36 xl:h-full" label="Loans" value={shortNumber(totals.loans)} onClick={() => openDrilldown({})} />
              <DashboardMetricCard className="h-36 xl:h-full" label="Disbursements" value={shortCurrency(totals.disbursed)} onClick={() => openDrilldown({})} />
              <DashboardMetricCard className="h-36 xl:h-full" label="Repayments" value={shortCurrency(totals.repayments)} onClick={() => openDrilldown({})} />
              <DashboardMetricCard className="h-36 xl:h-full" label="Residual" value={shortCurrency(totals.residual)} onClick={() => openDrilldown({})} />
              <DashboardMetricCard className="h-36 xl:h-full" label="ARREARS" value={shortNumber(totals.arrears)} onClick={() => openDrilldown({ status: "Overdue" as LoanEntity["repaymentStatus"] })} />
            </div>

            <div className="grid min-h-0 w-full flex-1 grid-cols-1 gap-5 xl:grid-cols-5">
              <div className="grid min-h-0 gap-5 xl:col-span-2 xl:grid-rows-3">
                <DashboardMetricCard wide className="h-36 xl:h-full" label="Collaterals Count" value={shortNumber(totals.collateralCount)} onClick={openLoansDashboard} />
                <DashboardMetricCard wide className="h-36 xl:h-full" label="Collaterals" value={shortCurrency(totals.collateralValue)} onClick={openLoansDashboard} />
                <DashboardMetricCard wide className="h-36 xl:h-full" label="Collaterals Market Value" value={shortCurrency(totals.collateralMarketValue)} onClick={openLoansDashboard} />
              </div>

              <Card className="flex min-h-[28rem] flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/70 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none xl:col-span-3 xl:min-h-0">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold tracking-normal text-slate-900 dark:text-white">Revenue Performance</h2>
                </div>
                <div className="mt-5 min-h-0 flex-1 rounded-sm bg-slate-50/40 p-4 dark:bg-slate-950/30">
                  <div className="mb-2 flex items-center justify-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                    <span className="h-5 w-5 rounded-full bg-emerald-600" />
                    Base Revenue
                  </div>
                  {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
                  {/* @ts-ignore */}
                  <LoanRevenueChart data={(dashboard?.revenue ?? []).map((r) => ({ name: r.label, value: r.value }))} />
                </div>
              </Card>
            </div>
          </div>
        </Card>
      ) : showLoans ? (
        <div ref={loansRef}>
          {!showForm && !selectedLoan ? (
            <div className="overflow-visible rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950 xl:flex xl:h-[calc(100vh-7rem)] xl:min-h-[42rem] xl:flex-col">
                <div className="grid gap-5 border-b border-slate-200 px-5 py-5 dark:border-slate-800 lg:grid-cols-[1fr_1.1fr] lg:px-7">
                  <div className="flex flex-col justify-between gap-5">
                    <div className="flex items-center gap-2 text-2xl font-medium tracking-tight text-slate-800 dark:text-slate-100">
                      <button type="button" onClick={openSummaryDashboard} className="transition hover:text-emerald-700 dark:hover:text-emerald-300">Dashboard Action</button>
                      <span className="text-slate-400">/</span>
                      <span>Loans</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      {canCreateLoans ? <button type="button" onClick={() => { setSelectedLoan(null); setEditingLoan(null); setShowForm(true); navigateLoanLocation("loans", { newLoan: true }); }} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"><SquarePlus className="h-4 w-4" /> Create</button> : null}
                      <label htmlFor="loan-import" className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
                        <Download className="h-4 w-4" /> Import
                      </label>
                      <input id="loan-import" type="file" accept=".csv,text/csv" onChange={handleImportCSV} className="sr-only" aria-hidden="true" />
                      <button type="button" onClick={() => exportCSV(filteredLoans)} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
                        <Upload className="h-4 w-4" /> Export
                      </button>
                    </div>
                  </div>
                  <div className="flex min-w-0 flex-col justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                    <div ref={loanBookmarksRef} className="relative shrink-0">
                      <button type="button" onClick={() => setShowLoanBookmarks((current) => !current)} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700">
                        <CalendarDays className="h-4 w-4" /> Bookmarks <ChevronDown className={`h-4 w-4 transition ${showLoanBookmarks ? "rotate-180" : ""}`} />
                      </button>
                      {showLoanBookmarks ? <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-2 shadow-xl dark:border-slate-700 dark:bg-slate-950"><button type="button" onClick={applyLoanBookmark} className="block w-full px-4 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-900">Apply saved view</button><button type="button" onClick={saveLoanBookmark} className="block w-full px-4 py-2.5 text-left text-sm font-semibold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/30">Save current view</button><button type="button" onClick={clearLoanBookmark} className="block w-full border-t border-slate-100 px-4 py-2.5 text-left text-sm font-semibold text-rose-600 hover:bg-rose-50 dark:border-slate-800 dark:text-rose-300 dark:hover:bg-rose-950/20">Clear bookmark</button></div> : null}
                    </div>
                      <div className="min-w-0 flex-1 border-b border-slate-300 px-1 transition focus-within:border-emerald-500 dark:border-slate-700">
                        <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Type to search" aria-label="Search loans" className="w-full appearance-none !rounded-none !border-0 !bg-transparent py-2.5 text-base font-medium text-slate-800 !shadow-none !outline-none placeholder:text-slate-400 focus:!border-0 focus:!shadow-none focus:!ring-0 dark:text-white" />
                      </div>
                    </div>
                <div className="flex flex-wrap items-center gap-3">
                      <span className="mr-1 text-sm font-semibold text-slate-600 dark:text-slate-300">{pageStart}-{pageEnd}</span>
                      <span className="text-slate-300 dark:text-slate-700">|</span>
                      <span className="mr-1 text-sm font-semibold text-slate-500">{totalRows}</span>
                      <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-full bg-slate-100 p-3 text-slate-600 hover:bg-slate-200 disabled:opacity-40 dark:bg-slate-800 dark:text-slate-300"><ChevronDown className="h-4 w-4 rotate-90" /></button>
                      <button type="button" aria-label="Next page" disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} className="mr-auto rounded-full bg-slate-100 p-3 text-slate-600 hover:bg-slate-200 disabled:opacity-40 dark:bg-slate-800 dark:text-slate-300"><ChevronDown className="h-4 w-4 -rotate-90" /></button>
                      <div ref={loanFilterMenuRef} className="relative">
                        <button
                          type="button"
                          aria-haspopup="menu"
                          aria-expanded={showLoanFilterMenu}
                          onClick={() => { setShowLoanFilterMenu((current) => !current); setShowLoanGroupMenu(false); }}
                          className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition ${showLoanFilterMenu || activeLoanFilterCount ? "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700" : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"}`}
                        >
                          <Filter className="h-4 w-4" /> Filters
                          {activeLoanFilterCount ? <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white/20 px-1.5 text-xs">{activeLoanFilterCount}</span> : null}
                          <ChevronDown className={`h-4 w-4 transition ${showLoanFilterMenu ? "rotate-180" : ""}`} />
                        </button>
                        {showLoanFilterMenu ? (
                          <div role="menu" className="absolute right-0 top-full z-[100] mt-2 max-h-[calc(100vh-14rem)] w-80 overflow-y-auto overscroll-contain rounded-2xl border border-slate-200 bg-white py-2 shadow-2xl dark:border-slate-700 dark:bg-slate-950">
                            <button type="button" role="menuitemcheckbox" aria-checked={myLoansOnly} onClick={() => setMyLoansOnly((current) => !current)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-900"><span>My Loans</span>{myLoansOnly ? <Check className="h-4 w-4 text-emerald-600" /> : null}</button>
                            <div className="border-t border-slate-100 dark:border-slate-800" />
                            {(["Draft", "Pending", "Waiting", "Approved", "Progress", "Due Soon", "Overdue", "Closed", "Rejected", "Defaulted"] as LoanEntity["repaymentStatus"][]).map((status) => (
                              <button key={status} type="button" role="menuitemradio" aria-checked={statusFilter === status} onClick={() => { setStatusFilter((current) => current === status ? "" : status); setArchivedOnly(false); }} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-900"><span>{status}</span>{statusFilter === status ? <Check className="h-4 w-4 text-emerald-600" /> : null}</button>
                            ))}
                            <div className="border-t border-slate-100 dark:border-slate-800" />
                            <button type="button" onClick={() => setShowLoanDateMenu((current) => !current)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-900"><span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4" /> Date{loanListDateFilter ? ` · ${{ today: "Today", week: "This Week", month: "This Month", year: "This Year" }[loanListDateFilter]}` : ""}</span><ChevronDown className={`h-4 w-4 transition ${showLoanDateMenu ? "rotate-180" : "-rotate-90"}`} /></button>
                            {showLoanDateMenu ? <div className="bg-slate-50 px-2 py-1 dark:bg-slate-900/70">{([['today', 'Today'], ['week', 'This Week'], ['month', 'This Month'], ['year', 'This Year']] as [Exclude<LoanListDateFilter, "">, string][]).map(([value, label]) => <button key={value} type="button" onClick={() => setLoanListDateFilter((current) => current === value ? "" : value)} className="flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-white dark:text-slate-200 dark:hover:bg-slate-800"><span>{label}</span>{loanListDateFilter === value ? <Check className="h-4 w-4 text-emerald-600" /> : null}</button>)}</div> : null}
                            <button type="button" onClick={() => setShowLoanTypeMenu((current) => !current)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-900"><span>Loan Type{loanTypeFilter ? ` · ${loanTypeFilter}` : ""}</span><ChevronDown className={`h-4 w-4 transition ${showLoanTypeMenu ? "rotate-180" : "-rotate-90"}`} /></button>
                            {showLoanTypeMenu ? <div className="max-h-52 overflow-y-auto bg-slate-50 px-2 py-1 dark:bg-slate-900/70">{loanTypes.map((type) => <button key={type} type="button" onClick={() => setLoanTypeFilter((current) => current === type ? "" : type)} className="flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-white dark:text-slate-200 dark:hover:bg-slate-800"><span className="truncate">{type}</span>{loanTypeFilter === type ? <Check className="h-4 w-4 shrink-0 text-emerald-600" /> : null}</button>)}</div> : null}
                            <button type="button" role="menuitemcheckbox" aria-checked={archivedOnly} onClick={() => { setArchivedOnly((current) => !current); setStatusFilter(""); }} className="flex w-full items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"><span>Archived</span>{archivedOnly ? <Check className="h-4 w-4 text-emerald-600" /> : null}</button>
                            <button type="button" onClick={() => setShowCustomLoanFilter((current) => !current)} className="flex w-full items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-left text-sm font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-slate-800 dark:text-emerald-300 dark:hover:bg-emerald-950/30"><span>Add Custom Filter</span><Plus className="h-4 w-4" /></button>
                            {showCustomLoanFilter ? (
                              <div className="space-y-2 border-t border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
                                <select aria-label="Custom filter field" value={customLoanFilterDraft.field} onChange={(event) => { const field = event.target.value as LoanListCustomField; setCustomLoanFilterDraft((current) => ({ ...current, field, operator: field === "principal" || field === "termMonths" ? "equals" : "contains" })); }} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"><option value="loanNumber">Loan Number</option><option value="customer">Customer</option><option value="loanType">Loan Type</option><option value="repaymentStatus">Status</option><option value="principal">Loan Amount</option><option value="termMonths">Loan Term</option></select>
                                <select aria-label="Custom filter operator" value={customLoanFilterDraft.operator} onChange={(event) => setCustomLoanFilterDraft((current) => ({ ...current, operator: event.target.value as LoanListCustomOperator }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950">{customLoanFilterDraft.field === "principal" || customLoanFilterDraft.field === "termMonths" ? <><option value="equals">Equals</option><option value="greaterThan">Greater than</option><option value="lessThan">Less than</option></> : <><option value="contains">Contains</option><option value="equals">Equals</option></>}</select>
                                <input value={customLoanFilterDraft.value} onChange={(event) => setCustomLoanFilterDraft((current) => ({ ...current, value: event.target.value }))} type={customLoanFilterDraft.field === "principal" || customLoanFilterDraft.field === "termMonths" ? "number" : "text"} placeholder="Value" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950" />
                                <div className="flex gap-2"><button type="button" onClick={() => { if (!customLoanFilterDraft.value.trim()) { toastWarning("Enter a value for the custom filter."); return; } setCustomLoanFilter({ ...customLoanFilterDraft }); setShowLoanFilterMenu(false); setShowCustomLoanFilter(false); }} className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Apply</button>{customLoanFilter ? <button type="button" onClick={() => setCustomLoanFilter(null)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300">Remove</button> : null}</div>
                              </div>
                            ) : null}
                            {activeLoanFilterCount ? <button type="button" onClick={() => { clearLoanListFilters(); setShowLoanFilterMenu(false); }} className="w-full border-t border-slate-100 px-4 py-3 text-left text-sm font-semibold text-rose-600 hover:bg-rose-50 dark:border-slate-800 dark:text-rose-300 dark:hover:bg-rose-950/20">Clear all filters</button> : null}
                          </div>
                        ) : null}
                      </div>
                      <div ref={loanGroupMenuRef} className="relative">
                        <button type="button" aria-haspopup="menu" aria-expanded={showLoanGroupMenu} onClick={() => { setShowLoanGroupMenu((current) => !current); setShowLoanFilterMenu(false); }} className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition ${showLoanGroupMenu || groupBy !== "none" ? "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700" : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"}`}><FolderOpen className="h-4 w-4" /> {activeGroupLabel}<ChevronDown className={`h-4 w-4 transition ${showLoanGroupMenu ? "rotate-180" : ""}`} /></button>
                        {showLoanGroupMenu ? (
                          <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white py-2 shadow-2xl dark:border-slate-700 dark:bg-slate-950">
                            {([['loanType', 'Type'], ['customer', 'Customer'], ['creditOfficer', 'Credit Officer'], ['repaymentFrequency', 'Method'], ['repaymentStatus', 'State'], ['term', 'Term']] as [LoanListGroupBy, string][]).map(([value, label]) => <button key={value} type="button" role="menuitemradio" aria-checked={groupBy === value} onClick={() => { setGroupBy((current) => current === value ? "none" : value); setShowLoanGroupMenu(false); }} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-900"><span>{label}</span>{groupBy === value ? <Check className="h-4 w-4 text-emerald-600" /> : null}</button>)}
                            <button type="button" onClick={() => setShowCustomLoanGroup((current) => !current)} className="flex w-full items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-left text-sm font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-slate-800 dark:text-emerald-300 dark:hover:bg-emerald-950/30"><span>Add Custom Group</span><ChevronDown className={`h-4 w-4 transition ${showCustomLoanGroup ? "rotate-180" : "-rotate-90"}`} /></button>
                            {showCustomLoanGroup ? <div className="bg-slate-50 px-2 py-1 dark:bg-slate-900/70">{([['createdBy', 'Created By'], ['startMonth', 'Start Month'], ['amountBand', 'Amount Range']] as [LoanListGroupBy, string][]).map(([value, label]) => <button key={value} type="button" onClick={() => { setGroupBy(value); setShowLoanGroupMenu(false); setShowCustomLoanGroup(false); }} className="flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-white dark:text-slate-200 dark:hover:bg-slate-800"><span>{label}</span>{groupBy === value ? <Check className="h-4 w-4 text-emerald-600" /> : null}</button>)}</div> : null}
                            {groupBy !== "none" ? <button type="button" onClick={() => { setGroupBy("none"); setShowLoanGroupMenu(false); }} className="w-full border-t border-slate-100 px-4 py-3 text-left text-sm font-semibold text-rose-600 hover:bg-rose-50 dark:border-slate-800 dark:text-rose-300 dark:hover:bg-rose-950/20">Remove grouping</button> : null}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="min-h-0 p-4 lg:px-7 lg:pb-6 xl:flex-1">
                  {loading || loanListLoading ? (
                    <div className="mt-6 flex items-center justify-center rounded-2xl border border-dashed border-slate-300 p-8 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading loans...
                    </div>
                  ) : (
                    <>
                      <div className="overflow-auto rounded-xl border border-slate-200 dark:border-slate-800 xl:h-full">
                        <table className="min-w-full border-collapse text-left text-sm">
                          <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                            <tr>
                              <th className="w-16 px-4 py-4 text-center"><input type="checkbox" aria-label="Select all loans on this page" checked={allVisibleLoansSelected} onChange={(event) => toggleVisibleLoanSelection(event.target.checked)} className="h-5 w-5 rounded border-2 border-slate-400 text-emerald-600 focus:ring-emerald-500" /></th>
                              <th className="px-4 py-3 font-semibold">Number</th>
                              <th className="px-4 py-3 font-semibold">Date</th>
                              <th className="px-4 py-3 font-semibold">Customer</th>
                              <th className="px-4 py-3 font-semibold">Loan Amount</th>
                              <th className="px-4 py-3 font-semibold">Loan Term</th>
                              <th className="px-4 py-3 font-semibold">Loan Range</th>
                              <th className="px-4 py-3 font-semibold">Status</th>
                              <th className="w-14 px-4 py-3 text-center"><MoreVertical className="mx-auto h-5 w-5" aria-label="Row actions" /></th>
                            </tr>
                          </thead>
                          <tbody>
                            {paginatedRows.length ? paginatedRows.map((row, index) => (
                              row.type === "header" ? (
                                <tr key={`header-${index}`} className="bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300">
                                  <td colSpan={9} className="px-4 py-3 text-sm font-semibold">{row.label}</td>
                                </tr>
                              ) : (
                                <tr
                                  key={row.loan.id}
                                  tabIndex={0}
                                  role="button"
                                  aria-label={`Open loan form for ${row.loan.borrower.fullName}`}
                                  onClick={() => openLoanRecord(row.loan)}
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter" || event.key === " ") {
                                      event.preventDefault();
                                      openLoanRecord(row.loan);
                                    }
                                  }}
                                  className="group cursor-pointer border-t border-slate-200 bg-white transition hover:bg-emerald-50/50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-emerald-950/20"
                                >
                                  <td className="px-4 py-4 text-center"><input type="checkbox" aria-label={`Select ${row.loan.loanNumber || row.loan.borrower.fullName}`} checked={selectedLoanIds.has(row.loan.id)} onClick={(event) => event.stopPropagation()} onChange={(event) => { const checked = event.target.checked; setSelectedLoanIds((current) => { const next = new Set(current); if (checked) next.add(row.loan.id); else next.delete(row.loan.id); return next; }); }} className="h-5 w-5 rounded border-2 border-slate-400 text-emerald-600 focus:ring-emerald-500" /></td>
                                  <td className={`px-4 py-4 whitespace-nowrap ${row.loan.repaymentStatus === "Draft" ? "text-emerald-600 dark:text-emerald-300" : "text-slate-600 dark:text-slate-300"}`}>{row.loan.loanNumber || "/"}</td>
                                  <td className={`px-4 py-4 whitespace-nowrap ${row.loan.repaymentStatus === "Draft" ? "text-emerald-600 dark:text-emerald-300" : "text-slate-500 dark:text-slate-400"}`}>{formatLoanListDate(row.loan.startDate, row.loan.createdAt)}</td>
                                  <td className={`px-4 py-4 whitespace-nowrap ${row.loan.repaymentStatus === "Draft" ? "text-emerald-600 dark:text-emerald-300" : "text-slate-900 dark:text-slate-100"}`}>{row.loan.borrower.fullName}</td>
                                  <td className={`px-4 py-4 whitespace-nowrap ${row.loan.repaymentStatus === "Draft" ? "text-emerald-600 dark:text-emerald-300" : "text-slate-900 dark:text-slate-100"}`}>{formatLoanListCurrency(row.loan.principal)}</td>
                                  <td className={`px-4 py-4 whitespace-nowrap ${row.loan.repaymentStatus === "Draft" ? "text-emerald-600 dark:text-emerald-300" : "text-slate-900 dark:text-slate-100"}`}>{row.loan.termMonths}</td>
                                  <td className={`px-4 py-4 whitespace-nowrap ${row.loan.repaymentStatus === "Draft" ? "text-emerald-600 dark:text-emerald-300" : "text-slate-500 dark:text-slate-400"}`}>Months</td>
                                  <td className={`px-4 py-4 whitespace-nowrap font-medium ${row.loan.repaymentStatus === "Draft" ? "text-emerald-600 dark:text-emerald-300" : "text-slate-600 dark:text-slate-300"}`}>{row.loan.repaymentStatus}</td>
                                  <td className="px-4 py-4 text-center">{canDeleteLoans ? <button type="button" disabled={deletingLoanId === row.loan.id} onClick={(event) => { event.stopPropagation(); void deleteLoan(row.loan); }} title="Delete loan" aria-label={`Delete ${row.loan.loanNumber || row.loan.borrower.fullName}`} className="rounded-lg p-2 text-slate-400 opacity-0 transition hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100 focus:opacity-100 disabled:opacity-40 dark:hover:bg-rose-950/20"><MoreVertical className="h-4 w-4" /></button> : null}</td>
                                </tr>
                              )
                            )) : (
                              <tr>
                                <td colSpan={9} className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">No loans found yet.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              </div>
          ) : null}
          {selectedLoan && !showForm ? <div ref={loanDetailRef}><LoanDetailPanel
            loan={selectedLoan}
            canApprove={canApproveLoans}
            canDisburse={canDisburseLoans}
            canRepay={canRecordRepayments}
            canEdit={canEditLoans}
            canDelete={canDeleteLoans}
            onClose={() => { setSelectedLoan(null); navigateLoanLocation("loans"); }}
            onEdit={() => { setEditingLoan(selectedLoan); setSelectedLoan(null); setShowForm(true); navigateLoanLocation("loans", { editLoanId: selectedLoan.id }); }}
            onCreate={() => { setEditingLoan(null); setSelectedLoan(null); setShowForm(true); navigateLoanLocation("loans", { newLoan: true }); }}
            recordPosition={selectedLoanIndex >= 0 ? selectedLoanIndex + 1 : 1}
            recordTotal={totalRows}
            onPrevious={() => { if (selectedLoanIndex > 0) openLoanRecord(filteredLoans[selectedLoanIndex - 1]); }}
            onNext={() => { if (selectedLoanIndex >= 0 && selectedLoanIndex < filteredLoans.length - 1) openLoanRecord(filteredLoans[selectedLoanIndex + 1]); }}
            onDelete={() => { void (async () => { if (await deleteLoan(selectedLoan)) { setSelectedLoan(null); navigateLoanLocation("loans"); } })(); }}
            onChanged={() => setRefreshKey((current) => current + 1)}
          /></div> : null}
          {showForm ? (
            <div className="w-full">
              <LoanFormPanel loan={editingLoan} onClose={() => { setShowForm(false); setEditingLoan(null); navigateLoanLocation("loans"); }} onSaved={async () => { setRefreshKey((current) => current + 1); }} onOpenJournalItems={openJournalItems} />
            </div>
          ) : null}
        </div>
      ) : showBorrowers ? <BorrowerDirectory loans={borrowerLoans} loading={borrowersLoading} onOpenLoan={openBorrowerLoan} /> : showContacts ? <ContactDirectory canCreate={canCreateLoans} canEdit={canEditLoans} /> : showAccounting ? <AccountingDirectory onOpenJournalItems={(account) => openJournalItems(account, "accounting")} /> : showOperationReport ? <OperationReportView loans={loanList} loading={loanListLoading} canViewLoanData={canViewLoans} onRefresh={() => setRefreshKey((current) => current + 1)} onOpenLoan={openLoanRecord} /> : showJournalItems && journalAccount ? <JournalItemsView account={journalAccount} onBack={journalReturnView === "accounting" ? () => { setActiveView("accounting"); navigateLoanLocation("accounting"); } : openLoansDashboard} /> : null}

    </div>
  );
}
