import { dbManager } from "@/lib/db-singleton";

export const LOAN_STATUSES = ["draft", "pending", "waiting", "approved", "active", "closed", "rejected", "defaulted"] as const;
export type LoanStatus = (typeof LOAN_STATUSES)[number];

export const LOAN_APPROVAL_STAGES = ["draft", "submitted", "under_review", "manager_approval", "finance_approval", "ceo_approval", "approved", "cancelled"] as const;
export type LoanApprovalStage = (typeof LOAN_APPROVAL_STAGES)[number];

export const PAYMENT_METHODS = ["cash", "bank_transfer", "mobile_money", "other"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

type LoanDbRow = Record<string, unknown>;
export type CustomerProfile = Record<string, string>;
export type LoanTypeApprover = {
  username: string;
  name: string;
  required: boolean;
};
export type LoanChartAccount = {
  id: string;
  code: string;
  name: string;
  type: string;
  defaultTaxes: string | null;
  tags: string | null;
  accountGroup: string | null;
  accountCurrency: string | null;
  allowReconciliation: boolean;
  inactive: boolean;
};
export type LoanBankingAccount = {
  id: string;
  code: string;
  name: string;
  currency: string;
  balance: number;
  reconciled: number;
  allowReconciliation: boolean;
};
export type LoanJournalItem = {
  id: string;
  entryId: string;
  entryNumber: string;
  entryDate: string;
  sourceType: string;
  sourceId: string;
  reference: string | null;
  memo: string | null;
  accountId: string;
  accountCode: string;
  accountName: string;
  description: string | null;
  partnerName: string | null;
  debit: number;
  credit: number;
  postedBy: string | null;
};
export type LoanApprovalDecision = {
  id: string;
  username: string;
  role: string;
  action: "approve" | "reject" | "return";
  comment: string | null;
  createdAt: string;
};
export type LoanApprovalStep = {
  id: string;
  order: number;
  key: string;
  label: string;
  roles: string[];
  eligibleUsernames: string[];
  requiredApprovals: number;
  approvalCount: number;
  status: "pending" | "completed" | "rejected" | "returned";
  decisions: LoanApprovalDecision[];
};
export type LoanApprovalWorkflow = {
  status: "pending" | "approved" | "rejected" | "returned" | "disbursed";
  completedSteps: number;
  totalSteps: number;
  currentStep: LoanApprovalStep | null;
  steps: LoanApprovalStep[];
};
export type LoanTypeDefinition = {
  id: string;
  name: string;
  nameKhmer: string | null;
  approvers: LoanTypeApprover[];
  amountOffer: number;
  minOffer: number;
  maxOffer: number;
  approverRequired: boolean;
  contractTerms: string | null;
  currency: string;
  sequenceCode: string | null;
  incomeAccount: string | null;
  penaltyAccount: string | null;
  feeAccount: string | null;
  badDebtAccount: string | null;
};

export type LoanInformation = {
  amountToPayKHR: string | null;
  refinanceAmount: number;
  roadTaxFee: number;
  vehicleInspectionFee: number;
  taxStampFee: number;
  adminFee: number;
  withholdingFee: number;
  collateralCheckFee: number;
  loanFee: number;
  sourceLoan: string | null;
  penaltyRule: string | null;
  feeCharge: string | null;
};

export type LoanRelatedContact = {
  contactId: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  address1: string | null;
  address2: string | null;
  relation: string | null;
  type: string | null;
  limit: number | null;
};

export type LoanContactsInformation = {
  bm: string | null;
  collectionOfficer: string | null;
  loanSpecialist: string | null;
  coBorrowers: LoanRelatedContact[];
  brokers: LoanRelatedContact[];
  guarantors: LoanRelatedContact[];
};

const EMPTY_LOAN_CONTACTS: LoanContactsInformation = {
  bm: null,
  collectionOfficer: null,
  loanSpecialist: null,
  coBorrowers: [],
  brokers: [],
  guarantors: [],
};

function asLoanRelatedContact(value: unknown): LoanRelatedContact | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const name = asString(row.name).trim();
  if (!name) return null;
  const limitValue = asNumber(row.limit);
  return {
    contactId: cleanText(row.contactId == null ? null : asString(row.contactId)),
    name,
    phone: cleanText(row.phone == null ? null : asString(row.phone)),
    email: cleanText(row.email == null ? null : asString(row.email)),
    address1: cleanText(row.address1 == null ? null : asString(row.address1)),
    address2: cleanText(row.address2 == null ? null : asString(row.address2)),
    relation: cleanText(row.relation == null ? null : asString(row.relation)),
    type: cleanText(row.type == null ? null : asString(row.type)),
    limit: Number.isFinite(limitValue) ? Math.max(0, roundMoney(limitValue)) : null,
  };
}

function asLoanContacts(value: unknown): LoanContactsInformation {
  let parsed = value;
  if (typeof parsed === "string") {
    try { parsed = JSON.parse(parsed); } catch { parsed = {}; }
  }
  const row = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  const list = (key: "coBorrowers" | "brokers" | "guarantors") => Array.isArray(row[key]) ? row[key].flatMap((item) => {
    const contact = asLoanRelatedContact(item);
    return contact ? [contact] : [];
  }) : [];
  return {
    bm: cleanText(row.bm == null ? null : asString(row.bm)),
    collectionOfficer: cleanText(row.collectionOfficer == null ? null : asString(row.collectionOfficer)),
    loanSpecialist: cleanText(row.loanSpecialist == null ? null : asString(row.loanSpecialist)),
    coBorrowers: list("coBorrowers"),
    brokers: list("brokers"),
    guarantors: list("guarantors"),
  };
}

const EMPTY_LOAN_INFORMATION: LoanInformation = {
  amountToPayKHR: null,
  refinanceAmount: 0,
  roadTaxFee: 0,
  vehicleInspectionFee: 0,
  taxStampFee: 0,
  adminFee: 0,
  withholdingFee: 0,
  collateralCheckFee: 0,
  loanFee: 0,
  sourceLoan: null,
  penaltyRule: null,
  feeCharge: null,
};

function asLoanInformation(value: unknown): LoanInformation {
  let parsed = value;
  if (typeof parsed === "string") {
    try { parsed = JSON.parse(parsed); } catch { parsed = {}; }
  }
  const row = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  const amount = (key: keyof LoanInformation) => {
    const number = asNumber(row[key]);
    return Number.isFinite(number) ? Math.max(0, roundMoney(number)) : 0;
  };
  return {
    amountToPayKHR: cleanText(row.amountToPayKHR == null ? null : asString(row.amountToPayKHR)),
    refinanceAmount: amount("refinanceAmount"),
    roadTaxFee: amount("roadTaxFee"),
    vehicleInspectionFee: amount("vehicleInspectionFee"),
    taxStampFee: amount("taxStampFee"),
    adminFee: amount("adminFee"),
    withholdingFee: amount("withholdingFee"),
    collateralCheckFee: amount("collateralCheckFee"),
    loanFee: amount("loanFee"),
    sourceLoan: cleanText(row.sourceLoan == null ? null : asString(row.sourceLoan)),
    penaltyRule: cleanText(row.penaltyRule == null ? null : asString(row.penaltyRule)),
    feeCharge: cleanText(row.feeCharge == null ? null : asString(row.feeCharge)),
  };
}

function asCustomerProfile(value: unknown): CustomerProfile {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).filter(([, item]) => typeof item === "string")) as CustomerProfile;
  }
  if (typeof value === "string") {
    try { return asCustomerProfile(JSON.parse(value)); } catch { return {}; }
  }
  return {};
}

function asLoanTypeApprovers(value: unknown): LoanTypeApprover[] {
  let items = value;
  if (typeof items === "string") {
    try { items = JSON.parse(items); } catch { return []; }
  }
  if (!Array.isArray(items)) return [];
  return items.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const row = item as Record<string, unknown>;
    const username = asString(row.username).trim();
    if (!username) return [];
    return [{ username, name: asString(row.name).trim() || username, required: row.required === true || row.required === "true" }];
  });
}

function asStringList(value: unknown): string[] {
  let items = value;
  if (typeof items === "string") {
    try { items = JSON.parse(items); } catch { return []; }
  }
  return Array.isArray(items) ? items.map((item) => asString(item).trim()).filter(Boolean) : [];
}

export type LoanBorrower = {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  nationalId: string | null;
  address: string | null;
  occupation: string | null;
  income: number | null;
  guarantor: string | null;
  profile: CustomerProfile;
};

export type LoanContactInput = Omit<LoanBorrower, "id">;

export type LoanEntity = {
  id: string;
  loanNumber: string | null;
  borrower: LoanBorrower;
  loanType: string;
  principal: number;
  loanAmountKHR: string | null;
  interestRate: number;
  termMonths: number;
  repaymentFrequency: "daily" | "weekly" | "biweekly" | "semimonthly" | "monthly" | "quarterly" | "semiannual" | "yearly";
  interestModel: "flat" | "declining" | "equal_installments" | "balloon";
  formula: string | null;
  paymentAmount: number;
  totalPayable: number;
  outstandingBalance: number;
  branchLocation: string | null;
  loanOfficer: string | null;
  approvalStage: LoanApprovalStage;
  creditScore: number | null;
  status: LoanStatus;
  repaymentStatus: "Draft" | "Pending" | "Waiting" | "Approved" | "Progress" | "Due Soon" | "Overdue" | "Closed" | "Rejected" | "Defaulted";
  startDate: string;
  contractDate: string;
  contractDateLunar: string | null;
  contractEndDate: string;
  firstPaymentDate: string;
  nextPaymentDate: string | null;
  purpose: string | null;
  notes: string | null;
  loanInformation: LoanInformation;
  loanContacts: LoanContactsInformation;
  createdBy: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  disbursedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LoanScheduleItem = {
  id: string;
  installmentNumber: number;
  dueDate: string;
  amountDue: number;
  amountPaid: number;
  principalDue: number;
  interestDue: number;
  status: "scheduled" | "partial" | "paid";
};

export type LoanPayment = {
  id: string;
  paymentDate: string;
  amount: number;
  principalAmount: number;
  interestAmount: number;
  method: PaymentMethod;
  reference: string | null;
  notes: string | null;
  receivedBy: string | null;
  createdAt: string;
};

export type LoanCollateral = {
  id: string;
  type: string;
  description: string | null;
  reference: string | null;
  value: number;
  marketValue: number;
  createdAt: string;
};

export type CollateralInput = {
  type: string;
  description?: string | null;
  reference?: string | null;
  value: number;
  marketValue: number;
};

export type LoanDetail = {
  loan: LoanEntity;
  schedule: LoanScheduleItem[];
  payments: LoanPayment[];
  collaterals: LoanCollateral[];
  approvalWorkflow: LoanApprovalWorkflow;
};

export type LoanActivityType = "message" | "note" | "scheduled" | "attachment" | "system";

export type LoanActivity = {
  id: string;
  loanId: string;
  type: LoanActivityType;
  body: string | null;
  scheduledFor: string | null;
  attachmentName: string | null;
  attachmentUrl: string | null;
  createdBy: string;
  actorName: string;
  actorRole: string;
  createdAt: string;
};

export type LoanActivityFeed = {
  activities: LoanActivity[];
  followerCount: number;
  following: boolean;
};

export type CreateLoanActivityInput = {
  type: Exclude<LoanActivityType, "system">;
  body?: string | null;
  scheduledFor?: string | null;
  attachmentName?: string | null;
  attachmentUrl?: string | null;
};

export type CreateLoanInput = {
  /** Reuse a saved borrower when the user selects one from the customer picker. */
  borrowerId?: string | null;
  borrower: {
    fullName: string;
    phone?: string | null;
    email?: string | null;
    nationalId?: string | null;
    address?: string | null;
    occupation?: string | null;
    income?: number | null;
    guarantor?: string | null;
    profile?: CustomerProfile;
  };
  loanType: string;
  principal: number;
  loanAmountKHR?: string | null;
  interestRate: number;
  termMonths: number;
  repaymentFrequency?: LoanEntity["repaymentFrequency"];
  interestModel?: LoanEntity["interestModel"];
  formula?: string | null;
  branchLocation?: string | null;
  loanOfficer?: string | null;
  approvalStage?: LoanApprovalStage;
  creditScore?: number | null;
  startDate: string;
  contractDate: string;
  contractDateLunar?: string | null;
  contractEndDate: string;
  firstPaymentDate: string;
  purpose?: string | null;
  notes?: string | null;
  loanInformation?: Partial<LoanInformation>;
  loanContacts?: Partial<LoanContactsInformation>;
  collaterals?: CollateralInput[];
};

export type UpdateLoanInput = Partial<Omit<CreateLoanInput, "borrower">> & {
  borrower?: Partial<CreateLoanInput["borrower"]>;
};

export type RecordPaymentInput = {
  amount: number;
  paymentDate?: string;
  method?: PaymentMethod;
  reference?: string | null;
  notes?: string | null;
};

export type LoanDashboardData = {
  stats: {
    loans: number;
    activeLoans: number;
    pendingApprovals: number;
    totalDisbursed: number;
    totalRepayments: number;
    totalOutstanding: number;
    arrears: number;
    overdueLoans: number;
    collateralCount: number;
    collateralValue: number;
    collateralMarketValue: number;
    draftLoans: number;
  };
  portfolio: Array<{ label: string; value: number; color: string }>;
  repayment: Array<{ label: string; value: number; color: string }>;
  statusSummary: Array<{ label: string; value: number; color: string }>;
  branchPerformance: Array<{ branch: string; count: number; totalOutstanding: number }>;
  loanTypeDistribution: Array<{ label: string; value: number; color: string }>;
  collectionPerformance: Array<{ label: string; value: number; color: string }>;
  approvals: Array<{ id: string; borrower: string; amount: number; status: "Approved"; approvedAt: string | null }>;
  recentLoans: LoanEntity[];
  revenue: Array<{ month: string; label: string; value: number }>;
  loanTrend: Array<{ month: string; label: string; value: number }>;
};

export type LoanDashboardFilter = {
  from?: string;
  to?: string;
};

export type LoanListFilters = {
  search?: string;
  status?: LoanStatus;
  limit?: number;
};

type Installment = {
  installmentNumber: number;
  dueDate: string;
  amountDue: number;
  principalDue: number;
  interestDue: number;
};

const portfolioColors = ["#10b981", "#0ea5e9", "#f59e0b", "#8b5cf6", "#64748b"];
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function asNumber(value: unknown): number {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : 0;
}

function asString(value: unknown): string {
  return value == null ? "" : String(value);
}

function asDate(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const raw = String(value);
  return raw.length >= 10 ? raw.slice(0, 10) : raw;
}

function asDateTime(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function addDays(date: string, count: number): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + count);
  return parsed.toISOString().slice(0, 10);
}

function addMonths(date: string, count: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const candidate = new Date(Date.UTC(year, month - 1 + count, 1));
  const daysInTargetMonth = new Date(Date.UTC(candidate.getUTCFullYear(), candidate.getUTCMonth() + 1, 0)).getUTCDate();
  candidate.setUTCDate(Math.min(day, daysInTargetMonth));
  return candidate.toISOString().slice(0, 10);
}

function periodsPerYear(frequency: LoanEntity["repaymentFrequency"]): number {
  switch (frequency) {
    case "daily": return 365;
    case "weekly": return 52;
    case "biweekly": return 26;
    case "semimonthly": return 24;
    case "monthly": return 12;
    case "quarterly": return 4;
    case "semiannual": return 2;
    case "yearly": return 1;
    default: return 12;
  }
}

function intervalDays(frequency: LoanEntity["repaymentFrequency"]): number {
  switch (frequency) {
    case "daily": return 1;
    case "weekly": return 7;
    case "biweekly": return 14;
    case "semimonthly": return 15;
    default: return 0;
  }
}

