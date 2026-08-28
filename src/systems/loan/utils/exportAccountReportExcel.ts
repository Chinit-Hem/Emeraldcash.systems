import ExcelJS from "exceljs";

export type AccountReportCollectionRow = { id: number; customer: string; amount: string; reason: string };
export type AccountReportResolutionRow = { id: number; customer: string; assetType: string; interest: string; penalty: string; principal: string; note: string };

export type AccountReportExcelData = {
  reportDate: string;
  reportDateDisplay: string;
  reporterName: string;
  reporterRole: string;
  department: string;
  dueRows: AccountReportCollectionRow[];
  paidRows: AccountReportCollectionRow[];
  dueNoticeRows: AccountReportResolutionRow[];
  promiseRows: AccountReportResolutionRow[];
  closedRows: AccountReportResolutionRow[];
};

const GREEN = "007025";
const RED = "C00000";
const LIGHT = "E9EEF0";
const BORDER = "D6D9DD";
const TITLE_FONT = "Khmer OS Muol Light";
const BODY_FONT = "Khmer OS Battambang";

function numberValue(value: string) {
  return Number(value.replace(/[^\d.-]/g, "")) || 0;
}

function excelReportDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  return Number.isNaN(date.getTime()) ? null : date;
}

function filledCollectionRows(rows: AccountReportCollectionRow[]) {
  return rows.filter((row) => row.customer.trim() || row.amount.trim() || row.reason.trim());
}

function filledResolutionRows(rows: AccountReportResolutionRow[]) {
  return rows.filter((row) => row.customer.trim() || row.assetType.trim() || row.interest.trim() || row.penalty.trim() || row.principal.trim() || row.note.trim());
}

function currencyCell(cell: ExcelJS.Cell) {
  cell.numFmt = "$#,##0.00;[Red]-$#,##0.00";
  cell.alignment = { horizontal: "right", vertical: "middle" };
}

