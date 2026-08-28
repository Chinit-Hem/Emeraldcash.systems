import ExcelJS from "exceljs";

type Attachment = { imageUrl?: string; imageName?: string };
type CollectionRow = Attachment & { id: number; customer: string; amount: string; reason: string };
type ResolutionRow = Attachment & { id: number; customer: string; assetType: string; interest: string; penalty: string; principal: string; solution: string };
type DecisionRow = Attachment & { id: number; customer: string; type: string; amount: string; reason: string };
type AccountResolutionRowForExcel = { id: number; customer: string; assetType: string; interest: string; penalty: string; principal: string; note: string };
type AccountReportRecordForExcel = { reportDate: string; reporterUsername: string; reporterName: string; reporterPosition: string; department: string; branch: string; status: string; data: { dueRows?: CollectionRow[]; paidRows?: CollectionRow[]; dueNoticeRows?: AccountResolutionRowForExcel[]; promiseRows?: AccountResolutionRowForExcel[]; closedRows?: AccountResolutionRowForExcel[] } };
type OperationReportRecordForExcel = {
  reportDate: string;
  reporterUsername: string;
  reporterName: string;
  reporterPosition: string;
  department: string;
  branch: string;
  status: string;
  data: Partial<Pick<OperationReportExcelData, "collectionDueRows" | "collectionPaidRows" | "dueNoticeRows" | "followUpRows" | "formalNoticeRows" | "requestedRows" | "approvedRows" | "rejectedRows">>;
};
type LoanForBranchManagerExcel = {
  borrower: { fullName: string };
  loanType: string;
  principal: number;
  paymentAmount: number;
  outstandingBalance: number;
  branchLocation: string | null;
  repaymentStatus: string;
  startDate: string;
  nextPaymentDate: string | null;
  loanOfficer: string | null;
  loanContacts: { bm?: string | null; collectionOfficer?: string | null; loanSpecialist?: string | null };
};

export type OperationReportExcelData = {
  reportDate: string;
  branch: string;
  reporterName: string;
  reporterRole: string;
  department: string;
  collectionDueRows: CollectionRow[];
  collectionPaidRows: CollectionRow[];
  dueNoticeRows: ResolutionRow[];
  followUpRows: ResolutionRow[];
  formalNoticeRows: ResolutionRow[];
  requestedRows: DecisionRow[];
  approvedRows: DecisionRow[];
  rejectedRows: DecisionRow[];
};

export type BranchManagerOperationReportExcelData = OperationReportExcelData & {
  savedReports: OperationReportRecordForExcel[];
  monthReports: OperationReportRecordForExcel[];
  accountReports: AccountReportRecordForExcel[];
  monthAccountReports: AccountReportRecordForExcel[];
  loans: LoanForBranchManagerExcel[];
};

const GREEN = "006B2D";
const RED = "C00000";
const LIGHT = "E9EEF0";
const BORDER = "D6D9DD";
const KHMER_FONT = "Khmer OS Battambang";

function numberValue(value: string) {
  return Number(value.replace(/[^\d.-]/g, "")) || 0;
}

function nonEmpty<T extends { customer: string }>(rows: T[]) {
  return rows.filter((row) => row.customer.trim());
}

function excelReportDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  return Number.isNaN(date.getTime()) ? null : date;
}

function styleCells(sheet: ExcelJS.Worksheet, fromRow: number, toRow: number, fromColumn: number, toColumn: number) {
  for (let row = fromRow; row <= toRow; row += 1) {
    for (let column = fromColumn; column <= toColumn; column += 1) {
      const cell = sheet.getCell(row, column);
      cell.font = { name: KHMER_FONT, size: 11, ...cell.font };
      cell.alignment = { vertical: "middle", wrapText: true, ...cell.alignment };
      cell.border = {
        top: { style: "thin", color: { argb: BORDER } },
        left: { style: "thin", color: { argb: BORDER } },
        bottom: { style: "thin", color: { argb: BORDER } },
        right: { style: "thin", color: { argb: BORDER } },
      };
    }
  }
}

