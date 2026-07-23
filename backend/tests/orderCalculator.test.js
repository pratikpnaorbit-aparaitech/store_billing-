const assert = require("node:assert/strict");
const test = require("node:test");
const { calculateOrderTotals, money } = require("../src/services/orderCalculator");

test("calculates authoritative order totals with currency rounding", () => {
  assert.deepEqual(calculateOrderTotals([{ total: 99.99 }, { total: 50 }], 18, 10), {
    subtotal: 149.99,
    gstRate: 18,
    gst: 27,
    discount: 10,
    total: 166.99,
  });
  assert.equal(money(0.1 + 0.2), 0.3);
});

test("clamps invalid tax and excessive discount", () => {
  assert.deepEqual(calculateOrderTotals([{ total: 100 }], 999, 500), {
    subtotal: 100,
    gstRate: 100,
    gst: 100,
    discount: 200,
    total: 0,
  });
});

test("does not allow negative tax or discount", () => {
  assert.deepEqual(calculateOrderTotals([{ total: 100 }], -18, -5), {
    subtotal: 100,
    gstRate: 0,
    gst: 0,
    discount: 0,
    total: 100,
  });
});
