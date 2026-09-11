import assert from "node:assert/strict";
import test from "node:test";

import {
  canPrepareAccountReport,
  canPrepareLoanSpecialistReport,
  isBranchManagerReportActor,
  isDirectorReportActor,
  isHumanResourcesReportActor,
  isReportWorkflowTransitionAllowed,
} from "../src/systems/loan/utils/reportWorkflowRoles.ts";

test("report preparers are limited to LS and Accounting identities", () => {
  assert.equal(canPrepareLoanSpecialistReport("Loan Specialist"), true);
  assert.equal(canPrepareLoanSpecialistReport("Staff", "Collection Officer"), true);
  assert.equal(canPrepareLoanSpecialistReport("Accountant"), false);
  assert.equal(canPrepareAccountReport("Assistant Accountant"), true);
  assert.equal(canPrepareAccountReport("Staff", "Finance Manager"), true);
  assert.equal(canPrepareAccountReport("Loan Specialist"), false);
});

test("workflow transitions enforce BM review and Director approval with HR view-only", () => {
  assert.equal(isReportWorkflowTransitionAllowed("source", "branchManager", "submitted", "approved"), true);
  assert.equal(isReportWorkflowTransitionAllowed("source", "branchManager", "submitted", "returned"), true);
  assert.equal(isReportWorkflowTransitionAllowed("source", "branchManager", "submitted", "reviewed"), false);
  assert.equal(isReportWorkflowTransitionAllowed("source", "branchManager", "reviewed", "approved"), false);
  assert.equal(isReportWorkflowTransitionAllowed("source", "branchManager", "reviewed", "returned"), false);
  assert.equal(isReportWorkflowTransitionAllowed("source", "branchManager", "draft", "reviewed"), false);
  assert.equal(isReportWorkflowTransitionAllowed("branchManager", "humanResources", "submitted", "reviewed"), false);
  assert.equal(isReportWorkflowTransitionAllowed("branchManager", "director", "submitted", "approved"), true);
  assert.equal(isReportWorkflowTransitionAllowed("branchManager", "director", "reviewed", "approved"), true);
});

test("BM, HR, and Director identities are recognized from current role or position", () => {
  assert.equal(isBranchManagerReportActor("Staff", "Branch Manager"), true);
  assert.equal(isHumanResourcesReportActor("Human Resources", "Human Resources Officer"), true);
  assert.equal(isHumanResourcesReportActor("Staff", "Human Resources Supervisor"), true);
  assert.equal(isHumanResourcesReportActor("Staff", "Human Resources Intern"), false);
  assert.equal(isDirectorReportActor("Executive Viewer"), true);
  assert.equal(isDirectorReportActor("Staff", "Chief Executive Officer"), true);
});

test("ordinary operational roles cannot act as BM, HR, or Director", () => {
  assert.equal(isBranchManagerReportActor("Loan Operations", "Loan Specialist"), false);
  assert.equal(isHumanResourcesReportActor("Accountant", "Accountant"), false);
  assert.equal(isDirectorReportActor("Credit / Approver", "Credit Manager"), false);
});

test("short HR role and position labels receive HR report access", () => {
  assert.equal(isHumanResourcesReportActor("HR"), true);
  assert.equal(isHumanResourcesReportActor(" hr "), true);
  assert.equal(isHumanResourcesReportActor("Staff", "HR"), true);
  assert.equal(isHumanResourcesReportActor("Human Resources"), true);
  assert.equal(isHumanResourcesReportActor("Staff", "Human Resources"), true);
  assert.equal(isHumanResourcesReportActor("Staff", "Assistant"), false);
});

test("HR cannot change any report status", () => {
  for (const report of ["source", "branchManager"] as const) {
    for (const status of ["draft", "submitted", "reviewed", "approved", "returned"] as const) {
      for (const action of ["reviewed", "approved", "returned"] as const) assert.equal(isReportWorkflowTransitionAllowed(report, "humanResources", status, action), false);
    }
  }
});