function styleRange(sheet: ExcelJS.Worksheet, fromRow: number, toRow: number, fromColumn: number, toColumn: number) {
  for (let row = fromRow; row <= toRow; row += 1) {
    for (let column = fromColumn; column <= toColumn; column += 1) {
      const cell = sheet.getCell(row, column);
      cell.font = { name: BODY_FONT, size: 11, ...cell.font };
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

async function addLogo(workbook: ExcelJS.Workbook, sheet: ExcelJS.Worksheet) {
  try {
    const response = await fetch("/logo-horizontal.png");
    if (!response.ok) return;
    const bytes = new Uint8Array(await response.arrayBuffer());
    let binary = "";
    bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
    const imageId = workbook.addImage({ base64: `data:image/png;base64,${btoa(binary)}`, extension: "png" });
    sheet.addImage(imageId, { tl: { col: 0.2, row: 0.55 }, ext: { width: 160, height: 67 } });
  } catch {
    sheet.getCell("A1").value = "Emerald Cash";
    sheet.getCell("A1").font = { name: BODY_FONT, bold: true, color: { argb: GREEN } };
  }
}

function setHeaderCell(cell: ExcelJS.Cell, value: string, color = GREEN) {
  cell.value = value;
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
  cell.font = { name: BODY_FONT, bold: true, color: { argb: "FFFFFF" } };
  cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
}

function addCollectionTable(
  sheet: ExcelJS.Worksheet,
  startRow: number,
  startColumn: number,
  title: string,
  rows: AccountReportCollectionRow[],
  color = GREEN
) {
  const endColumn = startColumn + 3;
  sheet.mergeCells(startRow, startColumn, startRow, endColumn);
  const titleCell = sheet.getCell(startRow, startColumn);
  titleCell.value = title;
  titleCell.font = { name: BODY_FONT, size: 13, bold: true, color: { argb: color } };
  titleCell.alignment = { vertical: "middle" };

  ["ល.រ", "ឈ្មោះអតិថិជន", "ជាសាច់ប្រាក់ ($)", "មូលហេតុ"].forEach((header, index) => {
    setHeaderCell(sheet.getCell(startRow + 1, startColumn + index), header, color);
  });

  rows.forEach((row, index) => {
    const excelRow = startRow + 2 + index;
    sheet.getCell(excelRow, startColumn).value = index + 1;
    sheet.getCell(excelRow, startColumn).alignment = { horizontal: "center", vertical: "middle" };
    sheet.getCell(excelRow, startColumn + 1).value = row.customer;
    sheet.getCell(excelRow, startColumn + 2).value = row.amount.trim() ? numberValue(row.amount) : null;
    currencyCell(sheet.getCell(excelRow, startColumn + 2));
    sheet.getCell(excelRow, startColumn + 3).value = row.reason;
    sheet.getRow(excelRow).height = 24;
  });

  const totalRow = startRow + 12;
  sheet.mergeCells(totalRow, startColumn, totalRow, startColumn + 1);
  sheet.getCell(totalRow, startColumn).value = "សរុប";
  sheet.getCell(totalRow, startColumn).alignment = { horizontal: "center", vertical: "middle" };
  sheet.getCell(totalRow, startColumn + 2).value = { formula: `SUM(${sheet.getColumn(startColumn + 2).letter}${startRow + 2}:${sheet.getColumn(startColumn + 2).letter}${totalRow - 1})` };
  currencyCell(sheet.getCell(totalRow, startColumn + 2));
  for (let column = startColumn; column <= endColumn; column += 1) {
    const cell = sheet.getCell(totalRow, column);
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: LIGHT } };
    cell.font = { name: BODY_FONT, bold: true, color: { argb: RED } };
  }
  styleRange(sheet, startRow, totalRow, startColumn, endColumn);
  return totalRow;
}

function addResolutionTable(sheet: ExcelJS.Worksheet, startRow: number, title: string, rows: AccountReportResolutionRow[]) {
  sheet.mergeCells(startRow, 1, startRow, 8);
  const titleCell = sheet.getCell(startRow, 1);
  titleCell.value = title;
  titleCell.font = { name: BODY_FONT, size: 13, bold: true, color: { argb: RED } };
  titleCell.alignment = { vertical: "middle" };

  ["ល.រ", "ឈ្មោះអតិថិជន", "ប្រភេទទ្រព្យ", "ការប្រាក់ ($)", "ពិន័យ ($)", "ប្រាក់ដើម ($)", "មូលហេតុ", ""].forEach((header, index) => {
    setHeaderCell(sheet.getCell(startRow + 1, index + 1), header);
  });

  rows.forEach((row, index) => {
    const excelRow = startRow + 2 + index;
    sheet.getCell(excelRow, 1).value = index + 1;
    sheet.getCell(excelRow, 1).alignment = { horizontal: "center", vertical: "middle" };
    sheet.getCell(excelRow, 2).value = row.customer;
    sheet.getCell(excelRow, 3).value = row.assetType;
    sheet.getCell(excelRow, 4).value = row.interest.trim() ? numberValue(row.interest) : null;
    sheet.getCell(excelRow, 5).value = row.penalty.trim() ? numberValue(row.penalty) : null;
    sheet.getCell(excelRow, 6).value = row.principal.trim() ? numberValue(row.principal) : null;
    sheet.getCell(excelRow, 7).value = row.note;
    [4, 5, 6].forEach((column) => currencyCell(sheet.getCell(excelRow, column)));
    sheet.getRow(excelRow).height = 24;
  });

  const totalRow = startRow + 12;
  sheet.mergeCells(totalRow, 1, totalRow, 3);
  sheet.getCell(totalRow, 1).value = "សរុប";
  sheet.getCell(totalRow, 1).alignment = { horizontal: "center", vertical: "middle" };
  [4, 5, 6].forEach((column) => {
    sheet.getCell(totalRow, column).value = { formula: `SUM(${sheet.getColumn(column).letter}${startRow + 2}:${sheet.getColumn(column).letter}${totalRow - 1})` };
    currencyCell(sheet.getCell(totalRow, column));
  });
  for (let column = 1; column <= 8; column += 1) {
    const cell = sheet.getCell(totalRow, column);
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: LIGHT } };
    cell.font = { name: BODY_FONT, bold: true, color: { argb: RED } };
  }
  styleRange(sheet, startRow, totalRow, 1, 8);
  return totalRow + 3;
}

function addResolutionGroupTitle(sheet: ExcelJS.Worksheet, row: number, title: string) {
  sheet.mergeCells(row, 1, row, 8);
  const cell = sheet.getCell(row, 1);
  cell.value = title;
  cell.font = { name: BODY_FONT, size: 13, bold: true, color: { argb: GREEN } };
  cell.alignment = { vertical: "middle" };
  styleRange(sheet, row, row, 1, 8);
  return row + 1;
}

