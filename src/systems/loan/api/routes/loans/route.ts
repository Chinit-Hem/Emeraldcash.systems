import { NextRequest, NextResponse } from "next/server";

import { auditEventFromRequest, recordAuditEvent } from "@/lib/audit-log";
import { requirePermission } from "@/lib/auth-helpers";
import { LOAN_STATUSES, loanService, type CreateLoanInput, type UpdateLoanInput, type LoanContactsInformation, type LoanEntity, type LoanApprovalStage, type LoanInformation, type LoanRelatedContact, type LoanStatus } from "@/systems/loan/services/LoanService";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asNumber(value: unknown): number {
  return typeof value === "number" ? value : Number(value);
}

function parseLoanInformation(value: unknown): Partial<LoanInformation> | undefined {
  const information = asRecord(value);
  if (!Object.keys(information).length) return undefined;
  const amount = (key: keyof LoanInformation) => Math.max(0, asNumber(information[key] ?? 0) || 0);
  const text = (key: keyof LoanInformation) => information[key] == null || String(information[key]).trim() === "" ? null : String(information[key]).trim();
  return {
    amountToPayKHR: text("amountToPayKHR"),
    refinanceAmount: amount("refinanceAmount"),
    roadTaxFee: amount("roadTaxFee"),
    vehicleInspectionFee: amount("vehicleInspectionFee"),
    taxStampFee: amount("taxStampFee"),
    adminFee: amount("adminFee"),
    withholdingFee: amount("withholdingFee"),
    collateralCheckFee: amount("collateralCheckFee"),
    loanFee: amount("loanFee"),
    sourceLoan: text("sourceLoan"),
    penaltyRule: text("penaltyRule"),
    feeCharge: text("feeCharge"),
  };
}

function parseLoanRelatedContact(value: unknown): LoanRelatedContact | null {
  const contact = asRecord(value);
  const name = String(contact.name || "").trim();
  if (!name) return null;
  const limitValue = asNumber(contact.limit);
  const text = (key: string) => contact[key] == null || String(contact[key]).trim() === "" ? null : String(contact[key]).trim();
  return {
    contactId: text("contactId"),
    name,
    phone: text("phone"),
    email: text("email"),
    address1: text("address1"),
    address2: text("address2"),
    relation: text("relation"),
    type: text("type"),
    limit: Number.isFinite(limitValue) ? Math.max(0, limitValue) : null,
  };
}

function parseLoanContacts(value: unknown): Partial<LoanContactsInformation> | undefined {
  const contacts = asRecord(value);
  if (!Object.keys(contacts).length) return undefined;
  const text = (key: string) => contacts[key] == null || String(contacts[key]).trim() === "" ? null : String(contacts[key]).trim();
  const list = (key: string) => Array.isArray(contacts[key]) ? (contacts[key] as unknown[]).flatMap((item) => {
    const contact = parseLoanRelatedContact(item);
    return contact ? [contact] : [];
  }) : [];
  return {
    bm: text("bm"),
    collectionOfficer: text("collectionOfficer"),
    loanSpecialist: text("loanSpecialist"),
    coBorrowers: list("coBorrowers"),
    brokers: list("brokers"),
    guarantors: list("guarantors"),
  };
}