async function addBrandHeader(workbook: ExcelJS.Workbook, sheet: ExcelJS.Worksheet, data: OperationReportExcelData, lastColumn: number) {
  const lastColumnLetter = sheet.getColumn(lastColumn).letter;
  sheet.mergeCells("A1:B3");
  sheet.mergeCells(`C1:${lastColumnLetter}2`);
  sheet.mergeCells(`C3:${lastColumnLetter}3`);
  sheet.getCell("C1").value = "ក្រុមហ៊ុន អេមើរ៉ល ឃែស ឯ.ក";
  sheet.getCell("C1").font = { name: "Khmer OS Muol Light", size: 20, color: { argb: RED } };
  sheet.getCell("C1").alignment = { horizontal: "center", vertical: "middle", wrapText: false, shrinkToFit: true };
  sheet.getCell("C3").value = "របាយការណ៍លទ្ធផលប្រចាំថ្ងៃ សាខា បឹងកេងកង";
  sheet.getCell("C3").font = { name: "Khmer OS Muol Light", size: 14, color: { argb: GREEN } };
  sheet.getCell("C3").alignment = { horizontal: "center", vertical: "middle", wrapText: false, shrinkToFit: true };
  sheet.getRow(1).height = 36;
  sheet.getRow(2).height = 32;
  sheet.getRow(3).height = 30;

  try {
    const logoResponse = await fetch("/logo-horizontal.png");
    if (logoResponse.ok) {
      const bytes = new Uint8Array(await logoResponse.arrayBuffer());
      let binary = "";
      bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
      const imageId = workbook.addImage({ base64: `data:image/png;base64,${btoa(binary)}`, extension: "png" });
      sheet.addImage(imageId, { tl: { col: 0.2, row: 0.55 }, ext: { width: 160, height: 67 } });
    }
  } catch {
    sheet.getCell("A1").value = "Emerald Cash";
    sheet.getCell("A1").font = { bold: true, color: { argb: GREEN } };
  }

  const identityRows: Array<[string, string | Date | null]> = [
    ["កាលបរិច្ឆេទ៖", excelReportDate(data.reportDate)],
    ["ឈ្មោះ៖", data.reporterName],
    ["តួនាទី៖", data.reporterRole],
    ["នាយកដ្ឋាន៖", data.department],
  ];
  identityRows.forEach(([label, value], index) => {
    const row = 5 + index;
    sheet.mergeCells(row, 1, row, 3);
    sheet.mergeCells(row, 4, row, Math.min(lastColumn, 6));
    sheet.getCell(row, 1).value = label;
    sheet.getCell(row, 1).font = { name: KHMER_FONT, bold: true };
    sheet.getCell(row, 1).alignment = { horizontal: "right", vertical: "middle" };
    const valueCell = sheet.getCell(row, 4);
    valueCell.value = value || "";
    if (value instanceof Date) valueCell.numFmt = "[$-en-US]dddd, dd mmmm yyyy";
    valueCell.alignment = { horizontal: "left", vertical: "middle" };
    sheet.getRow(row).height = 24;
  });
  styleCells(sheet, 1, 9, 1, lastColumn);
}

async function addBranchManagerHeader(workbook: ExcelJS.Workbook, sheet: ExcelJS.Worksheet, data: OperationReportExcelData, lastColumn: number, consolidated = false) {
  const lastColumnLetter = sheet.getColumn(lastColumn).letter;
  sheet.mergeCells(consolidated ? "A1:B3" : "A1:B2");
  sheet.mergeCells(`C1:${lastColumnLetter}2`);
  sheet.getCell("C1").value = "ក្រុមហ៊ុន អេមើរ៉ល ឃែស ឯ.ក";
  sheet.getCell("C1").font = { name: "Khmer OS Muol Light", size: 20, bold: true, color: { argb: GREEN } };
  sheet.getCell("C1").alignment = { horizontal: "center", vertical: "middle", shrinkToFit: true };
  sheet.getRow(1).height = 34;
  sheet.getRow(2).height = 28;
  sheet.getRow(3).height = consolidated ? 18 : 30;

  try {
    const logoResponse = await fetch("/logo-horizontal.png");
    if (logoResponse.ok) {
      const bytes = new Uint8Array(await logoResponse.arrayBuffer());
      let binary = "";
      bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
      const imageId = workbook.addImage({ base64: `data:image/png;base64,${btoa(binary)}`, extension: "png" });
      sheet.addImage(imageId, { tl: { col: 0.15, row: 0.15 }, ext: { width: 150, height: 62 } });
    }
  } catch {
    sheet.getCell("A1").value = "Emerald Cash";
    sheet.getCell("A1").font = { name: "Arial", size: 16, bold: true, color: { argb: GREEN } };
    sheet.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
  }

  if (consolidated) {
    sheet.mergeCells(`C3:${lastColumnLetter}3`);
    sheet.getCell("C3").value = "ទិន្នន័យប្រកាសសរុបពីមន្ត្រីឥណទានទាំងអស់ប្រចាំថ្ងៃ";
    sheet.getCell("C3").font = { name: "Khmer OS Muol Light", size: 14, bold: true, color: { argb: GREEN } };
    sheet.getCell("C3").alignment = { horizontal: "center", vertical: "middle", shrinkToFit: true };
    styleCells(sheet, 1, 3, 1, lastColumn);
    return 5;
  }

  sheet.mergeCells(`A3:${lastColumnLetter}3`);
  sheet.getCell("A3").value = "របាយការណ៍សង្ខេបលទ្ធផលប្រចាំថ្ងៃ - ថ្នាក់ប្រធានសាខា (Branch Manager Daily Report)";
  sheet.getCell("A3").font = { name: "Khmer OS Muol Light", size: 14, bold: true, color: { argb: GREEN } };
  sheet.getCell("A3").alignment = { horizontal: "center", vertical: "middle", shrinkToFit: true };

  const date = excelReportDate(data.reportDate);
  const metadataRows: Array<[number, string, string, string, string | Date | null]> = [
    [4, "សាខា៖", data.branch, "កាលបរិច្ឆេទ៖", date],
    [5, "ឈ្មោះប្រធានសាខា៖", data.reporterName, "នាយកដ្ឋាន៖", data.department || data.reporterRole],
  ];
  metadataRows.forEach(([row, leftLabel, leftValue, rightLabel, rightValue]) => {
    sheet.mergeCells(row, 1, row, 2);
    sheet.mergeCells(row, 3, row, 4);
    sheet.mergeCells(row, 6, row, lastColumn);
    sheet.getCell(row, 1).value = leftLabel;
    sheet.getCell(row, 3).value = leftValue;
    sheet.getCell(row, 5).value = rightLabel;
    sheet.getCell(row, 6).value = rightValue || "";
    [1, 5].forEach((column) => {
      sheet.getCell(row, column).font = { name: KHMER_FONT, bold: true };
      sheet.getCell(row, column).alignment = { horizontal: "right", vertical: "middle" };
    });
    if (rightValue instanceof Date) sheet.getCell(row, 6).numFmt = "[$-en-US]dddd, dd mmmm yyyy";
    sheet.getRow(row).height = 25;
  });
  styleCells(sheet, 1, 5, 1, lastColumn);
  return 7;
}

