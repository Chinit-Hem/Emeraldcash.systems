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

test("workflow transitions enforce BM review, HR review, then Director approval", () => {
  assert.equal(isReportWorkflowTransitionAllowed("source", "branchManager", "submitted", "reviewed"), true);
  assert.equal(isReportWorkflowTransitionAllowed("source", "branchManager", "reviewed", "approved"), false);
  assert.equal(isReportWorkflowTransitionAllowed("branchManager", "humanResources", "submitted", "reviewed"), true);
  assert.equal(isReportWorkflowTransitionAllowed("branchManager", "director", "submitted", "approved"), false);
  assert.equal(isReportWorkflowTransitionAllowed("branchManager", "director", "reviewed", "approved"), true);
});

test("BM, HR, and Director identities are recognized from current role or position", () => {
  assert.equal(isBranchManagerReportActor("Staff", "Branch Manager"), true);
  assert.equal(isHumanResourcesReportActor("Human Resources", "Human Resources Officer"), true);
  assert.equal(isHumanResourcesReportActor("Staff", "Human Resources Supervisor"), true);
  assert.equal(isHumanResourcesReportActor("Staff", "HR Director"), true);
  assert.equal(isHumanResourcesReportActor("Staff", "Human Resources Intern"), false);
  assert.equal(isDirectorReportActor("Director"), true);
  assert.equal(isDirectorReportActor("Executive Viewer"), true);
  assert.equal(isDirectorReportActor("Staff", "Chief Executive Officer"), true);
});

test("ordinary operational roles cannot act as BM, HR, or Director", () => {
  assert.equal(isBranchManagerReportActor("Loan Operations", "Loan Specialist"), false);
  assert.equal(isHumanResourcesReportActor("Accountant", "Accountant"), false);
  assert.equal(isDirectorReportActor("Credit / Approver", "Credit Manager"), false);
});