export function parseLoanPayload(body: unknown): CreateLoanInput {
  const data = asRecord(body);
  const borrower = asRecord(data.borrower);
  const collaterals = Array.isArray(data.collaterals)
    ? data.collaterals.map((item) => {
      const collateral = asRecord(item);
      return {
        type: String(collateral.type ?? collateral.collateralType ?? ""),
        description: collateral.description == null ? null : String(collateral.description),
        reference: collateral.reference == null ? null : String(collateral.reference),
        value: asNumber(collateral.value ?? collateral.estimatedValue ?? collateral.estimated_value),
        marketValue: asNumber(collateral.marketValue ?? collateral.market_value),
      };
    })
    : undefined;
  return {
    borrowerId: data.borrowerId == null ? (data.borrower_id == null ? null : String(data.borrower_id)) : String(data.borrowerId),
    borrower: {
      fullName: String(borrower.fullName ?? borrower.full_name ?? ""),
      phone: borrower.phone == null ? null : String(borrower.phone),
      email: borrower.email == null ? null : String(borrower.email),
      nationalId: borrower.nationalId == null ? (borrower.national_id == null ? null : String(borrower.national_id)) : String(borrower.nationalId),
      address: borrower.address == null ? null : String(borrower.address),
      occupation: borrower.occupation == null ? null : String(borrower.occupation),
      income: borrower.income == null ? null : asNumber(borrower.income),
      guarantor: borrower.guarantor == null ? null : String(borrower.guarantor),
      profile: Object.fromEntries(Object.entries(asRecord(borrower.profile)).filter(([, value]) => typeof value === "string")) as Record<string, string>,
    },
    loanType: String(data.loanType ?? data.loan_type ?? ""),
    principal: asNumber(data.principal),
    loanAmountKHR: data.loanAmountKHR == null && data.loan_amount_khr == null ? null : String(data.loanAmountKHR ?? data.loan_amount_khr),
    interestRate: asNumber(data.interestRate ?? data.interest_rate ?? 0),
    termMonths: asNumber(data.termMonths ?? data.term_months),
    repaymentFrequency: String(data.repaymentFrequency ?? data.repayment_frequency ?? "monthly") as LoanEntity["repaymentFrequency"],
    interestModel: String(data.interestModel ?? data.interest_model ?? "equal_installments") as LoanEntity["interestModel"],
    formula: data.formula == null ? null : String(data.formula),
    branchLocation: data.branchLocation == null ? null : String(data.branchLocation),
    loanOfficer: data.loanOfficer == null ? null : String(data.loanOfficer),
    approvalStage: String(data.approvalStage ?? data.approval_stage ?? "draft") as LoanApprovalStage,
    creditScore: data.creditScore == null ? null : asNumber(data.creditScore ?? data.credit_score),
    startDate: String(data.startDate ?? data.start_date ?? ""),
    contractDate: String(data.contractDate ?? data.contract_date ?? data.startDate ?? data.start_date ?? ""),
    contractDateLunar: data.contractDateLunar == null && data.contract_date_lunar == null ? null : String(data.contractDateLunar ?? data.contract_date_lunar),
    contractEndDate: String(data.contractEndDate ?? data.contract_end_date ?? data.firstPaymentDate ?? data.first_payment_date ?? ""),
    firstPaymentDate: String(data.firstPaymentDate ?? data.first_payment_date ?? ""),
    purpose: data.purpose == null ? null : String(data.purpose),
    notes: data.notes == null ? null : String(data.notes),
    loanInformation: parseLoanInformation(data.loanInformation ?? data.loan_information),
    loanContacts: parseLoanContacts(data.loanContacts ?? data.loan_contacts),
    collaterals,
  };
}