function buildInstallments(input: Pick<CreateLoanInput, "principal" | "interestRate" | "termMonths" | "firstPaymentDate" | "repaymentFrequency" | "interestModel">): {
  monthlyPayment: number;
  totalPayable: number;
  installments: Installment[];
} {
  const repaymentFrequency = input.repaymentFrequency ?? "monthly";
  const interestModel = input.interestModel ?? "equal_installments";
  const periodsPerYearValue = periodsPerYear(repaymentFrequency);
  const installmentCount = Math.max(1, Math.round((input.termMonths / 12) * periodsPerYearValue));
  const periodRate = input.interestRate / 100 / periodsPerYearValue;
  const principal = roundMoney(input.principal);
  const installments: Installment[] = [];

  const calculateDueDate = (index: number): string => {
    if (repaymentFrequency === "daily" || repaymentFrequency === "weekly" || repaymentFrequency === "biweekly" || repaymentFrequency === "semimonthly") {
      return addDays(input.firstPaymentDate, intervalDays(repaymentFrequency) * index);
    }
    if (repaymentFrequency === "quarterly") {
      return addMonths(input.firstPaymentDate, index * 3);
    }
    if (repaymentFrequency === "yearly") {
      return addMonths(input.firstPaymentDate, index * 12);
    }
    if (repaymentFrequency === "semiannual") {
      return addMonths(input.firstPaymentDate, index * 6);
    }
    return addMonths(input.firstPaymentDate, index);
  };

  if (interestModel === "flat") {
    const totalInterest = roundMoney(principal * (input.interestRate / 100) * (input.termMonths / 12));
    const principalPortion = roundMoney(principal / installmentCount);
    const interestPortion = roundMoney(totalInterest / installmentCount);
    let remaining = principal;
    for (let installmentNumber = 1; installmentNumber <= installmentCount; installmentNumber += 1) {
      const isFinal = installmentNumber === installmentCount;
      const principalDue = isFinal ? remaining : principalPortion;
      const interestDue = isFinal ? roundMoney(totalInterest - interestPortion * (installmentCount - 1)) : interestPortion;
      const amountDue = roundMoney(principalDue + interestDue);
      remaining = roundMoney(remaining - principalDue);
      installments.push({ installmentNumber, dueDate: calculateDueDate(installmentNumber - 1), amountDue, principalDue, interestDue });
    }
  } else if (interestModel === "declining") {
    let balance = principal;
    const principalPortion = roundMoney(principal / installmentCount);
    for (let installmentNumber = 1; installmentNumber <= installmentCount; installmentNumber += 1) {
      const interestDue = roundMoney(balance * periodRate);
      const principalDue = installmentNumber === installmentCount ? balance : principalPortion;
      const amountDue = roundMoney(principalDue + interestDue);
      balance = roundMoney(balance - principalDue);
      installments.push({ installmentNumber, dueDate: calculateDueDate(installmentNumber - 1), amountDue, principalDue, interestDue });
    }
  } else if (interestModel === "balloon") {
    const interestDue = roundMoney(principal * periodRate);
    const installmentCountValue = installmentCount;
    for (let installmentNumber = 1; installmentNumber <= installmentCountValue; installmentNumber += 1) {
      const principalDue = installmentNumber === installmentCountValue ? principal : 0;
      const amountDue = roundMoney(principalDue + interestDue);
      installments.push({ installmentNumber, dueDate: calculateDueDate(installmentNumber - 1), amountDue, principalDue, interestDue });
    }
  } else {
    const payment = periodRate === 0
      ? roundMoney(principal / installmentCount)
      : roundMoney((principal * periodRate * (1 + periodRate) ** installmentCount) / ((1 + periodRate) ** installmentCount - 1));
    let balance = principal;
    for (let installmentNumber = 1; installmentNumber <= installmentCount; installmentNumber += 1) {
      const interestDue = roundMoney(balance * periodRate);
      const principalDue = installmentNumber === installmentCount ? balance : roundMoney(payment - interestDue);
      const amountDue = roundMoney(principalDue + interestDue);
      balance = roundMoney(balance - principalDue);
      installments.push({ installmentNumber, dueDate: calculateDueDate(installmentNumber - 1), amountDue, principalDue, interestDue });
    }
  }

  const totalPayable = roundMoney(installments.reduce((total, installment) => total + installment.amountDue, 0));
  return {
    monthlyPayment: installments[0]?.amountDue ?? 0,
    totalPayable,
    installments,
  };
}

function daysUntil(date: string | null): number | null {
  if (!date) return null;
  const today = new Date();
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const target = new Date(`${date}T00:00:00Z`).getTime();
  return Math.floor((target - todayUtc) / 86_400_000);
}

function isValidDate(value: string | undefined | null): value is string {
  return Boolean(value && datePattern.test(value) && !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime()));
}

function cleanText(value: string | null | undefined): string | null {
  const cleaned = value?.trim();
  return cleaned || null;
}

function normalizeCollateral(input: CollateralInput): CollateralInput {
  const type = cleanText(input.type);
  const value = roundMoney(input.value);
  const marketValue = roundMoney(input.marketValue);
  if (!type) throw new Error("Collateral type is required");
  if (!Number.isFinite(value) || value < 0) throw new Error("Collateral value cannot be negative");
  if (!Number.isFinite(marketValue) || marketValue < 0) throw new Error("Collateral market value cannot be negative");
  return {
    type,
    description: cleanText(input.description),
    reference: cleanText(input.reference),
    value,
    marketValue,
  };
}

function normalizeDashboardFilter(filter: LoanDashboardFilter): Required<LoanDashboardFilter> {
  const from = filter.from || "";
  const to = filter.to || "";
  if (from && !isValidDate(from)) throw new Error("Dashboard start date is invalid");
  if (to && !isValidDate(to)) throw new Error("Dashboard end date is invalid");
  if (from && to && from > to) throw new Error("Dashboard start date cannot be after the end date");
  return { from, to };
}

function dateCondition(column: string, filter: Required<LoanDashboardFilter>): { sql: string; params: string[] } {
  const params: string[] = [];
  const conditions: string[] = [];
  if (filter.from) {
    params.push(filter.from);
    conditions.push(`${column} >= $${params.length}::date`);
  }
  if (filter.to) {
    params.push(filter.to);
    conditions.push(`${column} <= $${params.length}::date`);
  }
  return { sql: conditions.length ? ` AND ${conditions.join(" AND ")}` : "", params };
}


function assertLoanInput(input: CreateLoanInput): void {
  if (!cleanText(input.borrower?.fullName)) throw new Error("Borrower name is required");
  if (!cleanText(input.loanType)) throw new Error("Loan type is required");
  if (!Number.isFinite(input.principal) || input.principal <= 0) throw new Error("Principal must be greater than zero");
  if (input.loanAmountKHR != null && input.loanAmountKHR.trim().length > 500) throw new Error("Loan amount KHR text is too long");
  if (!Number.isFinite(input.interestRate) || input.interestRate < 0 || input.interestRate > 100) {
    throw new Error("Interest rate must be between 0 and 100");
  }
  if (!Number.isInteger(input.termMonths) || input.termMonths < 1 || input.termMonths > 120) {
    throw new Error("Loan term must be between 1 and 120 months");
  }
  if (!isValidDate(input.startDate) || !isValidDate(input.contractDate) || !isValidDate(input.contractEndDate) || !isValidDate(input.firstPaymentDate)) {
    throw new Error("Valid loan, contract, contract-end, and first-payment dates are required");
  }
  if (input.contractEndDate < input.contractDate) {
    throw new Error("Contract end date cannot be before the contract date");
  }
  if (input.firstPaymentDate < input.startDate) {
    throw new Error("First payment date cannot be before the start date");
  }
  for (const collateral of input.collaterals || []) normalizeCollateral(collateral);
}

type ApprovalRule = {
  key: string;
  label: string;
  roles: string[];
  eligibleUsernames?: string[];
  requiredApprovals?: number;
};

function approvalRulesForLoan(loan: LoanEntity): ApprovalRule[] {
  const type = loan.loanType.trim().toLowerCase();
  const amount = loan.principal;
  const branchManager: ApprovalRule = { key: "branch_manager", label: "Branch Manager", roles: ["Manager / Approver"] };
  const financeManager: ApprovalRule = { key: "finance_manager", label: "Finance Manager", roles: ["Finance"] };
  const creditManager: ApprovalRule = { key: "credit_manager", label: "Credit Manager", roles: ["Manager / Approver"] };
  const chiefExecutive: ApprovalRule = { key: "chief_executive", label: "CEO / Credit Committee", roles: ["Executive Viewer"] };
  const collateralChecker: ApprovalRule = { key: "collateral_checker", label: "Collateral Checker", roles: ["Loan Operations"] };

  if (type.includes("pawn")) {
    if (amount <= 5_000) return [collateralChecker, branchManager];
    if (amount <= 10_000) return [collateralChecker, branchManager, creditManager];
    return [collateralChecker, branchManager, creditManager, chiefExecutive];
  }
  if (type.includes("bank")) {
    if (amount <= 10_000) return [branchManager, financeManager];
    if (amount <= 50_000) return [branchManager, financeManager, creditManager];
    return [branchManager, financeManager, creditManager, chiefExecutive];
  }
  if (type.includes("standard")) {
    if (amount <= 5_000) return [branchManager];
    if (amount <= 20_000) return [branchManager, financeManager];
    return [branchManager, financeManager, creditManager, chiefExecutive];
  }
  return [branchManager];
}

/**
 * Database-backed loan domain service. Tables are created lazily so deploying
 * the module does not require a separate manual migration step.
 */
export class LoanService {
  private static instance: LoanService | null = null;
  private static tablesReady = false;
  private static tablesPromise: Promise<void> | null = null;

  static getInstance(): LoanService {
    if (!LoanService.instance) LoanService.instance = new LoanService();
    return LoanService.instance;
  }

