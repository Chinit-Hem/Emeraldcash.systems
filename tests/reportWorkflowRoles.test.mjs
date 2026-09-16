import assert from "node:assert/strict";
import test from "node:test";
import { isReportWorkflowTransitionAllowed } from "../src/systems/loan/utils/reportWorkflowRoles.ts";

test("HR may return an approved BM report for correction", () => {
  assert.equal(isReportWorkflowTransitionAllowed("branchManager", "humanResources", "approved", "returned"), true);
  assert.equal(isReportWorkflowTransitionAllowed("branchManager", "humanResources", "approved", "approved"), false);
});

test("approved source reports and Director-approved BM reports remain final", () => {
  assert.equal(isReportWorkflowTransitionAllowed("source", "humanResources", "approved", "returned"), false);
  assert.equal(isReportWorkflowTransitionAllowed("branchManager", "director", "approved", "returned"), false);
});