function configureSheet(sheet: ExcelJS.Worksheet) {
  [7, 20, 20, 16, 16, 16, 16, 32].forEach((width, index) => { sheet.getColumn(index + 1).width = width; });
  sheet.views = [{ state: "frozen", ySplit: 10 }];
  sheet.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9, margins: { left: 0.2, right: 0.2, top: 0.25, bottom: 0.25, header: 0.15, footer: 0.15 } };
  sheet.headerFooter.oddFooter = "Page &P of &N";
}

async function addReportHeader(workbook: ExcelJS.Workbook, sheet: ExcelJS.Worksheet, data: AccountReportExcelData) {
  sheet.mergeCells("A1:B3");
  sheet.mergeCells("C1:H2");
  sheet.mergeCells("C3:H3");
  sheet.getCell("C1").value = "ក្រុមហ៊ុន អេមើរ៉ល ឃែស ឯ.ក";
  sheet.getCell("C1").font = { name: TITLE_FONT, size: 20, color: { argb: RED } };
  sheet.getCell("C1").alignment = { horizontal: "center", vertical: "middle" };
  sheet.getCell("C3").value = "របាយការណ៍គណនេយ្យប្រចាំថ្ងៃ សាខា បឹងកេងកង";
  sheet.getCell("C3").font = { name: TITLE_FONT, size: 14, color: { argb: GREEN } };
  sheet.getCell("C3").alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(1).height = 36;
  sheet.getRow(2).height = 32;
  sheet.getRow(3).height = 30;
  await addLogo(workbook, sheet);

  const identityRows: Array<[string, string | Date | null]> = [
    ["កាលបរិច្ឆេទ៖", excelReportDate(data.reportDate)],
    ["ឈ្មោះ៖", data.reporterName],
    ["តួនាទី៖", data.reporterRole],
    ["នាយកដ្ឋាន៖", data.department],
  ];
  identityRows.forEach(([label, value], index) => {
    const row = 5 + index;
    sheet.mergeCells(row, 1, row, 3);
    sheet.getCell(row, 3).value = label;
    sheet.getCell(row, 3).alignment = { horizontal: "right", vertical: "middle" };
    sheet.mergeCells(row, 4, row, 6);
    const valueCell = sheet.getCell(row, 4);
    valueCell.value = value || "";
    if (value instanceof Date) valueCell.numFmt = "[$-en-US]dddd, dd mmmm yyyy";
    valueCell.alignment = { horizontal: "left", vertical: "middle" };
    sheet.getRow(row).height = 24;
  });
  styleRange(sheet, 1, 9, 1, 8);
}