  private async ensureTables(): Promise<void> {
    if (LoanService.tablesReady) return;
    if (!LoanService.tablesPromise) {
      LoanService.tablesPromise = (async () => {
        await dbManager.executeUnsafe(`
          CREATE TABLE IF NOT EXISTS loan_borrowers (
            id BIGSERIAL PRIMARY KEY,
            full_name VARCHAR(160) NOT NULL,
            phone VARCHAR(48),
            email VARCHAR(255),
            national_id VARCHAR(100),
            address TEXT,
            occupation VARCHAR(120),
            income NUMERIC(14, 2),
            guarantor VARCHAR(160),
            profile JSONB NOT NULL DEFAULT '{}'::jsonb,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
          )
        `, [], 10_000);

          // Backfill missing borrower columns for older deployments that created
          // the table before these fields existed.
          await Promise.all([
            dbManager.executeUnsafe(`ALTER TABLE loan_borrowers ADD COLUMN IF NOT EXISTS occupation VARCHAR(120)`, [], 10_000),
            dbManager.executeUnsafe(`ALTER TABLE loan_borrowers ADD COLUMN IF NOT EXISTS income NUMERIC(14, 2)`, [], 10_000),
            dbManager.executeUnsafe(`ALTER TABLE loan_borrowers ADD COLUMN IF NOT EXISTS guarantor VARCHAR(160)`, [], 10_000),
            dbManager.executeUnsafe(`ALTER TABLE loan_borrowers ADD COLUMN IF NOT EXISTS profile JSONB NOT NULL DEFAULT '{}'::jsonb`, [], 10_000),
          ]);

        await dbManager.executeUnsafe(`
          CREATE TABLE IF NOT EXISTS loans (
            id BIGSERIAL PRIMARY KEY,
            loan_number VARCHAR(40) UNIQUE,
            borrower_id BIGINT NOT NULL REFERENCES loan_borrowers(id),
            loan_type VARCHAR(80) NOT NULL,
            principal NUMERIC(14, 2) NOT NULL CHECK (principal > 0),
            loan_amount_khr TEXT,
            interest_rate NUMERIC(8, 4) NOT NULL DEFAULT 0 CHECK (interest_rate >= 0),
            term_months INTEGER NOT NULL CHECK (term_months > 0),
            repayment_frequency VARCHAR(20) NOT NULL DEFAULT 'monthly',
            interest_model VARCHAR(20) NOT NULL DEFAULT 'equal_installments',
            formula VARCHAR(120),
            monthly_payment NUMERIC(14, 2) NOT NULL,
            total_payable NUMERIC(14, 2) NOT NULL,
            outstanding_balance NUMERIC(14, 2) NOT NULL,
            branch_location VARCHAR(120),
            loan_officer VARCHAR(120),
            approval_stage VARCHAR(32) NOT NULL DEFAULT 'draft',
            credit_score INTEGER,
            status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending','waiting','approved','active','closed','rejected','defaulted')),
            start_date DATE NOT NULL,
            contract_date DATE NOT NULL,
            contract_date_lunar VARCHAR(180),
            contract_end_date DATE NOT NULL,
            first_payment_date DATE NOT NULL,
            purpose TEXT,
            notes TEXT,
            loan_information JSONB NOT NULL DEFAULT '{}'::jsonb,
            loan_contacts JSONB NOT NULL DEFAULT '{}'::jsonb,
            created_by VARCHAR(128),
            approved_by VARCHAR(128),
            approved_at TIMESTAMP WITH TIME ZONE,
            disbursed_by VARCHAR(128),
            disbursed_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
          )
        `, [], 10_000);

        await dbManager.executeUnsafe(`
          CREATE TABLE IF NOT EXISTS loan_type_definitions (
            id BIGSERIAL PRIMARY KEY,
            name VARCHAR(120) NOT NULL UNIQUE,
            name_km VARCHAR(180),
            approvers JSONB NOT NULL DEFAULT '[]'::jsonb,
            amount_offer NUMERIC(14, 2) NOT NULL DEFAULT 0,
            min_offer NUMERIC(14, 2) NOT NULL DEFAULT 0,
            max_offer NUMERIC(14, 2) NOT NULL DEFAULT 0,
            approver_required BOOLEAN NOT NULL DEFAULT FALSE,
            contract_terms VARCHAR(120),
            currency VARCHAR(12) NOT NULL DEFAULT 'USD',
            sequence_code VARCHAR(120),
            income_account VARCHAR(180),
            penalty_account VARCHAR(180),
            fee_account VARCHAR(180),
            bad_debt_account VARCHAR(180),
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
          )
        `, [], 10_000);

        await dbManager.executeUnsafe(`
          CREATE TABLE IF NOT EXISTS loan_chart_accounts (
            id BIGSERIAL PRIMARY KEY,
            code VARCHAR(24) NOT NULL UNIQUE,
            name VARCHAR(180) NOT NULL,
            account_type VARCHAR(80) NOT NULL DEFAULT 'Current Assets',
            default_taxes VARCHAR(180),
            tags VARCHAR(180),
            account_group VARCHAR(180),
            account_currency VARCHAR(12),
            allow_reconciliation BOOLEAN NOT NULL DEFAULT FALSE,
            inactive BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
          )
        `, [], 10_000);

        await dbManager.executeUnsafe(`
          CREATE TABLE IF NOT EXISTS loan_approval_steps (
            id BIGSERIAL PRIMARY KEY,
            loan_id BIGINT NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
            step_order INTEGER NOT NULL,
            step_key VARCHAR(60) NOT NULL,
            step_label VARCHAR(120) NOT NULL,
            required_roles JSONB NOT NULL DEFAULT '[]'::jsonb,
            eligible_usernames JSONB NOT NULL DEFAULT '[]'::jsonb,
            required_approvals INTEGER NOT NULL DEFAULT 1 CHECK (required_approvals > 0),
            status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rejected', 'returned')),
            completed_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            UNIQUE (loan_id, step_order)
          )
        `, [], 10_000);

        await dbManager.executeUnsafe(`
          CREATE TABLE IF NOT EXISTS loan_approval_decisions (
            id BIGSERIAL PRIMARY KEY,
            step_id BIGINT NOT NULL REFERENCES loan_approval_steps(id) ON DELETE CASCADE,
            username VARCHAR(128) NOT NULL,
            actor_role VARCHAR(80) NOT NULL,
            action VARCHAR(20) NOT NULL CHECK (action IN ('approve', 'reject', 'return')),
            comment TEXT,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            UNIQUE (step_id, username)
          )
        `, [], 10_000);

        await dbManager.executeUnsafe(`
          INSERT INTO loan_chart_accounts (code, name, account_type, allow_reconciliation) VALUES
            ('101000', 'Cash and Bank', 'Bank and Cash', TRUE),
            ('103200', 'Allowance for Doubtful Accounts', 'Current Assets', TRUE),
            ('104100', 'Advances to Employee', 'Current Assets', TRUE),
            ('104200', 'Deposit', 'Current Assets', TRUE),
            ('104300', 'Gain / (Loss) on Currency Translation of Assets', 'Current Assets', FALSE),
            ('104999', 'Other Current Assets', 'Current Assets', TRUE),
            ('105100', 'Prepaid Rent', 'Current Assets', FALSE),
            ('105110', 'Prepaid Internet', 'Current Assets', FALSE),
            ('110000', 'Loan Receivable', 'Receivable', TRUE),
            ('401100', 'Interest Income', 'Income', FALSE),
            ('402100', 'Admin fee income', 'Income', FALSE),
            ('403100', 'Penalty income', 'Income', FALSE),
            ('604400', 'Written-off Bad Debts Expenses', 'Expense', FALSE)
          ON CONFLICT (code) DO NOTHING
        `, [], 10_000);

        // Banking cards shown in the loan accounting workspace. The cash code
        // is also used by automatic disbursement and repayment journal entries.
        await dbManager.executeUnsafe(`
          INSERT INTO loan_chart_accounts (code, name, account_type, account_currency, allow_reconciliation) VALUES
            ('101000', 'Cash', 'Bank and Cash', 'USD', TRUE),
            ('101010', 'Sathapana Bank', 'Bank and Cash', 'USD', TRUE),
            ('101020', 'Acleda Bank', 'Bank and Cash', 'USD', TRUE),
            ('101030', 'ABA Bank', 'Bank and Cash', 'USD', TRUE),
            ('101040', 'Exchange Difference', 'Bank and Cash', 'USD', TRUE)
          ON CONFLICT (code) DO UPDATE SET
            name = EXCLUDED.name,
            account_type = EXCLUDED.account_type,
            account_currency = EXCLUDED.account_currency,
            allow_reconciliation = EXCLUDED.allow_reconciliation,
            inactive = FALSE,
            updated_at = NOW()
        `, [], 10_000);

        await dbManager.executeUnsafe(`
          CREATE TABLE IF NOT EXISTS loan_journal_entries (
            id BIGSERIAL PRIMARY KEY,
            entry_number VARCHAR(80) NOT NULL UNIQUE,
            entry_date DATE NOT NULL,
            source_type VARCHAR(40) NOT NULL,
            source_id VARCHAR(80) NOT NULL,
            loan_id BIGINT REFERENCES loans(id) ON DELETE SET NULL,
            reference VARCHAR(160),
            memo TEXT,
            posted_by VARCHAR(128),
            status VARCHAR(20) NOT NULL DEFAULT 'posted' CHECK (status IN ('draft', 'posted', 'reversed')),
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            UNIQUE (source_type, source_id)
          )
        `, [], 10_000);

        await dbManager.executeUnsafe(`
          CREATE TABLE IF NOT EXISTS loan_journal_items (
            id BIGSERIAL PRIMARY KEY,
            journal_entry_id BIGINT NOT NULL REFERENCES loan_journal_entries(id) ON DELETE CASCADE,
            account_id BIGINT NOT NULL REFERENCES loan_chart_accounts(id),
            description TEXT,
            partner_name VARCHAR(180),
            debit NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (debit >= 0),
            credit NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (credit >= 0),
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            CHECK ((debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0))
          )
        `, [], 10_000);

        await Promise.all([
          dbManager.executeUnsafe(`ALTER TABLE loan_type_definitions ADD COLUMN IF NOT EXISTS name_km VARCHAR(180)`, [], 10_000),
          dbManager.executeUnsafe(`ALTER TABLE loan_type_definitions ADD COLUMN IF NOT EXISTS approvers JSONB NOT NULL DEFAULT '[]'::jsonb`, [], 10_000),
          dbManager.executeUnsafe(`ALTER TABLE loans ADD COLUMN IF NOT EXISTS branch_location VARCHAR(120)`, [], 10_000),
          dbManager.executeUnsafe(`ALTER TABLE loans ADD COLUMN IF NOT EXISTS loan_amount_khr TEXT`, [], 10_000),
          dbManager.executeUnsafe(`ALTER TABLE loans ADD COLUMN IF NOT EXISTS loan_officer VARCHAR(120)`, [], 10_000),
          dbManager.executeUnsafe(`ALTER TABLE loans ADD COLUMN IF NOT EXISTS interest_model VARCHAR(20) NOT NULL DEFAULT 'equal_installments'`, [], 10_000),
          dbManager.executeUnsafe(`ALTER TABLE loans ADD COLUMN IF NOT EXISTS formula VARCHAR(120)`, [], 10_000),
          dbManager.executeUnsafe(`ALTER TABLE loans ADD COLUMN IF NOT EXISTS approval_stage VARCHAR(32) NOT NULL DEFAULT 'draft'`, [], 10_000),
          dbManager.executeUnsafe(`ALTER TABLE loans ADD COLUMN IF NOT EXISTS credit_score INTEGER`, [], 10_000),
          dbManager.executeUnsafe(`ALTER TABLE loans ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'draft'`, [], 10_000),
          dbManager.executeUnsafe(`ALTER TABLE loans ADD COLUMN IF NOT EXISTS start_date DATE NOT NULL DEFAULT CURRENT_DATE`, [], 10_000),
          dbManager.executeUnsafe(`ALTER TABLE loans ADD COLUMN IF NOT EXISTS contract_date DATE NOT NULL DEFAULT CURRENT_DATE`, [], 10_000),
          dbManager.executeUnsafe(`ALTER TABLE loans ADD COLUMN IF NOT EXISTS contract_date_lunar VARCHAR(180)`, [], 10_000),
          dbManager.executeUnsafe(`ALTER TABLE loans ADD COLUMN IF NOT EXISTS loan_information JSONB NOT NULL DEFAULT '{}'::jsonb`, [], 10_000),
          dbManager.executeUnsafe(`ALTER TABLE loans ADD COLUMN IF NOT EXISTS loan_contacts JSONB NOT NULL DEFAULT '{}'::jsonb`, [], 10_000),
          dbManager.executeUnsafe(`ALTER TABLE loans ADD COLUMN IF NOT EXISTS contract_end_date DATE NOT NULL DEFAULT CURRENT_DATE`, [], 10_000),
          dbManager.executeUnsafe(`ALTER TABLE loans ADD COLUMN IF NOT EXISTS first_payment_date DATE NOT NULL DEFAULT CURRENT_DATE`, [], 10_000),
          dbManager.executeUnsafe(`ALTER TABLE loans ADD COLUMN IF NOT EXISTS purpose TEXT`, [], 10_000),
          dbManager.executeUnsafe(`ALTER TABLE loans ADD COLUMN IF NOT EXISTS notes TEXT`, [], 10_000),
          dbManager.executeUnsafe(`ALTER TABLE loans ADD COLUMN IF NOT EXISTS created_by VARCHAR(128)`, [], 10_000),
          dbManager.executeUnsafe(`ALTER TABLE loans ADD COLUMN IF NOT EXISTS approved_by VARCHAR(128)`, [], 10_000),
          dbManager.executeUnsafe(`ALTER TABLE loans ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE`, [], 10_000),
          dbManager.executeUnsafe(`ALTER TABLE loans ADD COLUMN IF NOT EXISTS disbursed_by VARCHAR(128)`, [], 10_000),
          dbManager.executeUnsafe(`ALTER TABLE loans ADD COLUMN IF NOT EXISTS disbursed_at TIMESTAMP WITH TIME ZONE`, [], 10_000),
        ]);

        await dbManager.executeUnsafe(`ALTER TABLE loans ALTER COLUMN loan_amount_khr TYPE TEXT USING loan_amount_khr::text`, [], 10_000);

        await dbManager.executeUnsafe(`
          CREATE TABLE IF NOT EXISTS loan_repayment_schedule (
            id BIGSERIAL PRIMARY KEY,
            loan_id BIGINT NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
            installment_number INTEGER NOT NULL,
            due_date DATE NOT NULL,
            amount_due NUMERIC(14, 2) NOT NULL,
            amount_paid NUMERIC(14, 2) NOT NULL DEFAULT 0,
            principal_due NUMERIC(14, 2) NOT NULL,
            interest_due NUMERIC(14, 2) NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'partial', 'paid')),
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            UNIQUE (loan_id, installment_number)
          )
        `, [], 10_000);

        await dbManager.executeUnsafe(`
          CREATE TABLE IF NOT EXISTS loan_payments (
            id BIGSERIAL PRIMARY KEY,
            loan_id BIGINT NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
            payment_date DATE NOT NULL,
            amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
            principal_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
            interest_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
            payment_method VARCHAR(30) NOT NULL DEFAULT 'cash',
            reference VARCHAR(160),
            notes TEXT,
            received_by VARCHAR(128),
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
          )
        `, [], 10_000);

        await dbManager.executeUnsafe(`
          CREATE TABLE IF NOT EXISTS loan_collaterals (
            id BIGSERIAL PRIMARY KEY,
            loan_id BIGINT NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
            collateral_type VARCHAR(100) NOT NULL,
            description TEXT,
            reference VARCHAR(160),
            estimated_value NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (estimated_value >= 0),
            market_value NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (market_value >= 0),
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
          )
        `, [], 10_000);

        await dbManager.executeUnsafe(`
          CREATE TABLE IF NOT EXISTS loan_activities (
            id BIGSERIAL PRIMARY KEY,
            loan_id BIGINT NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
            activity_type VARCHAR(20) NOT NULL CHECK (activity_type IN ('message','note','scheduled','attachment','system')),
            body TEXT,
            scheduled_for TIMESTAMP WITH TIME ZONE,
            attachment_name VARCHAR(255),
            attachment_url TEXT,
            created_by VARCHAR(128) NOT NULL,
            actor_name VARCHAR(180) NOT NULL,
            actor_role VARCHAR(80) NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
          )
        `, [], 10_000);

        await dbManager.executeUnsafe(`
          CREATE TABLE IF NOT EXISTS loan_followers (
            loan_id BIGINT NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
            username VARCHAR(128) NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            PRIMARY KEY (loan_id, username)
          )
        `, [], 10_000);

        // These additions keep deployments safe if an earlier version created
        // the payment table before revenue allocation was introduced.
        await Promise.all([
          dbManager.executeUnsafe(`ALTER TABLE loan_payments ADD COLUMN IF NOT EXISTS principal_amount NUMERIC(14, 2) NOT NULL DEFAULT 0`, [], 10_000),
          dbManager.executeUnsafe(`ALTER TABLE loan_payments ADD COLUMN IF NOT EXISTS interest_amount NUMERIC(14, 2) NOT NULL DEFAULT 0`, [], 10_000),
        ]);

        await Promise.all([
          dbManager.executeUnsafe(`CREATE INDEX IF NOT EXISTS idx_loans_status_created ON loans(status, created_at DESC)`, [], 10_000),
          dbManager.executeUnsafe(`CREATE INDEX IF NOT EXISTS idx_loans_borrower ON loans(borrower_id)`, [], 10_000),
          dbManager.executeUnsafe(`CREATE INDEX IF NOT EXISTS idx_loan_schedule_due ON loan_repayment_schedule(loan_id, due_date)`, [], 10_000),
          dbManager.executeUnsafe(`CREATE INDEX IF NOT EXISTS idx_loan_payments_loan ON loan_payments(loan_id, payment_date DESC)`, [], 10_000),
          dbManager.executeUnsafe(`CREATE INDEX IF NOT EXISTS idx_loan_collaterals_loan ON loan_collaterals(loan_id, created_at DESC)`, [], 10_000),
          dbManager.executeUnsafe(`CREATE INDEX IF NOT EXISTS idx_loan_activities_loan ON loan_activities(loan_id, created_at DESC)`, [], 10_000),
          dbManager.executeUnsafe(`CREATE INDEX IF NOT EXISTS idx_loan_journal_entries_loan ON loan_journal_entries(loan_id, entry_date DESC)`, [], 10_000),
          dbManager.executeUnsafe(`CREATE INDEX IF NOT EXISTS idx_loan_journal_items_account ON loan_journal_items(account_id, journal_entry_id)`, [], 10_000),
        ]);

        LoanService.tablesReady = true;
      })().finally(() => {
        LoanService.tablesPromise = null;
      });
    }
    await LoanService.tablesPromise;
  }

  private loanSelect(whereClause = ""): string {
    return `
      SELECT
        l.*,
        b.full_name AS borrower_full_name,
        b.phone AS borrower_phone,
        b.email AS borrower_email,
        b.national_id AS borrower_national_id,
        b.address AS borrower_address,
        b.occupation AS borrower_occupation,
        b.income AS borrower_income,
        b.guarantor AS borrower_guarantor,
        b.profile AS borrower_profile,
        (
          SELECT MIN(s.due_date)
          FROM loan_repayment_schedule s
          WHERE s.loan_id = l.id AND s.amount_paid < s.amount_due - 0.005
        ) AS next_payment_date,
        EXISTS(
          SELECT 1
          FROM loan_repayment_schedule s
          WHERE s.loan_id = l.id
            AND s.amount_paid < s.amount_due - 0.005
            AND s.due_date < CURRENT_DATE
        ) AS is_overdue
      FROM loans l
      INNER JOIN loan_borrowers b ON b.id = l.borrower_id
      ${whereClause}
    `;
  }

