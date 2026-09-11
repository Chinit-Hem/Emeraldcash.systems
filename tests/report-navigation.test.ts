import assert from "node:assert/strict";
import test from "node:test";
import { getReportNavigation } from "../src/systems/loan/utils/reportNavigation.ts";

const params = (href: string) => new URL(href, "https://example.test").searchParams;

test("BM opens a dashboard with LS, own form, and own history shortcuts", () => {
  const nav = getReportNavigation({ role: "Branch Manager" }, "en");
  assert.equal(params(nav.href).get("reportLanding"), "dashboard");
  assert.equal(params(nav.href).get("operationMode"), "branchManager");
  assert.deepEqual(nav.links.map((link) => link.label), ["LS Report", "My Report", "My History"]);
  assert.equal(params(nav.links[0].href).get("operationMode"), "operation");
  assert.equal(params(nav.links[1].href).get("reportPanel"), "form");
  assert.equal(params(nav.links[1].href).get("reportEntry"), "manual");
  assert.equal(params(nav.links[2].href).get("reportScope"), "mine");
});

test("LS opens LS records and cannot navigate to BM or Account through shortcuts", () => {
  const nav = getReportNavigation({ role: "Loan Specialist" }, "en");
  assert.equal(params(nav.href).get("operationMode"), "operation");
  assert.equal(params(nav.href).get("reportPanel"), "records");
  assert.deepEqual(nav.links.map((link) => link.label), ["My Report", "My History"]);
  for (const link of nav.links) {
    assert.equal(params(link.href).get("operationMode"), "operation");
    assert.equal(params(link.href).get("reportScope"), "mine");
  }
});

test("HR position receives all three review categories", () => {
  const nav = getReportNavigation({ role: "Staff", position: "HR Manager" }, "en");
  assert.deepEqual(nav.links.map((link) => link.label), ["BM Report", "LS Report", "Account Report"]);
  assert.equal(params(nav.links[2].href).get("reportCategory"), "account");
});

test("Accounting keeps its Account Report destination", () => {
  const nav = getReportNavigation({ role: "Accountant" }, "en");
  assert.equal(params(nav.href).get("accountMode"), "accountReport");
  assert.equal(nav.links.length, 0);
});

test("role recognition and Khmer labels follow existing workflow identities", () => {
  const nav = getReportNavigation({ role: "Staff", position: "Branch Manager" }, "km");
  assert.equal(params(nav.href).get("operationMode"), "branchManager");
  assert.equal(nav.links[2].label, "ប្រវត្តិរបស់ខ្ញុំ");
});
