const assert = require("node:assert/strict");
const test = require("node:test");
const { isValidUpiId, normalizeUpiId } = require("../src/utils/upi");

test("normalizes and validates optional UPI IDs", () => {
  assert.equal(normalizeUpiId("  My.Store@OKSBI  "), "my.store@oksbi");
  assert.equal(isValidUpiId("my.store@oksbi"), true);
  assert.equal(isValidUpiId("not-an-id"), false);
  assert.equal(isValidUpiId(""), false);
});