  private toLoan(row: LoanDbRow): LoanEntity {
    const status = asString(row.status) as LoanStatus;
    const nextPaymentDate = asDate(row.next_payment_date);

    let repaymentStatus: LoanEntity["repaymentStatus"];
    if (status === "draft") repaymentStatus = "Draft";
    else if (status === "pending") repaymentStatus = "Pending";
    else if (status === "waiting") repaymentStatus = "Waiting";
    else if (status === "approved") repaymentStatus = "Approved";
    else if (status === "closed") repaymentStatus = "Closed";
    else if (status === "rejected") repaymentStatus = "Rejected";
    else if (status === "defaulted") repaymentStatus = "Defaulted";
    else if (row.is_overdue === true || row.is_overdue === "true") repaymentStatus = "Overdue";
    else if ((daysUntil(nextPaymentDate) ?? Number.POSITIVE_INFINITY) <= 7) repaymentStatus = "Due Soon";
    else repaymentStatus = "Progress";

    return {
      id: asString(row.id),
      loanNumber: row.loan_number == null ? null : asString(row.loan_number),
      borrower: {
        id: asString(row.borrower_id),
        fullName: asString(row.borrower_full_name),
        phone: row.borrower_phone == null ? null : asString(row.borrower_phone),
        email: row.borrower_email == null ? null : asString(row.borrower_email),
        nationalId: row.borrower_national_id == null ? null : asString(row.borrower_national_id),
        address: row.borrower_address == null ? null : asString(row.borrower_address),
        occupation: row.borrower_occupation == null ? null : asString(row.borrower_occupation),
        income: row.borrower_income == null ? null : asNumber(row.borrower_income),
        guarantor: row.borrower_guarantor == null ? null : asString(row.borrower_guarantor),
        profile: asCustomerProfile(row.borrower_profile),
      },
      loanType: asString(row.loan_type),
      principal: asNumber(row.principal),
      loanAmountKHR: row.loan_amount_khr == null ? null : asString(row.loan_amount_khr),
      interestRate: asNumber(row.interest_rate),
      termMonths: asNumber(row.term_months),
      repaymentFrequency: (asString(row.repayment_frequency) as LoanEntity["repaymentFrequency"]) || "monthly",
      interestModel: (asString(row.interest_model) as LoanEntity["interestModel"]) || "equal_installments",
      formula: row.formula == null ? null : asString(row.formula),
      paymentAmount: asNumber(row.monthly_payment),
      totalPayable: asNumber(row.total_payable),
      outstandingBalance: asNumber(row.outstanding_balance),
      branchLocation: row.branch_location == null ? null : asString(row.branch_location),
      loanOfficer: row.loan_officer == null ? null : asString(row.loan_officer),
      approvalStage: (asString(row.approval_stage) as LoanApprovalStage) || "draft",
      creditScore: row.credit_score == null ? null : asNumber(row.credit_score),
      status,
      repaymentStatus,
      startDate: asDate(row.start_date) || "",
      contractDate: asDate(row.contract_date) || asDate(row.start_date) || "",
      contractDateLunar: row.contract_date_lunar == null ? null : asString(row.contract_date_lunar),
      contractEndDate: asDate(row.contract_end_date) || asDate(row.first_payment_date) || "",
      firstPaymentDate: asDate(row.first_payment_date) || "",
      nextPaymentDate,
      purpose: row.purpose == null ? null : asString(row.purpose),
      notes: row.notes == null ? null : asString(row.notes),
      loanInformation: asLoanInformation(row.loan_information),
      loanContacts: asLoanContacts(row.loan_contacts),
      createdBy: row.created_by == null ? null : asString(row.created_by),
      approvedBy: row.approved_by == null ? null : asString(row.approved_by),
      approvedAt: asDateTime(row.approved_at),
      disbursedAt: asDateTime(row.disbursed_at),
      createdAt: asDateTime(row.created_at) || "",
      updatedAt: asDateTime(row.updated_at) || "",
    };
  }

  async listLoans(filters: LoanListFilters = {}): Promise<LoanEntity[]> {
    await this.ensureTables();
    const clauses: string[] = [];
    const params: unknown[] = [];
    if (filters.status) {
      params.push(filters.status);
      clauses.push(`l.status = $${params.length}`);
    }
    if (filters.search?.trim()) {
      params.push(`%${filters.search.trim()}%`);
      const index = params.length;
      clauses.push(`(l.loan_number ILIKE $${index} OR b.full_name ILIKE $${index} OR b.phone ILIKE $${index})`);
    }
    const limit = Math.min(Math.max(Math.floor(filters.limit || 50), 1), 500);
    params.push(limit);
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const rows = await dbManager.executeUnsafe<LoanDbRow>(
      `${this.loanSelect(where)} ORDER BY l.created_at DESC LIMIT $${params.length}`,
      params,
      10_000
    );
    return rows.map((row) => this.toLoan(row));
  }

  /**
   * Customer picker data. This is deliberately separate from the loan list so
   * a user can find a remembered customer even when their older loans are not
   * in the current list page.
   */
  async searchBorrowers(search = "", limit = 8): Promise<LoanBorrower[]> {
    await this.ensureTables();
    const query = search.trim();
    const params: unknown[] = [];
    let where = "";
    if (query) {
      params.push(`%${query}%`);
      const index = params.length;
      where = `WHERE full_name ILIKE $${index} OR phone ILIKE $${index} OR email ILIKE $${index} OR national_id ILIKE $${index}`;
    }
    params.push(Math.min(Math.max(Math.floor(limit), 1), 200));
    const rows = await dbManager.executeUnsafe<LoanDbRow>(
      `SELECT id, full_name, phone, email, national_id, address, occupation, income, guarantor, profile
       FROM loan_borrowers ${where} ORDER BY updated_at DESC, id DESC LIMIT $${params.length}`,
      params,
      10_000
    );
    return rows.map((row) => ({
      id: asString(row.id),
      fullName: asString(row.full_name),
      phone: row.phone == null ? null : asString(row.phone),
      email: row.email == null ? null : asString(row.email),
      nationalId: row.national_id == null ? null : asString(row.national_id),
      address: row.address == null ? null : asString(row.address),
      occupation: row.occupation == null ? null : asString(row.occupation),
      income: row.income == null ? null : asNumber(row.income),
      guarantor: row.guarantor == null ? null : asString(row.guarantor),
      profile: asCustomerProfile(row.profile),
    }));
  }

  async saveContact(input: LoanContactInput, id?: string): Promise<LoanBorrower> {
    await this.ensureTables();
    const fullName = cleanText(input.fullName);
    if (!fullName) throw new Error("Contact name is required");
    const values = [
      fullName,
      cleanText(input.phone),
      cleanText(input.email),
      cleanText(input.nationalId),
      cleanText(input.address),
      cleanText(input.occupation),
      input.income == null ? null : roundMoney(input.income),
      cleanText(input.guarantor),
      JSON.stringify(input.profile || {}),
    ];
    const rows = id
      ? await dbManager.executeUnsafe<LoanDbRow>(
        `UPDATE loan_borrowers SET full_name = $1, phone = $2, email = $3, national_id = $4, address = $5, occupation = $6, income = $7, guarantor = $8, profile = $9::jsonb, updated_at = NOW() WHERE id = $10 RETURNING *`,
        [...values, id],
        10_000
      )
      : await dbManager.executeUnsafe<LoanDbRow>(
        `INSERT INTO loan_borrowers (full_name, phone, email, national_id, address, occupation, income, guarantor, profile) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb) RETURNING *`,
        values,
        10_000
      );
    const row = rows[0];
    if (!row) throw new Error(id ? "Contact could not be found" : "Contact could not be created");
    return {
      id: asString(row.id),
      fullName: asString(row.full_name),
      phone: row.phone == null ? null : asString(row.phone),
      email: row.email == null ? null : asString(row.email),
      nationalId: row.national_id == null ? null : asString(row.national_id),
      address: row.address == null ? null : asString(row.address),
      occupation: row.occupation == null ? null : asString(row.occupation),
      income: row.income == null ? null : asNumber(row.income),
      guarantor: row.guarantor == null ? null : asString(row.guarantor),
      profile: asCustomerProfile(row.profile),
    };
  }

  /** Loan types previously used by the organisation, for the editable picker. */
  async listLoanTypes(search = "", limit = 20): Promise<string[]> {
    await this.ensureTables();
    const query = search.trim();
    const params: unknown[] = [];
    const where = query ? (() => {
      params.push(`%${query}%`);
      return `WHERE name ILIKE $${params.length}`;
    })() : "";
    params.push(Math.min(Math.max(Math.floor(limit), 1), 50));
    const rows = await dbManager.executeUnsafe<LoanDbRow>(
      `SELECT name FROM (
         SELECT name FROM loan_type_definitions
         UNION
         SELECT loan_type AS name FROM loans
       ) loan_type_names ${where} ORDER BY name ASC LIMIT $${params.length}`,
      params,
      10_000
    );
    return rows.map((row) => asString(row.name)).filter(Boolean);
  }

  async listLoanTypeDefinitions(search = "", limit = 200): Promise<LoanTypeDefinition[]> {
    await this.ensureTables();
    const params: unknown[] = [];
    const query = search.trim();
    const where = query ? (() => { params.push(`%${query}%`); return `WHERE name ILIKE $${params.length}`; })() : "";
    params.push(Math.min(Math.max(Math.floor(limit), 1), 200));
    const rows = await dbManager.executeUnsafe<LoanDbRow>(`SELECT * FROM loan_type_definitions ${where} ORDER BY name ASC LIMIT $${params.length}`, params, 10_000);
    return rows.map((row) => ({ id: asString(row.id), name: asString(row.name), nameKhmer: row.name_km == null ? null : asString(row.name_km), approvers: asLoanTypeApprovers(row.approvers), amountOffer: asNumber(row.amount_offer), minOffer: asNumber(row.min_offer), maxOffer: asNumber(row.max_offer), approverRequired: row.approver_required === true || row.approver_required === "true", contractTerms: row.contract_terms == null ? null : asString(row.contract_terms), currency: asString(row.currency) || "USD", sequenceCode: row.sequence_code == null ? null : asString(row.sequence_code), incomeAccount: row.income_account == null ? null : asString(row.income_account), penaltyAccount: row.penalty_account == null ? null : asString(row.penalty_account), feeAccount: row.fee_account == null ? null : asString(row.fee_account), badDebtAccount: row.bad_debt_account == null ? null : asString(row.bad_debt_account) }));
  }

  async saveLoanTypeDefinition(input: Omit<LoanTypeDefinition, "id">): Promise<LoanTypeDefinition> {
    await this.ensureTables();
    const name = input.name.trim();
    if (!name) throw new Error("Loan type name is required");
    const approvers = asLoanTypeApprovers(input.approvers);
    const values = [name, cleanText(input.nameKhmer), JSON.stringify(approvers), roundMoney(input.amountOffer || 0), roundMoney(input.minOffer || 0), roundMoney(input.maxOffer || 0), Boolean(input.approverRequired), cleanText(input.contractTerms), cleanText(input.currency) || "USD", cleanText(input.sequenceCode), cleanText(input.incomeAccount), cleanText(input.penaltyAccount), cleanText(input.feeAccount), cleanText(input.badDebtAccount)];
    if (values.slice(3, 6).some((value) => typeof value === "number" && value < 0)) throw new Error("Offer amounts cannot be negative");
    const rows = await dbManager.executeUnsafe<LoanDbRow>(`INSERT INTO loan_type_definitions (name, name_km, approvers, amount_offer, min_offer, max_offer, approver_required, contract_terms, currency, sequence_code, income_account, penalty_account, fee_account, bad_debt_account) VALUES ($1,$2,$3::jsonb,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) ON CONFLICT (name) DO UPDATE SET name_km = EXCLUDED.name_km, approvers = EXCLUDED.approvers, amount_offer = EXCLUDED.amount_offer, min_offer = EXCLUDED.min_offer, max_offer = EXCLUDED.max_offer, approver_required = EXCLUDED.approver_required, contract_terms = EXCLUDED.contract_terms, currency = EXCLUDED.currency, sequence_code = EXCLUDED.sequence_code, income_account = EXCLUDED.income_account, penalty_account = EXCLUDED.penalty_account, fee_account = EXCLUDED.fee_account, bad_debt_account = EXCLUDED.bad_debt_account, updated_at = NOW() RETURNING *`, values, 10_000);
    const row = rows[0];
    if (!row) throw new Error("Loan type could not be saved");
    return { id: asString(row.id), name: asString(row.name), nameKhmer: row.name_km == null ? null : asString(row.name_km), approvers: asLoanTypeApprovers(row.approvers), amountOffer: asNumber(row.amount_offer), minOffer: asNumber(row.min_offer), maxOffer: asNumber(row.max_offer), approverRequired: row.approver_required === true || row.approver_required === "true", contractTerms: row.contract_terms == null ? null : asString(row.contract_terms), currency: asString(row.currency) || "USD", sequenceCode: row.sequence_code == null ? null : asString(row.sequence_code), incomeAccount: row.income_account == null ? null : asString(row.income_account), penaltyAccount: row.penalty_account == null ? null : asString(row.penalty_account), feeAccount: row.fee_account == null ? null : asString(row.fee_account), badDebtAccount: row.bad_debt_account == null ? null : asString(row.bad_debt_account) };
  }

  async listLoanChartAccounts(search = "", limit = 200): Promise<LoanChartAccount[]> {
    await this.ensureTables();
    const params: unknown[] = [];
    const query = search.trim();
    const where = query ? (() => { params.push(`%${query}%`); return `WHERE code ILIKE $${params.length} OR name ILIKE $${params.length}`; })() : "";
    params.push(Math.min(Math.max(Math.floor(limit), 1), 200));
    const rows = await dbManager.executeUnsafe<LoanDbRow>(`SELECT * FROM loan_chart_accounts ${where} ORDER BY code ASC LIMIT $${params.length}`, params, 10_000);
    return rows.map((row) => ({ id: asString(row.id), code: asString(row.code), name: asString(row.name), type: asString(row.account_type) || "Current Assets", defaultTaxes: row.default_taxes == null ? null : asString(row.default_taxes), tags: row.tags == null ? null : asString(row.tags), accountGroup: row.account_group == null ? null : asString(row.account_group), accountCurrency: row.account_currency == null ? null : asString(row.account_currency), allowReconciliation: row.allow_reconciliation === true || row.allow_reconciliation === "true", inactive: row.inactive === true || row.inactive === "true" }));
  }

  async listBankingAccounts(): Promise<LoanBankingAccount[]> {
    await this.ensureTables();
    const rows = await dbManager.executeUnsafe<LoanDbRow>(`
      SELECT a.id, a.code, a.name, COALESCE(a.account_currency, 'USD') AS currency,
        a.allow_reconciliation,
        COALESCE(SUM(CASE WHEN e.status = 'posted' THEN i.debit - i.credit ELSE 0 END), 0) AS balance,
        0::numeric AS reconciled
      FROM loan_chart_accounts a
      LEFT JOIN loan_journal_items i ON i.account_id = a.id
      LEFT JOIN loan_journal_entries e ON e.id = i.journal_entry_id
      WHERE a.account_type = 'Bank and Cash' AND a.inactive = FALSE
      GROUP BY a.id, a.code, a.name, a.account_currency, a.allow_reconciliation
      ORDER BY a.code ASC
    `, [], 10_000);
    return rows.map((row) => ({
      id: asString(row.id),
      code: asString(row.code),
      name: asString(row.name),
      currency: asString(row.currency) || "USD",
      balance: asNumber(row.balance),
      reconciled: asNumber(row.reconciled),
      allowReconciliation: row.allow_reconciliation === true || row.allow_reconciliation === "true",
    }));
  }

  async saveLoanChartAccount(input: Omit<LoanChartAccount, "id">): Promise<LoanChartAccount> {
    await this.ensureTables();
    const code = input.code.trim();
    const name = input.name.trim();
    if (!code || !name) throw new Error("Account code and name are required");
    const values = [code, name, cleanText(input.type) || "Current Assets", cleanText(input.defaultTaxes), cleanText(input.tags), cleanText(input.accountGroup), cleanText(input.accountCurrency), Boolean(input.allowReconciliation), Boolean(input.inactive)];
    const rows = await dbManager.executeUnsafe<LoanDbRow>(`INSERT INTO loan_chart_accounts (code, name, account_type, default_taxes, tags, account_group, account_currency, allow_reconciliation, inactive) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, account_type = EXCLUDED.account_type, default_taxes = EXCLUDED.default_taxes, tags = EXCLUDED.tags, account_group = EXCLUDED.account_group, account_currency = EXCLUDED.account_currency, allow_reconciliation = EXCLUDED.allow_reconciliation, inactive = EXCLUDED.inactive, updated_at = NOW() RETURNING *`, values, 10_000);
    const row = rows[0];
    if (!row) throw new Error("Account could not be saved");
    return { id: asString(row.id), code: asString(row.code), name: asString(row.name), type: asString(row.account_type) || "Current Assets", defaultTaxes: row.default_taxes == null ? null : asString(row.default_taxes), tags: row.tags == null ? null : asString(row.tags), accountGroup: row.account_group == null ? null : asString(row.account_group), accountCurrency: row.account_currency == null ? null : asString(row.account_currency), allowReconciliation: row.allow_reconciliation === true || row.allow_reconciliation === "true", inactive: row.inactive === true || row.inactive === "true" };
  }

