import assert from "node:assert/strict";
import test from "node:test";
import { collectionMetrics, duplicateCustomerNamesBySection, reportNumber } from "../src/systems/loan/utils/reportCalculations.ts";

test("report numbers reject non-finite values and preserve valid currency input", () => {
  assert.equal(reportNumber("$1,250.50"), 1250.5);
  assert.equal(reportNumber("Infinity"), 0);
  assert.equal(reportNumber("not a number"), 0);
  assert.equal(reportNumber("-25"), -25);
});

test("duplicate customers are detected only within their own report section", () => {
  const duplicates = duplicateCustomerNamesBySection({
    due: [{ customer: "Sok Dara" }, { customer: " sok dara " }, { customer: "Vannak" }],
    paid: [{ customer: "Sok Dara" }],
    promises: [{ customer: "Vannak" }],
  });
  assert.deepEqual(duplicates.due, ["sok dara"]);
  assert.deepEqual(duplicates.paid, []);
  assert.deepEqual(duplicates.promises, []);
});

test("collection metrics count populated rows and calculate count and amount rates separately", () => {
  const result = collectionMetrics(
    [{ customer: "A", amount: "100" }, { customer: "B", amount: "$200" }, { customer: "", amount: "999" }],
    [{ customer: "A", amount: "100" }, { customer: "C", amount: "50" }],
  );
  assert.deepEqual(result, { dueCount: 2, paidCount: 2, dueAmount: 300, paidAmount: 150, customerRate: 100, amountRate: 50 });
});
