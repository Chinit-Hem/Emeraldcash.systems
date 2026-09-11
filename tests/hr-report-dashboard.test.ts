import assert from "node:assert/strict";
import test from "node:test";
import { filterHrReports, getHrDatePresetRange } from "../src/systems/loan/utils/hrReportDashboard.ts";
const records = [
  { id: "one", reportDate: "2026-09-01", status: "submitted" },
  { id: "two", reportDate: "2026-09-09", status: "reviewed" },
  { id: "three", reportDate: "2026-09-10", status: "submitted" },
];
test("default HR filter shows only reports awaiting review", () => {
  assert.deepEqual(filterHrReports(records, { from: "", to: "", status: "submitted" }).map((r) => r.id), ["one", "three"]);
});
test("date boundaries are inclusive and compose with status", () => {
  assert.deepEqual(filterHrReports(records, { from: "2026-09-01", to: "2026-09-09", status: "" }).map((r) => r.id), ["one", "two"]);
  assert.deepEqual(filterHrReports(records, { from: "2026-09-01", to: "2026-09-09", status: "reviewed" }).map((r) => r.id), ["two"]);
});
test("clearing filters restores records without modifying source data", () => {
  assert.deepEqual(filterHrReports(records, { from: "", to: "", status: "" }), records);
  assert.equal(records.length, 3);
});

test("quick date presets use Monday weeks and calendar months", () => {
  const reference = new Date(2026, 8, 10, 15, 30);
  assert.deepEqual(getHrDatePresetRange("today", reference), { from: "2026-09-10", to: "2026-09-10" });
  assert.deepEqual(getHrDatePresetRange("yesterday", reference), { from: "2026-09-09", to: "2026-09-09" });
  assert.deepEqual(getHrDatePresetRange("thisWeek", reference), { from: "2026-09-07", to: "2026-09-10" });
  assert.deepEqual(getHrDatePresetRange("lastWeek", reference), { from: "2026-08-31", to: "2026-09-06" });
  assert.deepEqual(getHrDatePresetRange("thisMonth", reference), { from: "2026-09-01", to: "2026-09-10" });
  assert.deepEqual(getHrDatePresetRange("lastMonth", reference), { from: "2026-08-01", to: "2026-08-31" });
  assert.deepEqual(getHrDatePresetRange("all", reference), { from: "", to: "" });
});