  private accountCode(value: string | null | undefined, fallback: string): string {
    const code = (value || "").trim().split(/\s+/, 1)[0] || "";
    return /^\d{3,24}$/.test(code) ? code : fallback;
  }

  private async postJournalEntry(input: {
    entryNumber: string;
    entryDate: string;
    sourceType: string;
    sourceId: string;
    loanId: string;
    reference: string | null;
    memo: string;
    postedBy: string | null;
    lines: Array<{ accountCode: string; description: string; partnerName: string | null; debit: number; credit: number }>;
  }): Promise<void> {
    const lines = input.lines.map((line) => ({ ...line, debit: roundMoney(line.debit), credit: roundMoney(line.credit) })).filter((line) => line.debit > 0 || line.credit > 0);
    const debit = roundMoney(lines.reduce((sum, line) => sum + line.debit, 0));
    const credit = roundMoney(lines.reduce((sum, line) => sum + line.credit, 0));
    if (lines.length < 2 || Math.abs(debit - credit) > 0.005) throw new Error("Journal entry must contain balanced debit and credit lines");
    const inserted = await dbManager.executeUnsafe<LoanDbRow>(`
      WITH requested AS (
        SELECT * FROM jsonb_to_recordset($1::jsonb) AS line(account_code TEXT, description TEXT, partner_name TEXT, debit NUMERIC, credit NUMERIC)
      ), resolved AS (
        SELECT a.id AS account_id, r.description, r.partner_name, r.debit, r.credit
        FROM requested r INNER JOIN loan_chart_accounts a ON a.code = r.account_code AND a.inactive = FALSE
      ), validation AS (
        SELECT (SELECT COUNT(*) FROM requested) AS requested_count, COUNT(*) AS resolved_count,
               COALESCE(SUM(debit), 0) AS debit_total, COALESCE(SUM(credit), 0) AS credit_total
        FROM resolved
      ), new_entry AS (
        INSERT INTO loan_journal_entries (entry_number, entry_date, source_type, source_id, loan_id, reference, memo, posted_by, status)
        SELECT $2, $3::date, $4, $5, $6::bigint, $7, $8, $9, 'posted'
        FROM validation WHERE requested_count = resolved_count AND requested_count >= 2 AND ABS(debit_total - credit_total) <= 0.005
        ON CONFLICT (source_type, source_id) DO NOTHING
        RETURNING id
      )
      INSERT INTO loan_journal_items (journal_entry_id, account_id, description, partner_name, debit, credit)
      SELECT e.id, r.account_id, r.description, r.partner_name, r.debit, r.credit FROM new_entry e CROSS JOIN resolved r
      RETURNING journal_entry_id
    `, [JSON.stringify(lines.map((line) => ({ account_code: line.accountCode, description: line.description, partner_name: line.partnerName, debit: line.debit, credit: line.credit }))), input.entryNumber, input.entryDate, input.sourceType, input.sourceId, input.loanId, input.reference, input.memo, input.postedBy], 10_000);
    if (inserted.length > 0) return;
    const existing = await dbManager.executeUnsafe<LoanDbRow>(`SELECT id FROM loan_journal_entries WHERE source_type = $1 AND source_id = $2 LIMIT 1`, [input.sourceType, input.sourceId], 10_000);
    if (!existing[0]) throw new Error("Journal entry could not be posted because an account is missing or inactive");
  }

  private async postDisbursementJournal(row: LoanDbRow): Promise<void> {
    const loanId = asString(row.id);
    const principal = roundMoney(asNumber(row.principal));
    if (!loanId || principal <= 0) return;
    const loanNumber = asString(row.loan_number) || `Loan ${loanId}`;
    const partnerName = asString(row.full_name) || null;
    await this.postJournalEntry({ entryNumber: `LD-${loanId}`, entryDate: asDate(row.disbursed_at) || new Date().toISOString().slice(0, 10), sourceType: "loan_disbursement", sourceId: loanId, loanId, reference: loanNumber, memo: `Loan disbursement ${loanNumber}`, postedBy: row.approved_by == null ? null : asString(row.approved_by), lines: [
      { accountCode: "110000", description: `Principal receivable for ${loanNumber}`, partnerName, debit: principal, credit: 0 },
      { accountCode: "101000", description: `Cash disbursed for ${loanNumber}`, partnerName, debit: 0, credit: principal },
    ] });
  }

  private async postPaymentJournal(row: LoanDbRow): Promise<void> {
    const paymentId = asString(row.payment_id || row.id);
    const loanId = asString(row.loan_id);
    const amount = roundMoney(asNumber(row.amount));
    if (!paymentId || !loanId || amount <= 0) return;
    let principal = roundMoney(asNumber(row.principal_amount));
    let interest = roundMoney(asNumber(row.interest_amount));
    if (principal + interest <= 0.005) principal = amount;
    interest = roundMoney(Math.max(0, amount - principal));
    principal = roundMoney(amount - interest);
    const loanNumber = asString(row.loan_number) || `Loan ${loanId}`;
    const partnerName = asString(row.full_name) || null;
    const incomeAccount = this.accountCode(row.income_account == null ? null : asString(row.income_account), "401100");
    const lines = [
      { accountCode: "101000", description: `Payment received for ${loanNumber}`, partnerName, debit: amount, credit: 0 },
      { accountCode: "110000", description: `Principal repayment for ${loanNumber}`, partnerName, debit: 0, credit: principal },
      ...(interest > 0 ? [{ accountCode: incomeAccount, description: `Interest income for ${loanNumber}`, partnerName, debit: 0, credit: interest }] : []),
    ];
    await this.postJournalEntry({ entryNumber: `LP-${paymentId}`, entryDate: asDate(row.payment_date) || new Date().toISOString().slice(0, 10), sourceType: "loan_payment", sourceId: paymentId, loanId, reference: row.reference == null ? loanNumber : asString(row.reference), memo: `Loan payment ${loanNumber}`, postedBy: row.received_by == null ? null : asString(row.received_by), lines });
  }

  private async backfillLoanJournalEntries(): Promise<void> {
    const disbursements = await dbManager.executeUnsafe<LoanDbRow>(`
      SELECT l.id, l.loan_number, l.principal, l.disbursed_at, l.approved_by, b.full_name
      FROM loans l INNER JOIN loan_borrowers b ON b.id = l.borrower_id
      WHERE l.disbursed_at IS NOT NULL AND l.status IN ('active', 'closed', 'defaulted')
        AND NOT EXISTS (SELECT 1 FROM loan_journal_entries e WHERE e.source_type = 'loan_disbursement' AND e.source_id = l.id::text)
      ORDER BY l.id ASC LIMIT 200
    `, [], 10_000);
    for (const row of disbursements) await this.postDisbursementJournal(row);
    const payments = await dbManager.executeUnsafe<LoanDbRow>(`
      SELECT p.id AS payment_id, p.loan_id, p.payment_date, p.amount, p.principal_amount, p.interest_amount, p.reference, p.received_by,
             l.loan_number, b.full_name, ltd.income_account
      FROM loan_payments p INNER JOIN loans l ON l.id = p.loan_id INNER JOIN loan_borrowers b ON b.id = l.borrower_id
      LEFT JOIN loan_type_definitions ltd ON LOWER(ltd.name) = LOWER(l.loan_type)
      WHERE NOT EXISTS (SELECT 1 FROM loan_journal_entries e WHERE e.source_type = 'loan_payment' AND e.source_id = p.id::text)
      ORDER BY p.id ASC LIMIT 500
    `, [], 10_000);
    for (const row of payments) await this.postPaymentJournal(row);
  }

  async listLoanJournalItems(accountCode: string): Promise<LoanJournalItem[]> {
    await this.ensureTables();
    await this.backfillLoanJournalEntries();
    const code = accountCode.trim();
    if (!code) return [];
    const rows = await dbManager.executeUnsafe<LoanDbRow>(`
      SELECT i.id, i.journal_entry_id, i.description, i.partner_name, i.debit, i.credit,
             e.entry_number, e.entry_date, e.source_type, e.source_id, e.reference, e.memo, e.posted_by,
             a.id AS account_id, a.code AS account_code, a.name AS account_name
      FROM loan_journal_items i INNER JOIN loan_journal_entries e ON e.id = i.journal_entry_id
      INNER JOIN loan_chart_accounts a ON a.id = i.account_id
      WHERE a.code = $1 ORDER BY e.entry_date DESC, e.id DESC, i.id ASC LIMIT 500
    `, [code], 10_000);
    return rows.map((row) => ({ id: asString(row.id), entryId: asString(row.journal_entry_id), entryNumber: asString(row.entry_number), entryDate: asDate(row.entry_date) || "", sourceType: asString(row.source_type), sourceId: asString(row.source_id), reference: row.reference == null ? null : asString(row.reference), memo: row.memo == null ? null : asString(row.memo), accountId: asString(row.account_id), accountCode: asString(row.account_code), accountName: asString(row.account_name), description: row.description == null ? null : asString(row.description), partnerName: row.partner_name == null ? null : asString(row.partner_name), debit: asNumber(row.debit), credit: asNumber(row.credit), postedBy: row.posted_by == null ? null : asString(row.posted_by) }));
  }

  async getLoan(id: string): Promise<LoanEntity | null> {
    await this.ensureTables();
    const rows = await dbManager.executeUnsafe<LoanDbRow>(
      `${this.loanSelect("WHERE l.id = $1")} LIMIT 1`,
      [id],
      10_000
    );
    return rows[0] ? this.toLoan(rows[0]) : null;
  }

  private toLoanActivity(row: LoanDbRow): LoanActivity {
    return {
      id: asString(row.id),
      loanId: asString(row.loan_id),
      type: asString(row.activity_type) as LoanActivityType,
      body: row.body == null ? null : asString(row.body),
      scheduledFor: row.scheduled_for == null ? null : asDateTime(row.scheduled_for),
      attachmentName: row.attachment_name == null ? null : asString(row.attachment_name),
      attachmentUrl: row.attachment_url == null ? null : asString(row.attachment_url),
      createdBy: asString(row.created_by),
      actorName: asString(row.actor_name),
      actorRole: asString(row.actor_role),
      createdAt: asDateTime(row.created_at) || "",
    };
  }

  async getLoanActivityFeed(loanId: string, username: string): Promise<LoanActivityFeed | null> {
    await this.ensureTables();
    const loan = await this.getLoan(loanId);
    if (!loan) return null;
    const [rows, followerRows] = await Promise.all([
      dbManager.executeUnsafe<LoanDbRow>(`
        SELECT * FROM loan_activities WHERE loan_id = $1 ORDER BY created_at DESC, id DESC LIMIT 300
      `, [loanId], 10_000),
      dbManager.executeUnsafe<LoanDbRow>(`
        SELECT COUNT(*) AS follower_count,
               COUNT(*) FILTER (WHERE LOWER(username) = LOWER($2)) AS is_following
        FROM loan_followers WHERE loan_id = $1
      `, [loanId, username], 10_000),
    ]);
    return {
      activities: rows.map((row) => this.toLoanActivity(row)),
      followerCount: asNumber(followerRows[0]?.follower_count),
      following: asNumber(followerRows[0]?.is_following) > 0,
    };
  }

  async createLoanActivity(loanId: string, input: CreateLoanActivityInput, actor: { username: string; name: string; role: string }): Promise<LoanActivity | null> {
    await this.ensureTables();
    if (!await this.getLoan(loanId)) return null;
    const body = input.body?.trim() || null;
    const attachmentName = input.attachmentName?.trim() || null;
    const attachmentUrl = input.attachmentUrl?.trim() || null;
    if ((input.type === "message" || input.type === "note") && !body) throw new Error("Enter some text first");
    if (input.type === "scheduled" && (!body || !input.scheduledFor)) throw new Error("Activity details and a schedule date are required");
    if (input.type === "attachment" && (!attachmentName || !attachmentUrl)) throw new Error("Choose a file to attach");
    const rows = await dbManager.executeUnsafe<LoanDbRow>(`
      INSERT INTO loan_activities (loan_id, activity_type, body, scheduled_for, attachment_name, attachment_url, created_by, actor_name, actor_role)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *
    `, [loanId, input.type, body, input.scheduledFor || null, attachmentName, attachmentUrl, actor.username, actor.name, actor.role], 10_000);
    return rows[0] ? this.toLoanActivity(rows[0]) : null;
  }