function addSectionTitle(sheet: ExcelJS.Worksheet, row: number, title: string, lastColumn: number, color = GREEN) {
  sheet.mergeCells(row, 1, row, lastColumn);
  const cell = sheet.getCell(row, 1);
  cell.value = title;
  cell.font = { name: KHMER_FONT, size: 13, bold: true, color: { argb: color } };
  cell.alignment = { vertical: "middle" };
  sheet.getRow(row).height = 26;
}

function addTable(
  sheet: ExcelJS.Worksheet,
  startRow: number,
  title: string,
  headers: string[],
  rows: Array<Array<string | number | { text: string; hyperlink: string }>>,
  numericColumns: number[],
  totalColumns: number[],
  headerColor = GREEN
) {
  addSectionTitle(sheet, startRow, title, headers.length, headerColor);
  const headerRow = startRow + 1;
  headers.forEach((header, index) => {
    const cell = sheet.getCell(headerRow, index + 1);
    cell.value = header;
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: headerColor } };
    cell.font = { name: KHMER_FONT, bold: true, color: { argb: "FFFFFF" } };
    cell.alignment = { horizontal: index === 0 ? "center" : "left", vertical: "middle", wrapText: true };
  });
  sheet.getRow(headerRow).height = 30;
  rows.forEach((values, rowIndex) => {
    const excelRow = headerRow + rowIndex + 1;
    values.forEach((value, columnIndex) => {
      const cell = sheet.getCell(excelRow, columnIndex + 1);
      cell.value = value;
      if (numericColumns.includes(columnIndex + 1)) {
        cell.numFmt = "$#,##0.00;[Red]-$#,##0.00";
        cell.alignment = { horizontal: "right", vertical: "middle" };
      }
    });
    sheet.getRow(excelRow).height = 25;
  });
  const totalRow = headerRow + rows.length + 1;
  const firstTotalColumn = Math.min(...totalColumns);
  if (firstTotalColumn > 2) sheet.mergeCells(totalRow, 1, totalRow, firstTotalColumn - 1);
  const totalLabel = sheet.getCell(totalRow, 1);
  totalLabel.value = "សរុប / Total";
  totalLabel.font = { name: KHMER_FONT, bold: true, color: { argb: RED } };
  totalLabel.alignment = { horizontal: "center", vertical: "middle" };
  totalColumns.forEach((column) => {
    const cell = sheet.getCell(totalRow, column);
    const firstDataRow = headerRow + 1;
    const lastDataRow = Math.max(firstDataRow, totalRow - 1);
    cell.value = rows.length ? { formula: `SUM(${sheet.getColumn(column).letter}${firstDataRow}:${sheet.getColumn(column).letter}${lastDataRow})` } : 0;
    cell.numFmt = "$#,##0.00;[Red]-$#,##0.00";
    cell.font = { name: KHMER_FONT, bold: true, color: { argb: RED } };
  });
  for (let column = 1; column <= headers.length; column += 1) {
    sheet.getCell(totalRow, column).fill = { type: "pattern", pattern: "solid", fgColor: { argb: LIGHT } };
  }
  sheet.getRow(totalRow).height = 28;
  styleCells(sheet, startRow, totalRow, 1, headers.length);
  return totalRow + 2;
}

function photoLink(row: Attachment) {
  return row.imageUrl ? { text: row.imageName || "View photo", hyperlink: row.imageUrl } : "";
}

