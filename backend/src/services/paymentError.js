// Provider authentication failures describe server credentials, not app login.
function paymentError(error) {
  const status = Number(error.statusCode || error.status || 502);
  if (status === 401 || /authentication failed/i.test(error.error?.description || error.message || "")) {
    return {
      status: 503,
      code: "PAYMENT_CONFIGURATION_ERROR",
      message: "Payments are temporarily unavailable because the payment provider could not authenticate this store. Please contact support.",
    };
  }
  return {
    status: status >= 400 && status <= 599 ? status : 502,
    code: error.code || "CHECKOUT_UNAVAILABLE",
    message: error.error?.description || error.message || "Could not start Razorpay checkout",
  };
}
module.exports = paymentError;