  async setLoanFollowing(loanId: string, username: string, following: boolean): Promise<{ followerCount: number; following: boolean } | null> {
    await this.ensureTables();
    if (!await this.getLoan(loanId)) return null;
    if (following) {
      await dbManager.executeUnsafe(`INSERT INTO loan_followers (loan_id, username) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [loanId, username], 10_000);
    } else {
      await dbManager.executeUnsafe(`DELETE FROM loan_followers WHERE loan_id = $1 AND LOWER(username) = LOWER($2)`, [loanId, username], 10_000);
    }
    const rows = await dbManager.executeUnsafe<LoanDbRow>(`SELECT COUNT(*) AS follower_count FROM loan_followers WHERE loan_id = $1`, [loanId], 10_000);
    return { followerCount: asNumber(rows[0]?.follower_count), following };
  }

  private async ensureApprovalWorkflow(loan: LoanEntity): Promise<void> {
    if (loan.status !== "pending" && loan.status !== "waiting") return;
    const existing = await dbManager.executeUnsafe<LoanDbRow>(`SELECT COUNT(*) AS count FROM loan_approval_steps WHERE loan_id = $1`, [loan.id], 10_000);
    if (asNumber(existing[0]?.count) > 0) return;

    let rules = approvalRulesForLoan(loan);
    const definitions = await dbManager.executeUnsafe<LoanDbRow>(`SELECT approvers, approver_required FROM loan_type_definitions WHERE LOWER(name) = LOWER($1) LIMIT 1`, [loan.loanType], 10_000);
    const configuredApprovers = asLoanTypeApprovers(definitions[0]?.approvers);
    if ((definitions[0]?.approver_required === true || definitions[0]?.approver_required === "true") && configuredApprovers.length) {
      const required = configuredApprovers.filter((approver) => approver.required);
      const configuredRule: ApprovalRule = {
        key: "configured_approvers",
        label: "Branch / Configured Approvers",
        roles: [],
        eligibleUsernames: (required.length ? required : configuredApprovers).map((approver) => approver.username),
        requiredApprovals: required.length || 1,
      };
      const branchIndex = rules.findIndex((rule) => rule.key === "branch_manager");
      if (branchIndex >= 0) rules = rules.map((rule, index) => index === branchIndex ? configuredRule : rule);
      else rules = [configuredRule, ...rules];
    }

    for (const [index, rule] of rules.entries()) {
      await dbManager.executeUnsafe(
        `INSERT INTO loan_approval_steps (loan_id, step_order, step_key, step_label, required_roles, eligible_usernames, required_approvals)
         VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7) ON CONFLICT (loan_id, step_order) DO NOTHING`,
        [loan.id, index + 1, rule.key, rule.label, JSON.stringify(rule.roles), JSON.stringify(rule.eligibleUsernames || []), rule.requiredApprovals || 1],
        10_000
      );
    }
  }

  private async getApprovalWorkflow(loan: LoanEntity): Promise<LoanApprovalWorkflow> {
    await this.ensureApprovalWorkflow(loan);
    const rows = await dbManager.executeUnsafe<LoanDbRow>(`
      SELECT s.*, d.id AS decision_id, d.username, d.actor_role, d.action, d.comment, d.created_at AS decision_created_at
      FROM loan_approval_steps s LEFT JOIN loan_approval_decisions d ON d.step_id = s.id
      WHERE s.loan_id = $1 ORDER BY s.step_order ASC, d.created_at ASC, d.id ASC
    `, [loan.id], 10_000);
    const stepMap = new Map<string, LoanApprovalStep>();
    for (const row of rows) {
      const id = asString(row.id);
      let step = stepMap.get(id);
      if (!step) {
        step = { id, order: asNumber(row.step_order), key: asString(row.step_key), label: asString(row.step_label), roles: asStringList(row.required_roles), eligibleUsernames: asStringList(row.eligible_usernames), requiredApprovals: asNumber(row.required_approvals) || 1, approvalCount: 0, status: asString(row.status) as LoanApprovalStep["status"], decisions: [] };
        stepMap.set(id, step);
      }
      if (row.decision_id != null) {
        step.decisions.push({ id: asString(row.decision_id), username: asString(row.username), role: asString(row.actor_role), action: asString(row.action) as LoanApprovalDecision["action"], comment: row.comment == null ? null : asString(row.comment), createdAt: asDateTime(row.decision_created_at) || "" });
      }
    }
    const steps = Array.from(stepMap.values());
    steps.forEach((step) => { step.approvalCount = step.decisions.filter((decision) => decision.action === "approve").length; });
    const currentStep = steps.find((step) => step.status === "pending") || null;
    const workflowStatus: LoanApprovalWorkflow["status"] = loan.status === "active" || loan.status === "closed" || loan.status === "defaulted" ? "disbursed" : loan.status === "approved" ? "approved" : loan.status === "rejected" ? "rejected" : steps.some((step) => step.status === "returned") ? "returned" : "pending";
    return { status: workflowStatus, completedSteps: steps.filter((step) => step.status === "completed").length, totalSteps: steps.length, currentStep, steps };
  }

  private approvalRoleMatches(actorRole: string, step: LoanApprovalStep, username: string): boolean {
    if (actorRole.trim().toLowerCase() === "admin") return true;
    if (step.eligibleUsernames.length) return step.eligibleUsernames.some((candidate) => candidate.toLowerCase() === username.toLowerCase());
    const normalizeRole = (role: string) => {
      const normalized = role.trim().toLowerCase();
      if (["loan officer", "loan specialist", "collateral checker"].includes(normalized)) return "loan operations";
      if (["branch manager", "bm", "credit manager"].includes(normalized)) return "manager / approver";
      if (["accounting", "finance manager"].includes(normalized)) return "finance";
      if (normalized === "ceo") return "executive viewer";
      return normalized;
    };
    const normalizedRole = normalizeRole(actorRole);
    return step.roles.some((role) => normalizeRole(role) === normalizedRole);
  }

  async decideLoanApproval(id: string, actor: { username: string; role: string }, action: "approve" | "reject" | "return", comment?: string | null): Promise<LoanDetail | null> {
    await this.ensureTables();
    const loan = await this.getLoan(id);
    if (!loan) return null;
    if (loan.status !== "pending" && loan.status !== "waiting") throw new Error("Only pending or waiting loan applications can be reviewed");
    if (loan.createdBy?.toLowerCase() === actor.username.toLowerCase()) throw new Error("The employee who created this loan cannot approve it");
    if ((action === "reject" || action === "return") && !cleanText(comment)) throw new Error(`${action === "reject" ? "Rejection" : "Return"} reason is required`);

    const workflow = await this.getApprovalWorkflow(loan);
    const step = workflow.currentStep;
    if (!step) throw new Error("This loan has no pending approval step");
    if (!this.approvalRoleMatches(actor.role, step, actor.username)) throw new Error(`This step requires ${step.eligibleUsernames.length ? "a configured approver" : step.roles.join(" or ")}`);
    const previousDecision = await dbManager.executeUnsafe<LoanDbRow>(`SELECT 1 FROM loan_approval_decisions d INNER JOIN loan_approval_steps s ON s.id = d.step_id WHERE s.loan_id = $1 AND LOWER(d.username) = LOWER($2) AND d.action = 'approve' LIMIT 1`, [id, actor.username], 10_000);
    if (previousDecision.length) throw new Error("You have already approved this loan at another approval level");

    await dbManager.executeUnsafe(`INSERT INTO loan_approval_decisions (step_id, username, actor_role, action, comment) VALUES ($1,$2,$3,$4,$5)`, [step.id, actor.username, actor.role, action, cleanText(comment)], 10_000);
    if (action === "reject") {
      await Promise.all([
        dbManager.executeUnsafe(`UPDATE loan_approval_steps SET status = 'rejected', completed_at = NOW() WHERE id = $1`, [step.id], 10_000),
        dbManager.executeUnsafe(`UPDATE loans SET status = 'rejected', approval_stage = 'cancelled', approved_by = $1, approved_at = NOW(), updated_at = NOW() WHERE id = $2`, [actor.username, id], 10_000),
      ]);
      return this.getLoanDetail(id);
    }
    if (action === "return") {
      await Promise.all([
        dbManager.executeUnsafe(`UPDATE loan_approval_steps SET status = 'returned', completed_at = NOW() WHERE id = $1`, [step.id], 10_000),
        dbManager.executeUnsafe(`UPDATE loans SET status = 'draft', approval_stage = 'draft', updated_at = NOW() WHERE id = $1`, [id], 10_000),
      ]);
      return this.getLoanDetail(id);
    }

    const countRows = await dbManager.executeUnsafe<LoanDbRow>(`SELECT COUNT(*) AS count FROM loan_approval_decisions WHERE step_id = $1 AND action = 'approve'`, [step.id], 10_000);
    if (asNumber(countRows[0]?.count) >= step.requiredApprovals) {
      await dbManager.executeUnsafe(`UPDATE loan_approval_steps SET status = 'completed', completed_at = NOW() WHERE id = $1`, [step.id], 10_000);
    }
    const remaining = await dbManager.executeUnsafe<LoanDbRow>(`SELECT COUNT(*) AS count FROM loan_approval_steps WHERE loan_id = $1 AND status = 'pending'`, [id], 10_000);
    if (asNumber(remaining[0]?.count) === 0) {
      await dbManager.executeUnsafe(`UPDATE loans SET status = 'approved', approval_stage = 'approved', approved_by = $1, approved_at = NOW(), updated_at = NOW() WHERE id = $2`, [actor.username, id], 10_000);
    } else {
      const nextStep = await dbManager.executeUnsafe<LoanDbRow>(`SELECT step_key FROM loan_approval_steps WHERE loan_id = $1 AND status = 'pending' ORDER BY step_order LIMIT 1`, [id], 10_000);
      const nextKey = asString(nextStep[0]?.step_key);
      const stage: LoanApprovalStage = nextKey.includes("finance") ? "finance_approval" : nextKey.includes("chief") ? "ceo_approval" : nextKey.includes("branch") ? "manager_approval" : "under_review";
      await dbManager.executeUnsafe(`UPDATE loans SET status = 'waiting', approval_stage = $1, updated_at = NOW() WHERE id = $2`, [stage, id], 10_000);
    }
    return this.getLoanDetail(id);
  }

  async getLoanDetail(id: string): Promise<LoanDetail | null> {
    const loan = await this.getLoan(id);
    if (!loan) return null;
    const [scheduleRows, paymentRows, collateralRows, approvalWorkflow] = await Promise.all([
      dbManager.executeUnsafe<LoanDbRow>(
        `SELECT * FROM loan_repayment_schedule WHERE loan_id = $1 ORDER BY installment_number ASC`,
        [id],
        10_000
      ),
      dbManager.executeUnsafe<LoanDbRow>(
        `SELECT * FROM loan_payments WHERE loan_id = $1 ORDER BY payment_date DESC, id DESC`,
        [id],
        10_000
      ),
      dbManager.executeUnsafe<LoanDbRow>(
        `SELECT * FROM loan_collaterals WHERE loan_id = $1 ORDER BY created_at DESC, id DESC`,
        [id],
        10_000
      ),
      this.getApprovalWorkflow(loan),
    ]);

    return {
      loan,
      schedule: scheduleRows.map((row) => ({
        id: asString(row.id),
        installmentNumber: asNumber(row.installment_number),
        dueDate: asDate(row.due_date) || "",
        amountDue: asNumber(row.amount_due),
        amountPaid: asNumber(row.amount_paid),
        principalDue: asNumber(row.principal_due),
        interestDue: asNumber(row.interest_due),
        status: asString(row.status) as LoanScheduleItem["status"],
      })),
      payments: paymentRows.map((row) => ({
        id: asString(row.id),
        paymentDate: asDate(row.payment_date) || "",
        amount: asNumber(row.amount),
        principalAmount: asNumber(row.principal_amount),
        interestAmount: asNumber(row.interest_amount),
        method: asString(row.payment_method) as PaymentMethod,
        reference: row.reference == null ? null : asString(row.reference),
        notes: row.notes == null ? null : asString(row.notes),
        receivedBy: row.received_by == null ? null : asString(row.received_by),
        createdAt: asDateTime(row.created_at) || "",
      })),
      collaterals: collateralRows.map((row) => ({
        id: asString(row.id),
        type: asString(row.collateral_type),
        description: row.description == null ? null : asString(row.description),
        reference: row.reference == null ? null : asString(row.reference),
        value: asNumber(row.estimated_value),
        marketValue: asNumber(row.market_value),
        createdAt: asDateTime(row.created_at) || "",
      })),
      approvalWorkflow,
    };
  }

  async createLoan(input: CreateLoanInput, createdBy: string): Promise<LoanEntity> {
    await this.ensureTables();
    assertLoanInput(input);
    const normalized: CreateLoanInput = {
      ...input,
      borrower: {
        fullName: input.borrower.fullName.trim(),
        phone: cleanText(input.borrower.phone),
        email: cleanText(input.borrower.email),
        nationalId: cleanText(input.borrower.nationalId),
        address: cleanText(input.borrower.address),
        occupation: cleanText(input.borrower.occupation),
        income: input.borrower.income ?? null,
        guarantor: cleanText(input.borrower.guarantor),
        profile: input.borrower.profile || {},
      },
      loanType: input.loanType.trim(),
      principal: roundMoney(input.principal),
      loanAmountKHR: cleanText(input.loanAmountKHR),
      interestRate: input.interestRate,
      formula: cleanText(input.formula),
      contractDateLunar: cleanText(input.contractDateLunar),
      purpose: cleanText(input.purpose),
      notes: cleanText(input.notes),
      loanInformation: asLoanInformation(input.loanInformation),
      loanContacts: asLoanContacts(input.loanContacts),
      collaterals: (input.collaterals || []).map(normalizeCollateral),
    };
    const calculation = buildInstallments(normalized);
    let borrowerId = "";
    if (normalized.borrowerId && /^\d+$/.test(normalized.borrowerId)) {
      const existingBorrower = await dbManager.executeUnsafe<LoanDbRow>(
        `SELECT id FROM loan_borrowers WHERE id = $1 LIMIT 1`,
        [normalized.borrowerId],
        10_000
      );
      borrowerId = asString(existingBorrower[0]?.id);
      if (!borrowerId) throw new Error("Selected customer could not be found. Please select or enter the customer again.");
      // The editable customer picker mirrors the previous system: when a user
      // opens Create and Edit for a selected customer, their saved profile is
      // updated before the new loan is linked to it.
      await dbManager.executeUnsafe(
        `UPDATE loan_borrowers SET full_name = $1, phone = $2, email = $3, national_id = $4, address = $5, profile = $6::jsonb, updated_at = NOW() WHERE id = $7`,
        [normalized.borrower.fullName, normalized.borrower.phone, normalized.borrower.email, normalized.borrower.nationalId, normalized.borrower.address, JSON.stringify(normalized.borrower.profile || {}), borrowerId],
        10_000
      );
    } else {
      const borrowerRows = await dbManager.executeUnsafe<LoanDbRow>(
        `INSERT INTO loan_borrowers (full_name, phone, email, national_id, address, occupation, income, guarantor, profile)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb) RETURNING id`,
        [
          normalized.borrower.fullName,
          normalized.borrower.phone,
          normalized.borrower.email,
          normalized.borrower.nationalId,
          normalized.borrower.address,
          normalized.borrower.occupation || null,
          normalized.borrower.income ?? null,
          normalized.borrower.guarantor || null,
          JSON.stringify(normalized.borrower.profile || {}),
        ],
        10_000
      );
      borrowerId = asString(borrowerRows[0]?.id);
    }
    const loanRows = await dbManager.executeUnsafe<LoanDbRow>(
      `INSERT INTO loans (
        borrower_id, loan_type, principal, interest_rate, term_months, repayment_frequency, interest_model, monthly_payment,
        total_payable, outstanding_balance, branch_location, loan_officer, approval_stage, credit_score,
        start_date, contract_date, contract_end_date, first_payment_date, purpose, notes, created_by, status, formula, loan_amount_khr, contract_date_lunar, loan_information, loan_contacts
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, 'pending', $22, $23, $24, $25::jsonb, $26::jsonb) RETURNING id`,
      [
        borrowerId,
        normalized.loanType,
        normalized.principal,
        normalized.interestRate,
        normalized.termMonths,
        normalized.repaymentFrequency || "monthly",
        normalized.interestModel || "equal_installments",
        calculation.monthlyPayment,
        calculation.totalPayable,
        calculation.totalPayable,
        normalized.branchLocation || null,
        normalized.loanOfficer || createdBy,
        "submitted",
        normalized.creditScore ?? null,
        normalized.startDate,
        normalized.contractDate,
        normalized.contractEndDate,
        normalized.firstPaymentDate,
        normalized.purpose,
        normalized.notes,
        createdBy,
        normalized.formula,
        normalized.loanAmountKHR,
        normalized.contractDateLunar,
        JSON.stringify(normalized.loanInformation || EMPTY_LOAN_INFORMATION),
        JSON.stringify(normalized.loanContacts || EMPTY_LOAN_CONTACTS),
      ],
      10_000
    );
    const id = asString(loanRows[0]?.id);
    const year = new Date().getUTCFullYear();
    const loanNumber = `LOAN/${year}/${id.padStart(5, "0")}`;
    await dbManager.executeUnsafe(
      `UPDATE loans SET loan_number = $1, updated_at = NOW() WHERE id = $2`,
      [loanNumber, id],
      10_000
    );
    for (const collateral of normalized.collaterals || []) {
      await this.insertCollateral(id, collateral);
    }
    const loan = await this.getLoan(id);
    if (!loan) throw new Error("Loan was created but could not be loaded");
    return loan;
  }

  async createDraftLoan(input: Partial<CreateLoanInput>, createdBy: string): Promise<LoanEntity> {
    await this.ensureTables();
    const borrowerRows = await dbManager.executeUnsafe<LoanDbRow>(
      `INSERT INTO loan_borrowers (full_name, phone, email, national_id, address, occupation, income, guarantor, profile)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb) RETURNING id`,
      [
        cleanText(input.borrower?.fullName) || "Unknown",
        cleanText(input.borrower?.phone),
        cleanText(input.borrower?.email),
        cleanText(input.borrower?.nationalId),
        cleanText(input.borrower?.address),
        cleanText(input.borrower?.occupation),
        input.borrower?.income ?? null,
        cleanText(input.borrower?.guarantor),
        JSON.stringify(input.borrower?.profile || {}),
      ],
      10_000
    );
    const borrowerId = asString(borrowerRows[0]?.id);
    const loanRows = await dbManager.executeUnsafe<LoanDbRow>(
      `INSERT INTO loans (
        borrower_id, loan_type, principal, interest_rate, term_months, repayment_frequency, interest_model, monthly_payment,
        total_payable, outstanding_balance, branch_location, loan_officer, approval_stage, credit_score,
        start_date, contract_date, contract_end_date, first_payment_date, purpose, notes, created_by, status, loan_number, formula, loan_amount_khr, contract_date_lunar, loan_information, loan_contacts
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, 'draft', NULL, $22, $23, $24, $25::jsonb, $26::jsonb) RETURNING id`,
      [
        borrowerId,
        input.loanType || "Personal Loan",
        input.principal || 0,
        input.interestRate || 0,
        input.termMonths || 1,
        input.repaymentFrequency || "monthly",
        input.interestModel || "equal_installments",
        0, 0, 0,
        input.branchLocation ?? null,
        input.loanOfficer ?? null,
        input.approvalStage ?? "draft",
        input.creditScore ?? null,
        input.startDate || new Date().toISOString().slice(0, 10),
        input.contractDate || input.startDate || new Date().toISOString().slice(0, 10),
        input.contractEndDate || input.firstPaymentDate || input.startDate || new Date().toISOString().slice(0, 10),
        input.firstPaymentDate || new Date().toISOString().slice(0, 10),
        cleanText(input.purpose),
        cleanText(input.notes),
        createdBy,
        cleanText(input.formula),
        cleanText(input.loanAmountKHR),
        cleanText(input.contractDateLunar),
        JSON.stringify(asLoanInformation(input.loanInformation)),
        JSON.stringify(asLoanContacts(input.loanContacts)),
      ],
      10_000
    );
    const id = asString(loanRows[0]?.id);
    const loan = await this.getLoan(id);
    if (!loan) throw new Error("Draft loan could not be loaded");
    return loan;
  }

  private async insertCollateral(loanId: string, input: CollateralInput): Promise<LoanCollateral> {
    const collateral = normalizeCollateral(input);
    const rows = await dbManager.executeUnsafe<LoanDbRow>(
      `INSERT INTO loan_collaterals (loan_id, collateral_type, description, reference, estimated_value, market_value)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [loanId, collateral.type, collateral.description, collateral.reference, collateral.value, collateral.marketValue],
      10_000
    );
    const row = rows[0];
    if (!row) throw new Error("Collateral could not be saved");
    return {
      id: asString(row.id),
      type: asString(row.collateral_type),
      description: row.description == null ? null : asString(row.description),
      reference: row.reference == null ? null : asString(row.reference),
      value: asNumber(row.estimated_value),
      marketValue: asNumber(row.market_value),
      createdAt: asDateTime(row.created_at) || "",
    };
  }

  async addCollateral(loanId: string, input: CollateralInput): Promise<LoanCollateral | null> {
    await this.ensureTables();
    const loan = await this.getLoan(loanId);
    if (!loan) return null;
    if (loan.status === "rejected") throw new Error("Collateral cannot be added to a rejected application");
    return this.insertCollateral(loanId, input);
  }

  async submitDraftLoan(id: string, input: CreateLoanInput): Promise<LoanEntity | null> {
    await this.ensureTables();
    const existing = await this.getLoan(id);
    if (!existing) return null;
    if (existing.status !== "draft") throw new Error("Only draft loans can be submitted");

    assertLoanInput(input);
    const normalized = {
      ...input,
      borrower: {
        fullName: input.borrower.fullName.trim(),
        phone: cleanText(input.borrower.phone),
        email: cleanText(input.borrower.email),
        nationalId: cleanText(input.borrower.nationalId),
        address: cleanText(input.borrower.address),
        occupation: cleanText(input.borrower.occupation),
        income: input.borrower.income ?? null,
        guarantor: cleanText(input.borrower.guarantor),
        profile: input.borrower.profile || {},
      },
      loanType: input.loanType.trim(),
      principal: roundMoney(input.principal),
      loanAmountKHR: cleanText(input.loanAmountKHR),
      interestRate: input.interestRate,
      formula: cleanText(input.formula),
      contractDateLunar: cleanText(input.contractDateLunar),
      repaymentFrequency: input.repaymentFrequency ?? "monthly",
      interestModel: input.interestModel ?? "equal_installments",
      branchLocation: input.branchLocation ?? null,
      loanOfficer: input.loanOfficer ?? null,
      approvalStage: input.approvalStage ?? "submitted",
      creditScore: input.creditScore ?? null,
      purpose: cleanText(input.purpose),
      notes: cleanText(input.notes),
      loanInformation: asLoanInformation(input.loanInformation),
      loanContacts: asLoanContacts(input.loanContacts),
    };
    const calculation = buildInstallments(normalized);

    await Promise.all([
      dbManager.executeUnsafe(
        `UPDATE loan_borrowers SET full_name = $1, phone = $2, email = $3, national_id = $4, address = $5, occupation = $6, income = $7, guarantor = $8, profile = $9::jsonb, updated_at = NOW() WHERE id = $10`,
        [
          normalized.borrower.fullName, normalized.borrower.phone, normalized.borrower.email,
          normalized.borrower.nationalId, normalized.borrower.address, normalized.borrower.occupation,
          normalized.borrower.income ?? null, normalized.borrower.guarantor, JSON.stringify(normalized.borrower.profile || {}), existing.borrower.id,
        ],
        10_000
      ),
    ]);

    const year = new Date().getUTCFullYear();
    const loanNumber = `LOAN/${year}/${id.padStart(5, "0")}`;

    await dbManager.executeUnsafe(
      `UPDATE loans SET loan_type = $1, principal = $2, interest_rate = $3, term_months = $4,
        repayment_frequency = $5, interest_model = $6, monthly_payment = $7, total_payable = $8, outstanding_balance = $8, start_date = $9,
        contract_date = $10, contract_end_date = $11, first_payment_date = $12, purpose = $13, notes = $14, formula = $15, loan_amount_khr = $16, loan_number = $17, contract_date_lunar = $18, loan_information = $19::jsonb, loan_contacts = $20::jsonb, status = 'pending', approval_stage = 'submitted', updated_at = NOW() WHERE id = $21`,
      [
        normalized.loanType, roundMoney(normalized.principal), normalized.interestRate, normalized.termMonths,
        normalized.repaymentFrequency || "monthly", normalized.interestModel || "equal_installments",
        calculation.monthlyPayment, calculation.totalPayable, normalized.startDate,
        normalized.contractDate, normalized.contractEndDate, normalized.firstPaymentDate, normalized.purpose, normalized.notes, normalized.formula, normalized.loanAmountKHR, loanNumber, normalized.contractDateLunar, JSON.stringify(normalized.loanInformation), JSON.stringify(normalized.loanContacts), id,
      ],
      10_000
    );
    await dbManager.executeUnsafe(`DELETE FROM loan_approval_steps WHERE loan_id = $1`, [id], 10_000);

    return this.getLoan(id);
  }

  async updateLoan(id: string, input: UpdateLoanInput): Promise<LoanEntity | null> {
    await this.ensureTables();
    const existing = await this.getLoan(id);
    if (!existing) return null;
    if (existing.status !== "pending" && existing.status !== "draft") {
      const financialFields = ["borrower", "loanType", "principal", "interestRate", "termMonths", "startDate", "contractDateLunar", "firstPaymentDate", "repaymentFrequency", "interestModel", "formula", "loanInformation", "loanContacts"];
      if (financialFields.some((field) => field in input)) {
        throw new Error("Only pending or draft loan applications can have their financial details changed");
      }
      await dbManager.executeUnsafe(
        `UPDATE loans SET purpose = $1, notes = $2, updated_at = NOW() WHERE id = $3`,
        [input.purpose === undefined ? existing.purpose : cleanText(input.purpose), input.notes === undefined ? existing.notes : cleanText(input.notes), id],
        10_000
      );
      return this.getLoan(id);
    }

    const merged: CreateLoanInput = {
      borrower: {
        fullName: input.borrower?.fullName === undefined ? existing.borrower.fullName : input.borrower.fullName,
        phone: input.borrower?.phone === undefined ? existing.borrower.phone : input.borrower.phone,
        email: input.borrower?.email === undefined ? existing.borrower.email : input.borrower.email,
        nationalId: input.borrower?.nationalId === undefined ? existing.borrower.nationalId : input.borrower.nationalId,
        address: input.borrower?.address === undefined ? existing.borrower.address : input.borrower.address,
        occupation: input.borrower?.occupation === undefined ? existing.borrower.occupation : input.borrower.occupation,
        income: input.borrower?.income === undefined ? existing.borrower.income : input.borrower.income,
        guarantor: input.borrower?.guarantor === undefined ? existing.borrower.guarantor : input.borrower.guarantor,
        profile: input.borrower?.profile === undefined ? existing.borrower.profile : input.borrower.profile,
      },
      loanType: input.loanType === undefined ? existing.loanType : input.loanType,
      principal: input.principal === undefined ? existing.principal : input.principal,
      loanAmountKHR: input.loanAmountKHR === undefined ? existing.loanAmountKHR : input.loanAmountKHR,
      interestRate: input.interestRate === undefined ? existing.interestRate : input.interestRate,
      termMonths: input.termMonths === undefined ? existing.termMonths : input.termMonths,
      repaymentFrequency: input.repaymentFrequency === undefined ? existing.repaymentFrequency : input.repaymentFrequency,
      interestModel: input.interestModel === undefined ? existing.interestModel : input.interestModel,
      formula: input.formula === undefined ? existing.formula : input.formula,
      branchLocation: input.branchLocation === undefined ? existing.branchLocation : input.branchLocation,
      loanOfficer: input.loanOfficer === undefined ? existing.loanOfficer : input.loanOfficer,
      approvalStage: input.approvalStage === undefined ? existing.approvalStage : input.approvalStage,
      creditScore: input.creditScore === undefined ? existing.creditScore : input.creditScore,
      startDate: input.startDate === undefined ? existing.startDate : input.startDate,
      contractDate: input.contractDate === undefined ? existing.contractDate : input.contractDate,
      contractDateLunar: input.contractDateLunar === undefined ? existing.contractDateLunar : input.contractDateLunar,
      contractEndDate: input.contractEndDate === undefined ? existing.contractEndDate : input.contractEndDate,
      firstPaymentDate: input.firstPaymentDate === undefined ? existing.firstPaymentDate : input.firstPaymentDate,
      purpose: input.purpose === undefined ? existing.purpose : input.purpose,
      notes: input.notes === undefined ? existing.notes : input.notes,
      loanInformation: input.loanInformation === undefined ? existing.loanInformation : input.loanInformation,
      loanContacts: input.loanContacts === undefined ? existing.loanContacts : input.loanContacts,
      collaterals: [],
    };
    assertLoanInput(merged);
    const normalizedPurpose = cleanText(merged.purpose);
    const normalizedNotes = cleanText(merged.notes);
    const calculation = buildInstallments(merged);

    await Promise.all([
      dbManager.executeUnsafe(
        `UPDATE loan_borrowers SET full_name = $1, phone = $2, email = $3, national_id = $4, address = $5, occupation = $6, income = $7, guarantor = $8, profile = $9::jsonb, updated_at = NOW() WHERE id = $10`,
        [
          cleanText(merged.borrower.fullName), cleanText(merged.borrower.phone), cleanText(merged.borrower.email),
          cleanText(merged.borrower.nationalId), cleanText(merged.borrower.address), cleanText(merged.borrower.occupation),
          merged.borrower.income ?? null, cleanText(merged.borrower.guarantor), JSON.stringify(merged.borrower.profile || {}), existing.borrower.id,
        ],
        10_000
      ),
      dbManager.executeUnsafe(
        `UPDATE loans SET loan_type = $1, principal = $2, interest_rate = $3, term_months = $4,
          repayment_frequency = $5, interest_model = $6, monthly_payment = $7, total_payable = $8, outstanding_balance = $9,
          branch_location = $10, loan_officer = $11, approval_stage = $12, credit_score = $13,
          start_date = $14, contract_date = $15, contract_end_date = $16, first_payment_date = $17, purpose = $18, notes = $19, formula = $20, loan_amount_khr = $21, contract_date_lunar = $22, loan_information = $23::jsonb, loan_contacts = $24::jsonb, updated_at = NOW() WHERE id = $25`,
        [
          merged.loanType.trim(), roundMoney(merged.principal), merged.interestRate, merged.termMonths,
          merged.repaymentFrequency || "monthly", merged.interestModel || "equal_installments",
          calculation.monthlyPayment, calculation.totalPayable, calculation.totalPayable,
          merged.branchLocation || null, merged.loanOfficer || null, merged.approvalStage || "submitted", merged.creditScore ?? null,
          merged.startDate, merged.contractDate, merged.contractEndDate, merged.firstPaymentDate, normalizedPurpose, normalizedNotes, cleanText(merged.formula), cleanText(merged.loanAmountKHR), cleanText(merged.contractDateLunar), JSON.stringify(asLoanInformation(merged.loanInformation)), JSON.stringify(asLoanContacts(merged.loanContacts)), id,
        ],
        10_000
      ),
    ]);
    return this.getLoan(id);
  }

  async disburseLoan(id: string, disbursedBy: string): Promise<LoanDetail | null> {
    await this.ensureTables();
    const loan = await this.getLoan(id);
    if (!loan) return null;
    if (loan.status !== "approved") throw new Error("Only fully approved loans can be disbursed");

    const scheduleCount = await dbManager.executeUnsafe<LoanDbRow>(
      `SELECT COUNT(*) AS count FROM loan_repayment_schedule WHERE loan_id = $1`,
      [id],
      10_000
    );
    if (asNumber(scheduleCount[0]?.count) === 0) {
      const calculation = buildInstallments({
        principal: loan.principal,
        interestRate: loan.interestRate,
        termMonths: loan.termMonths,
        firstPaymentDate: loan.firstPaymentDate,
        repaymentFrequency: loan.repaymentFrequency,
        interestModel: loan.interestModel,
      });
      for (const installment of calculation.installments) {
        await dbManager.executeUnsafe(
          `INSERT INTO loan_repayment_schedule (
            loan_id, installment_number, due_date, amount_due, principal_due, interest_due
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [id, installment.installmentNumber, installment.dueDate, installment.amountDue, installment.principalDue, installment.interestDue],
          10_000
        );
      }
    }

    await dbManager.executeUnsafe(
      `UPDATE loans
       SET status = 'active', disbursed_by = $1, disbursed_at = NOW(), updated_at = NOW()
       WHERE id = $2`,
      [disbursedBy, id],
      10_000
    );
    const postingRows = await dbManager.executeUnsafe<LoanDbRow>(`SELECT l.id, l.loan_number, l.principal, l.disbursed_at, l.approved_by, b.full_name FROM loans l INNER JOIN loan_borrowers b ON b.id = l.borrower_id WHERE l.id = $1 LIMIT 1`, [id], 10_000);
    if (postingRows[0]) await this.postDisbursementJournal(postingRows[0]);
    return this.getLoanDetail(id);
  }

  async rejectLoan(id: string, approvedBy: string): Promise<LoanEntity | null> {
    await this.ensureTables();
    const loan = await this.getLoan(id);
    if (!loan) return null;
    if (loan.status !== "pending" && loan.status !== "waiting") throw new Error("Only pending or waiting loan applications can be rejected");
    await dbManager.executeUnsafe(
      `UPDATE loans SET status = 'rejected', approved_by = $1, approved_at = NOW(), updated_at = NOW() WHERE id = $2`,
      [approvedBy, id],
      10_000
    );
    return this.getLoan(id);
  }

  async recordPayment(id: string, input: RecordPaymentInput, receivedBy: string): Promise<LoanDetail | null> {
    await this.ensureTables();
    const loan = await this.getLoan(id);
    if (!loan) return null;
    if (loan.status !== "active" && loan.status !== "defaulted") {
      throw new Error("Payments can only be recorded for active loans");
    }
    const amount = roundMoney(input.amount);
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("Payment amount must be greater than zero");
    if (amount > loan.outstandingBalance + 0.005) throw new Error("Payment cannot exceed the outstanding balance");
    const paymentDate = input.paymentDate || new Date().toISOString().slice(0, 10);
    if (!isValidDate(paymentDate)) throw new Error("Payment date is invalid");
    const method = input.method || "cash";
    if (!PAYMENT_METHODS.includes(method)) throw new Error("Payment method is invalid");

    const scheduleRows = await dbManager.executeUnsafe<LoanDbRow>(
      `SELECT id, amount_due, amount_paid, principal_due, interest_due FROM loan_repayment_schedule
       WHERE loan_id = $1 AND amount_paid < amount_due - 0.005
       ORDER BY due_date ASC, installment_number ASC`,
      [id],
      10_000
    );
    let remaining = amount;
    let principalAmount = 0;
    let interestAmount = 0;
    for (const row of scheduleRows) {
      if (remaining <= 0.004) break;
      const outstandingInstallment = roundMoney(asNumber(row.amount_due) - asNumber(row.amount_paid));
      const applied = Math.min(remaining, outstandingInstallment);
      const scheduledAmount = asNumber(row.amount_due);
      const appliedInterest = scheduledAmount > 0
        ? roundMoney(applied * (asNumber(row.interest_due) / scheduledAmount))
        : 0;
      const appliedPrincipal = roundMoney(applied - appliedInterest);
      const nextPaid = roundMoney(asNumber(row.amount_paid) + applied);
      await dbManager.executeUnsafe(
        `UPDATE loan_repayment_schedule
         SET amount_paid = $1, status = CASE WHEN $1 >= amount_due - 0.005 THEN 'paid' ELSE 'partial' END
         WHERE id = $2`,
        [nextPaid, row.id],
        10_000
      );
      principalAmount = roundMoney(principalAmount + appliedPrincipal);
      interestAmount = roundMoney(interestAmount + appliedInterest);
      remaining = roundMoney(remaining - applied);
    }
    if (remaining > 0.005) throw new Error("Payment could not be allocated to the repayment schedule");

    const newOutstanding = roundMoney(Math.max(0, loan.outstandingBalance - amount));
    const paymentRows = await dbManager.executeUnsafe<LoanDbRow>(
      `INSERT INTO loan_payments (
        loan_id, payment_date, amount, principal_amount, interest_amount, payment_method, reference, notes, received_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [id, paymentDate, amount, principalAmount, interestAmount, method, cleanText(input.reference), cleanText(input.notes), receivedBy],
      10_000
    );
    await dbManager.executeUnsafe(
      `UPDATE loans SET outstanding_balance = $1, status = CASE WHEN $1 <= 0.005 THEN 'closed' ELSE status END, updated_at = NOW() WHERE id = $2`,
      [newOutstanding, id],
      10_000
    );
    const paymentId = asString(paymentRows[0]?.id);
    if (paymentId) {
      const journalRows = await dbManager.executeUnsafe<LoanDbRow>(`
        SELECT p.id AS payment_id, p.loan_id, p.payment_date, p.amount, p.principal_amount, p.interest_amount, p.reference, p.received_by,
               l.loan_number, b.full_name, ltd.income_account
        FROM loan_payments p INNER JOIN loans l ON l.id = p.loan_id INNER JOIN loan_borrowers b ON b.id = l.borrower_id
        LEFT JOIN loan_type_definitions ltd ON LOWER(ltd.name) = LOWER(l.loan_type)
        WHERE p.id = $1 LIMIT 1
      `, [paymentId], 10_000);
      if (journalRows[0]) await this.postPaymentJournal(journalRows[0]);
    }
    return this.getLoanDetail(id);
  }

  async deleteLoan(id: string): Promise<boolean> {
    await this.ensureTables();
    const loan = await this.getLoan(id);
    if (!loan) return false;
    if (loan.status !== "pending" && loan.status !== "rejected" && loan.status !== "draft") {
      throw new Error("Only pending, draft, or rejected loan applications can be deleted");
    }
    await dbManager.executeUnsafe(`DELETE FROM loans WHERE id = $1`, [id], 10_000);
    return true;
  }

  async getDashboard(filter: LoanDashboardFilter = {}): Promise<LoanDashboardData> {
    await this.ensureTables();
    const range = normalizeDashboardFilter(filter);
    const loanDates = dateCondition("l.created_at::date", range);
    const disbursementDates = dateCondition("l.disbursed_at::date", range);
    const paymentDates = dateCondition("p.payment_date", range);
    const collateralDates = dateCondition("c.created_at::date", range);
    const scheduleDates = dateCondition("s.due_date", range);

    const [loanStatsRows, disbursementRows, paymentRows, residualRows, arrearsRows, collateralRows, overdueRows, portfolioRows, statusSummaryRows, branchPerformanceRows, loanTypeDistributionRows, collectionRows, recentLoans, approvalRows, repaymentRows, revenueRows, loanTrendRows] = await Promise.all([
      dbManager.executeUnsafe<LoanDbRow>(
        `SELECT COUNT(*) AS loans, COUNT(*) FILTER (WHERE l.status = 'active') AS active_loans,
          COUNT(*) FILTER (WHERE l.status IN ('pending', 'waiting')) AS pending_approvals,
          COUNT(*) FILTER (WHERE l.status = 'draft') AS draft_loans
         FROM loans l WHERE 1 = 1 ${loanDates.sql}`,
        loanDates.params, 10_000
      ),
      dbManager.executeUnsafe<LoanDbRow>(
        `SELECT COALESCE(SUM(l.principal), 0) AS total_disbursed
         FROM loans l WHERE l.status IN ('active', 'closed') ${disbursementDates.sql}`,
        disbursementDates.params, 10_000
      ),
      dbManager.executeUnsafe<LoanDbRow>(
        `SELECT COALESCE(SUM(p.amount), 0) AS total_repayments
         FROM loan_payments p WHERE 1 = 1 ${paymentDates.sql}`,
        paymentDates.params, 10_000
      ),
      dbManager.executeUnsafe<LoanDbRow>(
        `SELECT COALESCE(SUM(l.outstanding_balance), 0) AS total_outstanding
         FROM loans l WHERE l.status = 'active' ${loanDates.sql}`,
        loanDates.params, 10_000
      ),
      dbManager.executeUnsafe<LoanDbRow>(
        `SELECT COALESCE(SUM(s.amount_due - s.amount_paid), 0) AS arrears
         FROM loan_repayment_schedule s
         INNER JOIN loans l ON l.id = s.loan_id
         WHERE l.status = 'active' AND s.amount_paid < s.amount_due - 0.005 AND s.due_date < CURRENT_DATE ${scheduleDates.sql}`,
        scheduleDates.params, 10_000
      ),
      dbManager.executeUnsafe<LoanDbRow>(
        `SELECT COUNT(*) AS collateral_count, COALESCE(SUM(c.estimated_value), 0) AS collateral_value,
          COALESCE(SUM(c.market_value), 0) AS collateral_market_value
         FROM loan_collaterals c WHERE 1 = 1 ${collateralDates.sql}`,
        collateralDates.params, 10_000
      ),
      dbManager.executeUnsafe<LoanDbRow>(
        `SELECT COUNT(DISTINCT l.id) AS overdue_loans
         FROM loans l INNER JOIN loan_repayment_schedule s ON s.loan_id = l.id
         WHERE l.status = 'active' AND s.amount_paid < s.amount_due - 0.005 AND s.due_date < CURRENT_DATE ${scheduleDates.sql}`,
        scheduleDates.params, 10_000
      ),
      dbManager.executeUnsafe<LoanDbRow>(
        `SELECT l.loan_type, COUNT(*) AS value FROM loans l
         WHERE l.status <> 'rejected' ${loanDates.sql}
         GROUP BY l.loan_type ORDER BY value DESC, l.loan_type ASC LIMIT 5`,
        loanDates.params, 10_000
      ),
      dbManager.executeUnsafe<LoanDbRow>(
        `SELECT l.status AS label, COUNT(*) AS value
         FROM loans l WHERE 1 = 1 ${loanDates.sql}
         GROUP BY l.status ORDER BY COUNT(*) DESC`,
        loanDates.params, 10_000
      ),
      dbManager.executeUnsafe<LoanDbRow>(
        `SELECT COALESCE(l.branch_location, 'Unknown') AS branch, COUNT(*) AS count,
          COALESCE(SUM(l.outstanding_balance), 0) AS total_outstanding
         FROM loans l WHERE 1 = 1 ${loanDates.sql}
         GROUP BY COALESCE(l.branch_location, 'Unknown') ORDER BY count DESC LIMIT 6`,
        loanDates.params, 10_000
      ),
      dbManager.executeUnsafe<LoanDbRow>(
        `SELECT l.loan_type AS label, COUNT(*) AS value FROM loans l
         WHERE 1 = 1 ${loanDates.sql}
         GROUP BY l.loan_type ORDER BY value DESC LIMIT 6`,
        loanDates.params, 10_000
      ),
      dbManager.executeUnsafe<LoanDbRow>(
        `SELECT CASE
            WHEN l.status = 'active' AND EXISTS (
              SELECT 1 FROM loan_repayment_schedule s WHERE s.loan_id = l.id
              AND s.amount_paid < s.amount_due - 0.005 AND s.due_date < CURRENT_DATE
            ) THEN 'Overdue'
            WHEN l.status = 'active' THEN 'Collecting'
            ELSE 'Other'
          END AS label,
          COUNT(*) AS value
         FROM loans l WHERE 1 = 1 ${loanDates.sql}
         GROUP BY 1 ORDER BY value DESC`,
        loanDates.params, 10_000
      ),
      this.listLoans({ limit: 6 }),
      dbManager.executeUnsafe<LoanDbRow>(
        `SELECT l.loan_number, b.full_name, l.principal, l.approved_at
         FROM loans l INNER JOIN loan_borrowers b ON b.id = l.borrower_id
         WHERE l.status IN ('active', 'closed') AND l.approved_at IS NOT NULL ${disbursementDates.sql}
         ORDER BY l.approved_at DESC LIMIT 5`,
        disbursementDates.params, 10_000
      ),
      dbManager.executeUnsafe<LoanDbRow>(
        `SELECT COUNT(*) FILTER (WHERE l.status = 'closed') AS closed_loans,
          COUNT(*) FILTER (WHERE l.status = 'defaulted') AS defaulted_loans,
          COUNT(*) FILTER (WHERE l.status = 'active' AND EXISTS (
            SELECT 1 FROM loan_repayment_schedule s WHERE s.loan_id = l.id
            AND s.amount_paid < s.amount_due - 0.005 AND s.due_date < CURRENT_DATE
          )) AS overdue_loans,
          COUNT(*) FILTER (WHERE l.status = 'active' AND NOT EXISTS (
            SELECT 1 FROM loan_repayment_schedule s WHERE s.loan_id = l.id
            AND s.amount_paid < s.amount_due - 0.005 AND s.due_date <= CURRENT_DATE + INTERVAL '7 days'
          )) AS on_time_loans,
          COUNT(*) FILTER (WHERE l.status = 'active' AND NOT EXISTS (
            SELECT 1 FROM loan_repayment_schedule s WHERE s.loan_id = l.id
            AND s.amount_paid < s.amount_due - 0.005 AND s.due_date < CURRENT_DATE
          ) AND EXISTS (
            SELECT 1 FROM loan_repayment_schedule s WHERE s.loan_id = l.id
            AND s.amount_paid < s.amount_due - 0.005 AND s.due_date <= CURRENT_DATE + INTERVAL '7 days'
          )) AS due_soon_loans
         FROM loans l WHERE 1 = 1 ${loanDates.sql}`,
        loanDates.params, 10_000
      ),
      dbManager.executeUnsafe<LoanDbRow>(
        `SELECT TO_CHAR(DATE_TRUNC('month', p.payment_date), 'YYYY-MM') AS month,
          TO_CHAR(DATE_TRUNC('month', p.payment_date), 'Mon YYYY') AS label,
          COALESCE(SUM(p.interest_amount), 0) AS value
         FROM loan_payments p WHERE 1 = 1 ${paymentDates.sql}
         GROUP BY DATE_TRUNC('month', p.payment_date)
         ORDER BY DATE_TRUNC('month', p.payment_date) DESC LIMIT 12`,
        paymentDates.params, 10_000
      ),
      dbManager.executeUnsafe<LoanDbRow>(
        `SELECT TO_CHAR(DATE_TRUNC('month', l.created_at), 'YYYY-MM') AS month,
          TO_CHAR(DATE_TRUNC('month', l.created_at), 'Mon YYYY') AS label,
          COUNT(*) AS value
         FROM loans l WHERE 1 = 1 ${loanDates.sql}
         GROUP BY DATE_TRUNC('month', l.created_at)
         ORDER BY DATE_TRUNC('month', l.created_at) DESC LIMIT 12`,
        loanDates.params, 10_000
      ),
    ]);

    const loanStats = loanStatsRows[0] || {};
    const repayment = repaymentRows[0] || {};
    const collateral = collateralRows[0] || {};
    return {
      stats: {
        loans: asNumber(loanStats.loans),
        activeLoans: asNumber(loanStats.active_loans),
        pendingApprovals: asNumber(loanStats.pending_approvals),
        totalDisbursed: asNumber(disbursementRows[0]?.total_disbursed),
        totalRepayments: asNumber(paymentRows[0]?.total_repayments),
        totalOutstanding: asNumber(residualRows[0]?.total_outstanding),
        arrears: asNumber(arrearsRows[0]?.arrears),
        overdueLoans: asNumber(overdueRows[0]?.overdue_loans),
        collateralCount: asNumber(collateral.collateral_count),
        collateralValue: asNumber(collateral.collateral_value),
        collateralMarketValue: asNumber(collateral.collateral_market_value),
        draftLoans: asNumber(loanStats.draft_loans),
      },
      portfolio: portfolioRows.map((row, index) => ({
        label: asString(row.loan_type), value: asNumber(row.value), color: portfolioColors[index % portfolioColors.length],
      })),
      repayment: [
        { label: "On Time", value: asNumber(repayment.on_time_loans), color: "#10b981" },
        { label: "Due Soon", value: asNumber(repayment.due_soon_loans), color: "#f59e0b" },
        { label: "Overdue", value: asNumber(repayment.overdue_loans), color: "#ef4444" },
        { label: "Defaulted", value: asNumber(repayment.defaulted_loans), color: "#64748b" },
        { label: "Closed", value: asNumber(repayment.closed_loans), color: "#0ea5e9" },
      ].filter((segment) => segment.value > 0),
      statusSummary: statusSummaryRows.map((row) => ({ label: asString(row.label), value: asNumber(row.value), color: "#3b82f6" })),
      branchPerformance: branchPerformanceRows.map((row) => ({
        branch: asString(row.branch), count: asNumber(row.count), totalOutstanding: asNumber(row.total_outstanding),
      })),
      loanTypeDistribution: loanTypeDistributionRows.map((row, index) => ({
        label: asString(row.label), value: asNumber(row.value), color: portfolioColors[index % portfolioColors.length],
      })),
      collectionPerformance: collectionRows.map((row, index) => ({
        label: asString(row.label), value: asNumber(row.value), color: ["#10b981", "#f59e0b", "#ef4444", "#64748b"][index % 4],
      })),
      approvals: approvalRows.map((row) => ({
        id: asString(row.loan_number), borrower: asString(row.full_name), amount: asNumber(row.principal), status: "Approved" as const, approvedAt: asDateTime(row.approved_at),
      })),
      recentLoans,
      revenue: revenueRows.reverse().map((row) => ({ month: asString(row.month), label: asString(row.label), value: asNumber(row.value) })),
      loanTrend: loanTrendRows.reverse().map((row) => ({ month: asString(row.month), label: asString(row.label), value: asNumber(row.value) })),
    };
  }
}

export const loanService = LoanService.getInstance();