function configureSheet(sheet: ExcelJS.Worksheet, widths: number[], landscape = true) {
  widths.forEach((width, index) => { sheet.getColumn(index + 1).width = width; });
  sheet.views = [{ state: "frozen", ySplit: 10 }];
  sheet.pageSetup = { orientation: landscape ? "landscape" : "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9, margins: { left: 0.25, right: 0.25, top: 0.35, bottom: 0.35, header: 0.15, footer: 0.15 } };
  sheet.headerFooter.oddFooter = "Page &P of &N";
}

function moneySum<T>(rows: T[] | undefined, key: keyof T) {
  return (rows || []).reduce((sum, row) => sum + numberValue(String(row[key] || "")), 0);
}

function reportRowsForDate<T extends { reportDate: string }>(records: T[], reportDate: string): T[] {
  return records.filter((record) => record.reportDate === reportDate);
}

function branchLoansForDate(loans: LoanForBranchManagerExcel[], reportDate: string, branch: string) {
  const normalizedBranch = branch.trim().toLocaleLowerCase();
  return loans.filter((loan) => {
    const matchesBranch = !normalizedBranch || String(loan.branchLocation || "").trim().toLocaleLowerCase() === normalizedBranch;
    return matchesBranch && loan.nextPaymentDate && loan.nextPaymentDate.slice(0, 10) <= reportDate && !["Closed", "Rejected"].includes(loan.repaymentStatus);
  });
}

function branchLoans(loans: LoanForBranchManagerExcel[], branch: string) {
  const normalizedBranch = branch.trim().toLocaleLowerCase();
  return loans.filter((loan) => !normalizedBranch || String(loan.branchLocation || "").trim().toLocaleLowerCase() === normalizedBranch);
}

function daysBetween(from: string, to: string) {
  const fromTime = new Date(`${from.slice(0, 10)}T00:00:00Z`).getTime();
  const toTime = new Date(`${to.slice(0, 10)}T00:00:00Z`).getTime();
  if (!Number.isFinite(fromTime) || !Number.isFinite(toTime)) return 0;
  return Math.floor((toTime - fromTime) / 86_400_000);
}

function addBmTable(
  sheet: ExcelJS.Worksheet,
  startRow: number,
  title: string,
  headers: string[],
  rows: Array<Array<string | number>>,
  numericColumns: number[] = [],
  totalColumns: number[] = [],
  countTotalColumns: number[] = []
) {
  addSectionTitle(sheet, startRow, title, headers.length, GREEN);
  sheet.getCell(startRow, 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: GREEN } };
  sheet.getCell(startRow, 1).font = { name: KHMER_FONT, size: 13, bold: true, color: { argb: "FFFFFF" } };
  const headerRow = startRow + 1;
  headers.forEach((header, index) => {
    const cell = sheet.getCell(headerRow, index + 1);
    cell.value = header;
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GREEN } };
    cell.font = { name: KHMER_FONT, bold: true, color: { argb: "FFFFFF" } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  });
  rows.forEach((values, rowIndex) => {
    const excelRow = headerRow + rowIndex + 1;
    values.forEach((value, columnIndex) => {
      const cell = sheet.getCell(excelRow, columnIndex + 1);
      cell.value = value;
      if (numericColumns.includes(columnIndex + 1)) {
        cell.numFmt = "$#,##0.00;[Red]-$#,##0.00";
        cell.alignment = { horizontal: "right", vertical: "middle" };
      } else {
        cell.alignment = { horizontal: columnIndex === 0 ? "center" : "left", vertical: "middle", wrapText: true };
      }
    });
    sheet.getRow(excelRow).height = 26;
  });
  const hasTotals = totalColumns.length > 0 || countTotalColumns.length > 0;
  const totalRow = headerRow + rows.length + 1;
  if (hasTotals) {
    sheet.mergeCells(totalRow, 1, totalRow, 2);
    sheet.getCell(totalRow, 1).value = "សរុប";
    sheet.getCell(totalRow, 1).alignment = { horizontal: "center", vertical: "middle" };
    [...totalColumns, ...countTotalColumns].forEach((column) => {
      const firstDataRow = headerRow + 1;
      const lastDataRow = Math.max(firstDataRow, totalRow - 1);
      const cell = sheet.getCell(totalRow, column);
      cell.value = rows.length ? { formula: `SUM(${sheet.getColumn(column).letter}${firstDataRow}:${sheet.getColumn(column).letter}${lastDataRow})` } : 0;
      if (totalColumns.includes(column)) cell.numFmt = "$#,##0.00;[Red]-$#,##0.00";
    });
    for (let column = 1; column <= headers.length; column += 1) {
      const cell = sheet.getCell(totalRow, column);
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: LIGHT } };
      cell.font = { name: KHMER_FONT, bold: true, color: { argb: "FF0000" } };
    }
    sheet.getRow(totalRow).height = 28;
  }
  const lastStyledRow = hasTotals ? totalRow : headerRow + rows.length;
  styleCells(sheet, startRow, lastStyledRow, 1, headers.length);
  return lastStyledRow + 3;
}

function branchManagerStaffRows(records: OperationReportRecordForExcel[]) {
  const grouped = new Map<string, { name: string; requested: number; approved: number; disbursed: number; rejected: number; contacts: number }>();
  records.forEach((record) => {
    const key = record.reporterUsername || record.reporterName;
    const current = grouped.get(key) || { name: record.reporterName || record.reporterUsername, requested: 0, approved: 0, disbursed: 0, rejected: 0, contacts: 0 };
    current.requested += moneySum(record.data.requestedRows, "amount");
    current.approved += moneySum(record.data.approvedRows, "amount");
    current.disbursed += moneySum(record.data.collectionPaidRows, "amount");
    current.rejected += moneySum(record.data.rejectedRows, "amount");
    current.contacts += nonEmpty(record.data.collectionDueRows || []).length;
    grouped.set(key, current);
  });
  return Array.from(grouped.values()).sort((left, right) => right.requested - left.requested || left.name.localeCompare(right.name));
}

