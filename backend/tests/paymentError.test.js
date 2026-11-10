const test = require("node:test");
const assert = require("node:assert/strict");
const paymentError = require("../src/services/paymentError");

test("provider credential failure is a server configuration error, not an expired user session", () => {
  const result = paymentError({ statusCode: 401, error: { code: "BAD_REQUEST_ERROR", description: "Authentication failed" } });
  assert.equal(result.status, 503);
  assert.equal(result.code, "PAYMENT_CONFIGURATION_ERROR");
  assert.match(result.message, /contact support/);
});
test("preserves actionable plan errors and provider validation messages", () => {
  assert.deepEqual(paymentError({status: 409, code: "PLAN_NOT_AVAILABLE", message: "Refresh plans"}), {status:409, code:"PLAN_NOT_AVAILABLE", message:"Refresh plans"});
  assert.equal(paymentError({statusCode:400,error:{description:"Invalid plan"}}).message,"Invalid plan");
});