function addSummaryTable(sheet: ExcelJS.Worksheet, data: AccountReportExcelData) {
  const dueCount = filledCollectionRows(data.dueRows).length;
  const paidCount = filledCollectionRows(data.paidRows).length;
  const collectionRate = dueCount ? paidCount / dueCount : 0;
  const dueNoticeCount = filledResolutionRows(data.dueNoticeRows).length;
  const promiseCount = filledResolutionRows(data.promiseRows).length;
  const closedCount = filledResolutionRows(data.closedRows).length;
  const promiseAmount = data.promiseRows.reduce((sum, row) => sum + numberValue(row.interest), 0);
  const closedAmount = data.closedRows.reduce((sum, row) => sum + numberValue(row.interest), 0);

  ["ការប្រមូល", "ចំនួនអតិថិជន (នាក់)", "ចំនួនទឹកប្រាក់"].forEach((header, index) => setHeaderCell(sheet.getCell(11, index * 2 + 1), header));
  sheet.mergeCells("A11:B11");
  sheet.mergeCells("C11:D11");
  sheet.mergeCells("E11:H11");
  const collectionRows: Array<[string, number, number | string]> = [
    ["អតិថិជនដែលប្រមូលសរុប", dueCount, ""],
    ["អតិថិជនដែលប្រមូលបានសរុប", paidCount, ""],
    ["អត្រាប្រមូលប្រាក់គិតជាភាគរយ", collectionRate, ""],
  ];
  collectionRows.forEach(([label, count, amount], index) => {
    const row = 12 + index;
    sheet.mergeCells(row, 1, row, 2);
    sheet.mergeCells(row, 3, row, 4);
    sheet.mergeCells(row, 5, row, 8);
    sheet.getCell(row, 1).value = label;
    sheet.getCell(row, 3).value = count;
    sheet.getCell(row, 3).alignment = { horizontal: "center", vertical: "middle" };
    sheet.getCell(row, 5).value = amount;
  });
  sheet.getCell("C14").numFmt = "0%";

  ["ការដោះស្រាយ", "ចំនួន (នាក់)", "ជាសាច់ប្រាក់ (សរុបគិតជាដុល្លារ)"].forEach((header, index) => setHeaderCell(sheet.getCell(15, index * 2 + 1), header));
  sheet.mergeCells("A15:B15");
  sheet.mergeCells("C15:D15");
  sheet.mergeCells("E15:H15");
  const resolutionRows: Array<[string, number, number | string]> = [
    ["អ្នកជំពាក់អតិថិជន ដល់ថ្ងៃកំណត់ត្រូវបង់", dueNoticeCount, ""],
    ["បានបន្តទាក់ទងអតិថិជនដែលយឺតចាប់ពី ១ថ្ងៃ ដល់ ៣ថ្ងៃ", promiseCount, promiseAmount],
    ["ផ្ញើលិខិតជូនដំណឹងផ្លូវការសម្រាប់អតិថិជនយឺតចាប់ពី ៤ថ្ងៃ", closedCount, closedAmount],
  ];
  resolutionRows.forEach(([label, count, amount], index) => {
    const row = 16 + index;
    sheet.mergeCells(row, 1, row, 2);
    sheet.mergeCells(row, 3, row, 4);
    sheet.mergeCells(row, 5, row, 8);
    sheet.getCell(row, 1).value = label;
    sheet.getCell(row, 3).value = count;
    sheet.getCell(row, 3).alignment = { horizontal: "center", vertical: "middle" };
    sheet.getCell(row, 5).value = amount;
    if (typeof amount === "number") currencyCell(sheet.getCell(row, 5));
  });
  sheet.mergeCells("A19:D19");
  sheet.mergeCells("E19:H19");
  sheet.getCell("A19").value = "សរុប";
  sheet.getCell("A19").alignment = { horizontal: "center", vertical: "middle" };
  sheet.getCell("E19").value = promiseAmount + closedAmount;
  currencyCell(sheet.getCell("E19"));
  for (let column = 1; column <= 8; column += 1) {
    sheet.getCell(19, column).fill = { type: "pattern", pattern: "solid", fgColor: { argb: LIGHT } };
    sheet.getCell(19, column).font = { name: BODY_FONT, bold: true, color: { argb: RED } };
  }
  styleRange(sheet, 11, 19, 1, 8);
}

export async function exportAccountReportExcel(data: AccountReportExcelData) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Emerald Cash Account Report";
  workbook.created = new Date();

  const summarySheet = workbook.addWorksheet("របាយការណ៍សង្ខេប");
  const detailSheet = workbook.addWorksheet("អតិថិជនប្រមូល&ដោះស្រាយ");
  configureSheet(summarySheet);
  configureSheet(detailSheet);
  await addReportHeader(workbook, summarySheet, data);
  await addReportHeader(workbook, detailSheet, data);
  addSummaryTable(summarySheet, data);

  addCollectionTable(detailSheet, 11, 1, "អតិថិជនដែលប្រមូលសរុប", data.dueRows);
  addCollectionTable(detailSheet, 11, 5, "អតិថិជនដែលប្រមូលបានសរុប", data.paidRows, RED);
  let row = 26;
  row = addResolutionGroupTitle(detailSheet, row, "អតិថិជនដែលដោះស្រាយសរុប");
  row = addResolutionTable(detailSheet, row, "ជូនដំណឹងទៅអតិថិជន ដល់ថ្ងៃកំណត់ត្រូវបង់", data.dueNoticeRows);
  row = addResolutionTable(detailSheet, row, "បានបន្តទាក់ទងអតិថិជនដែលយឺតចាប់ពី ១ថ្ងៃ ដល់ ៣ថ្ងៃ", data.promiseRows);
  addResolutionTable(detailSheet, row, "ផ្ញើលិខិតជូនដំណឹងផ្លូវការសម្រាប់អតិថិជនយឺតចាប់ពី ៤ថ្ងៃ", data.closedRows);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `account-report-${data.reportDate || new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return buffer;
}