export async function buildBranchManagerOperationReportWorkbook(data: BranchManagerOperationReportExcelData) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Emerald Cash Branch Manager Daily Report";
  workbook.created = new Date();

  const dayRecords = reportRowsForDate(data.savedReports, data.reportDate);
  const monthRecords = data.monthReports;
  const dayAccountRecords = reportRowsForDate(data.accountReports, data.reportDate);
  const monthAccountRecords = data.monthAccountReports;
  const staffRows = branchManagerStaffRows(dayRecords);
  const monthStaffRows = branchManagerStaffRows(monthRecords);
  const scopedLoans = branchLoans(data.loans, data.branch);
  const loansDue = branchLoansForDate(scopedLoans, data.reportDate, data.branch);
  const totalApproved = staffRows.reduce((sum, row) => sum + row.approved, 0);
  const monthApproved = monthStaffRows.reduce((sum, row) => sum + row.approved, 0);
  const activeLoans = scopedLoans.filter((loan) => !["Closed", "Rejected", "Draft"].includes(loan.repaymentStatus));
  const outstanding = activeLoans.reduce((sum, loan) => sum + loan.outstandingBalance, 0);
  const overdueLoans = activeLoans.filter((loan) => loan.nextPaymentDate && loan.nextPaymentDate.slice(0, 10) < data.reportDate);
  const overdue30Loans = overdueLoans.filter((loan) => loan.nextPaymentDate && daysBetween(loan.nextPaymentDate, data.reportDate) > 30);
  const par1 = outstanding ? overdueLoans.reduce((sum, loan) => sum + loan.outstandingBalance, 0) / outstanding : 0;
  const par30 = outstanding ? overdue30Loans.reduce((sum, loan) => sum + loan.outstandingBalance, 0) / outstanding : 0;
  const approvedCustomers = dayRecords.reduce((sum, record) => sum + nonEmpty(record.data.approvedRows || []).length, 0);
  const monthApprovedCustomers = monthRecords.reduce((sum, record) => sum + nonEmpty(record.data.approvedRows || []).length, 0);
  const accountCount = (records: AccountReportRecordForExcel[], key: "dueRows" | "paidRows" | "dueNoticeRows" | "promiseRows" | "closedRows") => records.reduce((sum, record) => sum + (record.data[key] || []).filter((row) => row.customer.trim()).length, 0);
  const dueCustomers = accountCount(dayAccountRecords, "dueRows");
  const paidCustomers = accountCount(dayAccountRecords, "paidRows");
  const monthDueCustomers = accountCount(monthAccountRecords, "dueRows");
  const monthPaidCustomers = accountCount(monthAccountRecords, "paidRows");
  const collectionRate = dueCustomers ? paidCustomers / dueCustomers : 0;
  const monthCollectionRate = monthDueCustomers ? monthPaidCustomers / monthDueCustomers : 0;
  const collectedAmount = dayAccountRecords.reduce((sum, record) => sum + moneySum(record.data.paidRows, "amount"), 0);
  const monthCollectedAmount = monthAccountRecords.reduce((sum, record) => sum + moneySum(record.data.paidRows, "amount"), 0);

  const dashboard = workbook.addWorksheet("សង្ខេបប្រចាំសាខា (Dashboard)");
  configureSheet(dashboard, [7, 34, 16, 16, 22, 18, 30]);
  dashboard.views = [{ state: "frozen", ySplit: 5 }];

  let row = await addBranchManagerHeader(workbook, dashboard, data, 7);
  const kpiRows: Array<Array<string | number>> = [
    [1, "ចំនួនទម្លាក់ឥណទានថ្មី ($)", 150000, totalApproved, monthApproved, monthApproved / 150000, `សម្រេចបាន ${((monthApproved / 150000) * 100).toFixed(1)}% នៃគោលដៅខែ`],
    [2, "ចំនួនអតិថិជនថ្មី (នាក់)", 30, approvedCustomers, monthApprovedCustomers, monthApprovedCustomers / 30, "ជិតសម្រេចបានតាមផែនការ"],
    [3, "អត្រាប្រមូលប្រាក់ (%)", 0.95, collectionRate, monthCollectionRate, monthCollectionRate / 0.95, "ត្រូវរុញច្រានការប្រមូលប្រាក់បន្ថែម"],
    [4, "ចំនួនប្រាក់ប្រមូលបាន ($)", 10000, collectedAmount, monthCollectedAmount, monthCollectedAmount / 10000, `ប្រមូលបាន ${((monthCollectedAmount / 10000) * 100).toFixed(1)}% នៃផែនការខែ`],
    [5, "អត្រាឥណទានយឺតយ៉ាវ PAR > 1 day (%)", 0.025, par1, par1, par1 / 0.025, "លើសពីកម្រិតកំណត់ 1.2%"],
    [6, "អត្រាឥណទានយឺតយ៉ាវ PAR > 30 day (%)", 0.01, par30, par30, par30 / 0.01, "លើសពីកម្រិតកំណត់ 1.2%"],
    [7, "ជូនដំណឹងទៅអតិថិជនមុន ៣ថ្ងៃ ដល់ថ្ងៃកំណត់ត្រូវបង់ (នាក់)", 0, accountCount(dayAccountRecords, "dueNoticeRows"), accountCount(monthAccountRecords, "dueNoticeRows"), "", ""],
    [8, "ជូនដំណឹងទៅអតិថិជនមុន ១ថ្ងៃ ដល់ថ្ងៃកំណត់ត្រូវបង់ (នាក់)", 0, accountCount(dayAccountRecords, "promiseRows"), accountCount(monthAccountRecords, "promiseRows"), "", ""],
    [9, "ជូនដំណឹងទៅអតិថិជន ដល់ថ្ងៃកំណត់ត្រូវបង់ (នាក់)", 0, accountCount(dayAccountRecords, "closedRows"), accountCount(monthAccountRecords, "closedRows"), "", ""],
  ];
  const kpiStartRow = row;
  row = addBmTable(dashboard, row, "១. សង្ខេបសូចនាករផលសម្រេចគន្លឹះរបស់សាខា (Branch Key KPI Summary)", ["ល.រ", "សូចនាករគន្លឹះ (KPIs)", "គោលដៅប្រចាំខែ", "សម្រេចបានថ្ងៃនេះ", "សម្រេចបានសរុបប្រចាំខែ", "% សម្រេចធៀប KPI", "កំណត់សម្គាល់"], kpiRows);
  const kpiDataStart = kpiStartRow + 2;
  [kpiDataStart, kpiDataStart + 3].forEach((excelRow) => {
    dashboard.getCell(excelRow, 3).numFmt = "$#,##0.00;[Red]-$#,##0.00";
    dashboard.getCell(excelRow, 4).numFmt = "$#,##0.00;[Red]-$#,##0.00";
    dashboard.getCell(excelRow, 5).numFmt = "$#,##0.00;[Red]-$#,##0.00";
  });
  [kpiDataStart + 1, kpiDataStart + 6, kpiDataStart + 7, kpiDataStart + 8].forEach((excelRow) => {
    [3, 4, 5].forEach((column) => { dashboard.getCell(excelRow, column).numFmt = "#,##0"; });
  });
  [kpiDataStart + 2, kpiDataStart + 4, kpiDataStart + 5].forEach((excelRow) => {
    [3, 4, 5].forEach((column) => { dashboard.getCell(excelRow, column).numFmt = "0.00%"; });
  });
  for (let excelRow = kpiDataStart; excelRow < kpiDataStart + kpiRows.length; excelRow += 1) dashboard.getCell(excelRow, 6).numFmt = "0.00%";

  row = addBmTable(dashboard, row, "២. សង្ខេបលទ្ធផលតាមមន្ត្រីឥណទាន (Staff Performance Breakdown)", ["ល.រ", "ឈ្មោះមន្ត្រីឥណទាន", "ស្នើសុំ ($)", "អនុម័ត ($)", "បដិសេធ ($)", "ប្រមូលបាន ($)", "អតិថិជនដោះស្រាយ (នាក់)"], staffRows.map((item, index) => [index + 1, item.name, item.requested, item.approved, item.rejected, item.disbursed, item.contacts]), [3, 4, 5, 6], [3, 4, 5, 6], [7]);
  row = addBmTable(dashboard, row, "៣. បញ្ហាប្រឈមគន្លឹះ និង ផែនការសកម្មភាពដោះស្រាយរបស់ប្រធានសាខា (Key Issues & Action Plan)", ["ល.រ", "បញ្ហាប្រឈម / ករណីយឺតយ៉ាវ", "ឈ្មោះអតិថិជន/មន្ត្រី", "ប្រាក់ដើម ($)", "ដំណោះស្រាយ/សកម្មភាពឆ្លើយតប", "អ្នកទទួលខុសត្រូវ", "កាលបរិច្ឆេទបញ្ចប់"], loansDue.slice(0, 10).map((loan, index) => [index + 1, loan.nextPaymentDate && loan.nextPaymentDate.slice(0, 10) < data.reportDate ? "អតិថិជនយឺតយ៉ាវត្រូវតាមដាន" : "អតិថិជនដល់ថ្ងៃបង់ត្រូវជូនដំណឹង", loan.borrower.fullName, loan.outstandingBalance, loan.nextPaymentDate && loan.nextPaymentDate.slice(0, 10) < data.reportDate ? "ប្រធានសាខាចុះផ្ទាល់ជាមួយ LS ដើម្បីសម្រុះសម្រួល" : "ជូនដំណឹងអតិថិជនដល់ថ្ងៃបង់", `BM & ${loan.loanContacts.loanSpecialist || loan.loanOfficer || ""}`.trim(), loan.nextPaymentDate?.slice(0, 10) || data.reportDate]), [4]);

  const consolidated = workbook.addWorksheet("ទិន្នន័យបូកសរុប (consolidated)");
  configureSheet(consolidated, [7, 30, 24, 22, 16, 16, 24, 32]);
  consolidated.views = [{ state: "frozen", ySplit: 3 }];
  let consolidatedRow = await addBranchManagerHeader(workbook, consolidated, data, 8, true);
  consolidatedRow = addBmTable(consolidated, consolidatedRow, "1. សង្ខេបលទ្ធផលតាមមន្ត្រីឥណទាន (Staff Performance Breakdown)", ["ល.រ", "ឈ្មោះមន្ត្រីឥណទាន", "ស្នើសុំ ($)", "អនុម័ត ($)", "បដិសេធ ($)", "ប្រមូលបាន ($)", "អតិថិជនដោះស្រាយ (នាក់)"], staffRows.map((item, index) => [index + 1, item.name, item.requested, item.approved, item.rejected, item.disbursed, item.contacts]), [3, 4, 5, 6], [3, 4, 5, 6], [7]);
  const accountDueNoticeRows = dayAccountRecords.flatMap((record) => record.data.dueNoticeRows || []);
  const accountFollowUpRows = dayAccountRecords.flatMap((record) => record.data.promiseRows || []);
  const accountFormalRows = dayAccountRecords.flatMap((record) => record.data.closedRows || []);
  const accountSummaryStart = consolidatedRow;
  consolidatedRow = addBmTable(consolidated, consolidatedRow, "2. សង្ខេបលទ្ធផលរបស់គណនេយ្យ (Summary of account results)", ["ល.រ", "ប្រភេទសកម្មភាព", "អតិថិជនទាក់ទង/ដោះស្រាយ", "ការប្រាក់ ($)", "ពិន័យ ($)", "ប្រាក់ដើម ($)", "អតិថិជនសរុប/ដោះស្រាយ (នាក់)"], [
    [1, "សរុបបំណុលដែលមាននៅសល់ (Total outstanding debt)", "", "", "", outstanding, activeLoans.length],
    [2, "ជូនដំណឹងទៅអតិថិជន ដល់ថ្ងៃកំណត់ត្រូវបង់", nonEmpty(accountDueNoticeRows).length, "", "", "", nonEmpty(accountDueNoticeRows).length],
    [3, "អតិថិជនដែលយឺតចាប់ពី ១ថ្ងៃ ដល់ ៣ថ្ងៃ", "", moneySum(accountFollowUpRows, "interest"), moneySum(accountFollowUpRows, "penalty"), moneySum(accountFollowUpRows, "principal"), nonEmpty(accountFollowUpRows).length],
    [4, "អតិថិជនដែលយឺតចាប់ពី ៤ថ្ងៃឡើងទៅ", "", moneySum(accountFormalRows, "interest"), moneySum(accountFormalRows, "penalty"), moneySum(accountFormalRows, "principal"), nonEmpty(accountFormalRows).length],
  ], [4, 5, 6], [4, 5, 6], [3, 7]);
  const accountSummaryTotalRow = accountSummaryStart + 6;
  const accountSummaryActionStart = accountSummaryStart + 4;
  const accountSummaryActionEnd = accountSummaryStart + 5;
  [3, 7].forEach((column) => {
    const letter = consolidated.getColumn(column).letter;
    consolidated.getCell(accountSummaryTotalRow, column).value = { formula: `SUM(${letter}${accountSummaryActionStart}:${letter}${accountSummaryActionEnd})` };
    consolidated.getCell(accountSummaryTotalRow, column).numFmt = "#,##0";
  });
  [4, 5, 6].forEach((column) => {
    const letter = consolidated.getColumn(column).letter;
    consolidated.getCell(accountSummaryTotalRow, column).value = { formula: `SUM(${letter}${accountSummaryActionStart}:${letter}${accountSummaryActionEnd})` };
    consolidated.getCell(accountSummaryTotalRow, column).numFmt = "$#,##0.00;[Red]-$#,##0.00";
  });
  addBmTable(consolidated, consolidatedRow, "បញ្ជីលម្អិតប្រតិបត្តិការប្រចាំថ្ងៃ", ["ល.រ", "ឈ្មោះមន្ត្រីឥណទាន", "ឈ្មោះអតិថិជន", "ប្រភេទសកម្មភាព", "សាច់ប្រាក់ ($)", "ប្រាក់ដើម ($)", "ស្ថានភាព/ដំណោះស្រាយ", "មូលហេតុ/ចំណាត់ការ"], dayAccountRecords.flatMap((record) => [
    ...(record.data.paidRows || []).filter((item) => item.customer.trim()).map((item) => [record.reporterName, item.customer, "ប្រមូលប្រាក់", numberValue(item.amount), "", item.reason, item.reason]),
    ...(record.data.dueNoticeRows || []).filter((item) => item.customer.trim()).map((item) => [record.reporterName, item.customer, "ជូនដំណឹង", numberValue(item.interest), numberValue(item.principal), item.assetType, item.note]),
    ...(record.data.promiseRows || []).filter((item) => item.customer.trim()).map((item) => [record.reporterName, item.customer, "តាមដាន", numberValue(item.interest), numberValue(item.principal), item.assetType, item.note]),
    ...(record.data.closedRows || []).filter((item) => item.customer.trim()).map((item) => [record.reporterName, item.customer, "លិខិតជូនដំណឹង", numberValue(item.interest), numberValue(item.principal), item.assetType, item.note]),
  ]).map((item, index) => [index + 1, ...item]), [5, 6], [5, 6]);

  // The final BM form contains only the Dashboard worksheet. Account Report
  // data remains linked above and continues to feed its KPI values.
  workbook.removeWorksheet(consolidated.id);

  return workbook;
}