export function parseLoanUpdatePayload(body: unknown): UpdateLoanInput {
  const data = asRecord(body);
  const borrower = asRecord(data.borrower);
  const collaterals = Array.isArray(data.collaterals)
    ? data.collaterals.map((item) => {
      const collateral = asRecord(item);
      return {
        type: String(collateral.type ?? collateral.collateralType ?? ""),
        description: collateral.description == null ? null : String(collateral.description),
        reference: collateral.reference == null ? null : String(collateral.reference),
        value: asNumber(collateral.value ?? collateral.estimatedValue ?? collateral.estimated_value),
        marketValue: asNumber(collateral.marketValue ?? collateral.market_value),
      };
    })
    : undefined;
  return {
    borrower: Object.keys(borrower).length ? {
      fullName: borrower.fullName == null ? borrower.full_name == null ? undefined : String(borrower.full_name) : String(borrower.fullName),
      phone: borrower.phone == null ? undefined : String(borrower.phone),
      email: borrower.email == null ? undefined : String(borrower.email),
      nationalId: borrower.nationalId == null ? borrower.national_id == null ? undefined : String(borrower.national_id) : String(borrower.nationalId),
      address: borrower.address == null ? undefined : String(borrower.address),
      occupation: borrower.occupation == null ? undefined : String(borrower.occupation),
      income: borrower.income == null ? undefined : asNumber(borrower.income),
      guarantor: borrower.guarantor == null ? undefined : String(borrower.guarantor),
      profile: borrower.profile == null ? undefined : Object.fromEntries(Object.entries(asRecord(borrower.profile)).filter(([, value]) => typeof value === "string")) as Record<string, string>,
    } : undefined,
    loanType: data.loanType == null && data.loan_type == null ? undefined : String(data.loanType ?? data.loan_type),
    principal: data.principal == null ? undefined : asNumber(data.principal),
    loanAmountKHR: data.loanAmountKHR == null && data.loan_amount_khr == null ? undefined : String(data.loanAmountKHR ?? data.loan_amount_khr),
    interestRate: data.interestRate == null && data.interest_rate == null ? undefined : asNumber(data.interestRate ?? data.interest_rate),
    termMonths: data.termMonths == null && data.term_months == null ? undefined : asNumber(data.termMonths ?? data.term_months),
    repaymentFrequency: data.repaymentFrequency == null && data.repayment_frequency == null ? undefined : String(data.repaymentFrequency ?? data.repayment_frequency) as LoanEntity["repaymentFrequency"],
    interestModel: data.interestModel == null && data.interest_model == null ? undefined : String(data.interestModel ?? data.interest_model) as LoanEntity["interestModel"],
    formula: data.formula == null ? undefined : String(data.formula),
    branchLocation: data.branchLocation == null && data.branch_location == null ? undefined : String(data.branchLocation ?? data.branch_location),
    loanOfficer: data.loanOfficer == null && data.loan_officer == null ? undefined : String(data.loanOfficer ?? data.loan_officer),
    approvalStage: data.approvalStage == null && data.approval_stage == null ? undefined : String(data.approvalStage ?? data.approval_stage) as LoanApprovalStage,
    creditScore: data.creditScore == null && data.credit_score == null ? undefined : asNumber(data.creditScore ?? data.credit_score),
    startDate: data.startDate == null && data.start_date == null ? undefined : String(data.startDate ?? data.start_date),
    contractDate: data.contractDate == null && data.contract_date == null ? undefined : String(data.contractDate ?? data.contract_date),
    contractDateLunar: data.contractDateLunar == null && data.contract_date_lunar == null ? undefined : String(data.contractDateLunar ?? data.contract_date_lunar),
    contractEndDate: data.contractEndDate == null && data.contract_end_date == null ? undefined : String(data.contractEndDate ?? data.contract_end_date),
    firstPaymentDate: data.firstPaymentDate == null && data.first_payment_date == null ? undefined : String(data.firstPaymentDate ?? data.first_payment_date),
    purpose: data.purpose == null ? undefined : String(data.purpose),
    notes: data.notes == null ? undefined : String(data.notes),
    loanInformation: parseLoanInformation(data.loanInformation ?? data.loan_information),
    loanContacts: parseLoanContacts(data.loanContacts ?? data.loan_contacts),
    collaterals,
  };
}

export async function GET(req: NextRequest) {
  try {
    const auth = requirePermission(req, "loans:view");
    if (auth.response) return auth.response;
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const parsedStatus = status && LOAN_STATUSES.includes(status as LoanStatus) ? status as LoanStatus : undefined;
    const limitValue = Number.parseInt(searchParams.get("limit") || "50", 10);
    const data = await loanService.listLoans({
      search: searchParams.get("search") || undefined,
      status: parsedStatus,
      limit: Number.isFinite(limitValue) ? limitValue : 50,
    });
    return NextResponse.json({ success: true, data }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to load loans" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = requirePermission(req, "loans:create");
    if (auth.response) return auth.response;
    const body = await req.json() as Record<string, unknown>;
    const isDraft = body.isDraft === true;
    let loan;
    if (isDraft) {
      loan = await loanService.createDraftLoan(body as Parameters<typeof loanService.createDraftLoan>[0], auth.session.username);
    } else {
      loan = await loanService.createLoan(parseLoanPayload(body), auth.session.username);
    }
    await recordAuditEvent(auditEventFromRequest(req, {
      action: "loan.application.create",
      actorUsername: auth.session.username,
      actorRole: auth.session.role,
      resourceType: "loan",
      resourceId: loan.id,
      status: "success",
      metadata: { loanNumber: loan.loanNumber, principal: loan.principal, borrower: loan.borrower.fullName },
    }));
    return NextResponse.json({ success: true, data: loan }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to create loan" },
      { status: 400 }
    );
  }
}
