import assert from "node:assert/strict";
import test from "node:test";
import { getReportRecordScopes } from "../src/systems/loan/utils/reportRecordScopes.ts";

const reports = [{ id: "ls-one", reporterUsername: "specialist" }, { id: "ls-two", reporterUsername: "another-specialist" }];

test("BM personal history does not remove LS generation sources", () => {
  const scope = getReportRecordScopes(reports, "manager", true);
  assert.deepEqual(scope.ownRecords, []);
  assert.deepEqual(scope.sourceRecords, reports);
});

test("LS cannot expand source visibility beyond their own reports", () => {
  const scope = getReportRecordScopes(reports, " SPECIALIST ", false);
  assert.deepEqual(scope.sourceRecords.map((record) => record.id), ["ls-one"]);
  assert.deepEqual(scope.ownRecords, scope.sourceRecords);
});

test("reviewer history stays personal even when branch source access is allowed", () => {
  const scope = getReportRecordScopes(reports, "specialist", true);
  assert.equal(scope.sourceRecords.length, 2);
  assert.equal(scope.ownRecords.length, 1);
});