export async function exportBranchManagerOperationReportExcel(data: BranchManagerOperationReportExcelData) {
  const workbook = await buildBranchManagerOperationReportWorkbook(data);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `branch-manager-report-${data.reportDate || new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return buffer;
}

export async function exportOperationReportExcel(data: OperationReportExcelData) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Emerald Cash Operation Report";
  workbook.created = new Date();

  const summary = workbook.addWorksheet("របាយការណ៍សង្ខេប");
  configureSheet(summary, [7, 20, 20, 16, 16, 16, 16, 32]);
  await addBrandHeader(workbook, summary, data, 8);
  const dueCount = nonEmpty(data.collectionDueRows).length;
  const paidCount = nonEmpty(data.collectionPaidRows).length;
  const summaryRows: Array<Array<string | number>> = [
    ["អតិថិជនត្រូវបង់សរុប", dueCount, ""],
    ["អតិថិជនដែលបានបង់សរុប", paidCount, ""],
    ["អត្រាប្រមូលចូលគិតជាភាគរយ", dueCount ? paidCount / dueCount : 0, ""],
    ["ជូនដំណឹងទៅអតិថិជន ដល់ថ្ងៃកំណត់ត្រូវបង់", nonEmpty(data.dueNoticeRows).length, data.dueNoticeRows.reduce((sum, row) => sum + numberValue(row.interest), 0)],
    ["បានបន្តទាក់ទងអតិថិជនដែលយ៉ឺតចាប់ពី ១ថ្ងៃ ដល់ ៣ថ្ងៃ", nonEmpty(data.followUpRows).length, data.followUpRows.reduce((sum, row) => sum + numberValue(row.interest), 0)],
    ["ផ្ញើលិខិតជូនដំណឹងផ្លូវការសម្រាប់អតិថិជនយ៉ឺតចាប់ពី ៤ថ្ងៃ", nonEmpty(data.formalNoticeRows).length, data.formalNoticeRows.reduce((sum, row) => sum + numberValue(row.interest), 0)],
  ];
  const addSummaryBand = (headerRow: number, headers: string[], values: Array<Array<string | number>>) => {
    summary.mergeCells(headerRow, 1, headerRow, 2);
    summary.mergeCells(headerRow, 3, headerRow, 4);
    summary.mergeCells(headerRow, 5, headerRow, 8);
    [1, 3, 5].forEach((column, index) => {
      const cell = summary.getCell(headerRow, column);
      cell.value = headers[index];
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GREEN } };
      cell.font = { name: KHMER_FONT, bold: true, color: { argb: "FFFFFF" } };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    });
    values.forEach(([label, count, amount], index) => {
      const row = headerRow + index + 1;
      summary.mergeCells(row, 1, row, 2);
      summary.mergeCells(row, 3, row, 4);
      summary.mergeCells(row, 5, row, 8);
      summary.getCell(row, 1).value = label;
      summary.getCell(row, 3).value = count;
      summary.getCell(row, 3).alignment = { horizontal: "center", vertical: "middle" };
      summary.getCell(row, 5).value = amount;
    });
  };
  addSummaryBand(11, ["ការប្រមូល", "ចំនួនអតិថិជន (នាក់)", "ចំនួនទឹកប្រាក់"], summaryRows.slice(0, 3));
  addSummaryBand(15, ["ការដោះស្រាយ", "ចំនួន (នាក់)", "ជាសាច់ប្រាក់ (សរុបគិតជាដុល្លារ)"], summaryRows.slice(3));
  summary.getCell("C14").numFmt = "0%";
  [16, 17, 18].forEach((row) => { summary.getCell(row, 5).numFmt = "$#,##0.00"; });
  styleCells(summary, 11, 18, 1, 8);

  const collection = workbook.addWorksheet("អតិថិជនប្រមូល&ដោះស្រាយ");
  configureSheet(collection, [7, 26, 20, 16, 16, 18, 30, 18]);
  await addBrandHeader(workbook, collection, data, 8);
  let row = 11;
  row = addTable(collection, row, "អតិថិជនដែលត្រូវប្រមូលសរុប", ["ល.រ", "ឈ្មោះអតិថិជន", "ជាសាច់ប្រាក់ ($)", "មូលហេតុ", "រូបភាព"], nonEmpty(data.collectionDueRows).map((item, index) => [index + 1, item.customer, numberValue(item.amount), item.reason, photoLink(item)]), [3], [3]);
  row = addTable(collection, row, "អតិថិជនដែលប្រមូលបានសរុប", ["ល.រ", "ឈ្មោះអតិថិជន", "ជាសាច់ប្រាក់ ($)", "មូលហេតុ", "រូបភាព"], nonEmpty(data.collectionPaidRows).map((item, index) => [index + 1, item.customer, numberValue(item.amount), item.reason, photoLink(item)]), [3], [3], RED);
  const addResolution = (title: string, rows: ResolutionRow[]) => addTable(collection, row, title, ["ល.រ", "ឈ្មោះអតិថិជន", "ប្រភេទទ្រព្យ", "ការប្រាក់ ($)", "ពិន័យ ($)", "ប្រាក់ដើម ($)", "មូលហេតុ / ដំណោះស្រាយ", "រូបភាព"], nonEmpty(rows).map((item, index) => [index + 1, item.customer, item.assetType, numberValue(item.interest), numberValue(item.penalty), numberValue(item.principal), item.solution, photoLink(item)]), [4, 5, 6], [4, 5, 6]);
  row = addResolution("ជូនដំណឹងទៅអតិថិជន ដល់ថ្ងៃកំណត់ត្រូវបង់", data.dueNoticeRows);
  row = addResolution("បានបន្តទាក់ទងអតិថិជនដែលយ៉ឺតចាប់ពី ១ថ្ងៃ ដល់ ៣ថ្ងៃ", data.followUpRows);
  addResolution("ផ្ញើលិខិតជូនដំណឹងផ្លូវការសម្រាប់អតិថិជនយ៉ឺតចាប់ពី ៤ថ្ងៃ", data.formalNoticeRows);

  const decisions = workbook.addWorksheet("ឥណទានស្នើសុំ-អនុម័ត-បដិសេធ");
  configureSheet(decisions, [7, 30, 22, 18, 34, 18]);
  await addBrandHeader(workbook, decisions, data, 6);
  let decisionRow = 11;
  const addDecision = (title: string, rows: DecisionRow[], color = GREEN) => addTable(decisions, decisionRow, title, ["ល.រ", "ឈ្មោះអតិថិជន", "ប្រភេទឥណទាន", "សាច់ប្រាក់ ($)", "មូលហេតុ", "រូបភាព"], nonEmpty(rows).map((item, index) => [index + 1, item.customer, item.type, numberValue(item.amount), item.reason, photoLink(item)]), [4], [4], color);
  decisionRow = addDecision("អតិថិជនដែលស្នើឥណទាន", data.requestedRows);
  decisionRow = addDecision("អតិថិជនដែលបានអនុម័ត", data.approvedRows);
  addDecision("អតិថិជនដែលបានបដិសេធ", data.rejectedRows, RED);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `operation-report-${data.reportDate || new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return buffer;
}
