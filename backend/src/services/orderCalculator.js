const money = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

function calculateOrderTotals(items, requestedGstRate, requestedDiscount) {
  const subtotal = money(items.reduce((sum, item) => sum + Number(item.total), 0));
  const gstRate = Math.min(100, Math.max(0, Number(requestedGstRate) || 0));
  const gst = money((subtotal * gstRate) / 100);
  const discount = money(Math.min(subtotal + gst, Math.max(0, Number(requestedDiscount) || 0)));
  return { subtotal, gstRate, gst, discount, total: money(subtotal + gst - discount) };
}

module.exports = { calculateOrderTotals, money };
