import assert from "node:assert/strict";
import test from "node:test";
import { emptyBmWorksheet, validBmWorksheet, hasBmWorksheetContent } from "../src/systems/loan/utils/bmWorksheet.ts";

test("manual BM drafts need no LS or Account source reports", () => {
  const draft = emptyBmWorksheet();
  assert.equal(validBmWorksheet(draft), true);
  assert.equal(hasBmWorksheetContent(draft), false);
  draft.staff[0].name = "Loan Specialist";
  draft.staff[0].approved = "1250.50";
  assert.equal(hasBmWorksheetContent(draft), true);
  assert.deepEqual(draft.sourceReportIds, []);
  assert.deepEqual(draft.sourceAccountReportIds, []);
  assert.deepEqual(JSON.parse(JSON.stringify(draft)), draft);
});

test("BM validation rejects malformed data and negative or non-finite figures", () => {
  assert.equal(validBmWorksheet(null), false);
  const draft = emptyBmWorksheet();
  for (const invalid of ["-10", "Infinity", "not a number"]) {
    draft.accounts[0].paidAmount = invalid;
    assert.equal(validBmWorksheet(draft), false);
  }
  assert.equal(validBmWorksheet({ ...emptyBmWorksheet(), staff: [{}] }), false);
  assert.equal(validBmWorksheet({ ...emptyBmWorksheet(), mode: "unknown" }), false);
});

test("generated snapshots retain source links and can be edited without mutating their source", () => {
  const snapshot = { ...emptyBmWorksheet(), mode: "generated" as const, sourceReportIds: ["ls-id"], sourceAccountReportIds: ["account-id"] };
  const stored = JSON.parse(JSON.stringify(snapshot));
  snapshot.staff[0].name = "Updated manually";
  snapshot.staff[0].collected = "250";
  assert.equal(validBmWorksheet(snapshot), true);
  assert.equal(stored.staff[0].name, "");
  assert.deepEqual(snapshot.sourceReportIds, ["ls-id"]);
});

test("reference KPIs calculate achievement and collection rates with safe empty targets", async () => {
  const { emptyBmKpis, bmKpiValues } = await import("../src/systems/loan/utils/bmWorksheet.ts");
  const rows = emptyBmKpis();
  const disbursed = rows.find((row) => row.id === "disbursed")!;
  disbursed.target = "140000";
  disbursed.monthly = "10900";
  assert.equal(bmKpiValues(rows, disbursed).achievement, 10900 / 140000);
  const collected = rows.find((row) => row.id === "collected")!;
  collected.target = "21297";
  collected.daily = "1087.75";
  collected.monthly = "3032.25";
  const rate = rows.find((row) => row.id === "collectionRate")!;
  rate.target = "97";
  assert.equal(Number(bmKpiValues(rows, rate).daily), 1087.75 / 21297 * 100);
  assert.equal(bmKpiValues(rows, rate).achievement, (3032.25 / 21297 * 100) / 97);
  collected.target = "0";
  assert.equal(bmKpiValues(rows, rate).achievement, null);
  assert.equal(bmKpiValues(rows, rate).daily, "");
});

test("reference sections survive save/reopen and reject malformed nested data", () => {
  const data = emptyBmWorksheet();
  data.issues![0] = { issue: "Late payment", name: "Customer", principal: "1200", action: "Call", owner: "BM", deadline: "2026-09-10" };
  data.periods![0].collected = "120";
  assert.equal(validBmWorksheet(JSON.parse(JSON.stringify(data))), true);
  assert.equal(hasBmWorksheetContent(data), true);
  assert.equal(validBmWorksheet({ ...data, kpis: [] }), false);
  assert.equal(validBmWorksheet({ ...data, issues: [{ ...data.issues![0], principal: "-1" }] }), false);
  assert.equal(validBmWorksheet({ ...data, periods: [data.periods![0], data.periods![0], data.periods![0]] }), false);
});
