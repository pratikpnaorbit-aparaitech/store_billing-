export const roundMoney = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

export function calculateBill(cart = [], gstRate = 5, discount = 0) {
  const subtotal = roundMoney(
    cart.reduce(
      (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
      0,
    ),
  );
  const safeGstRate = Math.min(100, Math.max(0, Number(gstRate) || 0));
  const gst = roundMoney((subtotal * safeGstRate) / 100);
  const safeDiscount = Math.min(subtotal + gst, Math.max(0, Number(discount) || 0));
  const total = roundMoney(subtotal + gst - safeDiscount);

  return { subtotal, gstRate: safeGstRate, gst, discount: safeDiscount, total };
}

export function createInvoiceNo(now = Date.now(), random = Math.random()) {
  const date = new Date(now);
  const stamp = [
    String(date.getFullYear()).slice(-2),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
    String(date.getHours()).padStart(2, "0"),
    String(date.getMinutes()).padStart(2, "0"),
    String(date.getSeconds()).padStart(2, "0"),
  ].join("");
  const milliseconds = String(date.getMilliseconds()).padStart(3, "0");
  const entropy = Math.floor(Math.max(0, Math.min(0.999999, Number(random) || 0)) * 1679616)
    .toString(36)
    .padStart(4, "0")
    .toUpperCase();
  return `INV-${stamp}-${milliseconds}-${entropy}`;
}

export function formatCurrency(value) {
  return `₹${roundMoney(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function getOrderAnalytics(orders = [], products = []) {
  const totalSales = roundMoney(orders.reduce((sum, order) => sum + Number(order.total || 0), 0));
  const productsSold = orders.reduce(
    (sum, order) => sum + (order.cart || order.items || []).reduce(
      (qty, item) => qty + Number(item.quantity || 0),
      0,
    ),
    0,
  );
  const lowStock = products.filter((product) => Number(product.stock || 0) <= 10).length;
  return {
    totalSales,
    totalOrders: orders.length,
    productsSold,
    averageBill: orders.length ? roundMoney(totalSales / orders.length) : 0,
    lowStock,
  };
}

export function toLocalDateKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function getDailySalesInsights(orders = [], dateKey = toLocalDateKey(new Date())) {
  const selectedOrders = orders
    .filter((order) => toLocalDateKey(order.createdAt || order.date) === dateKey)
    .sort((left, right) => (
      new Date(right.createdAt || right.date).getTime()
      - new Date(left.createdAt || left.date).getTime()
    ));
  const products = new Map();
  let productsSold = 0;

  selectedOrders.forEach((order) => {
    (order.cart || order.items || []).forEach((item) => {
      const quantity = Number(item.quantity || 0);
      const revenue = roundMoney(Number(item.price || 0) * quantity);
      productsSold += quantity;
      const key = String(item.id || item.productId || item.barcode || item.name);
      const existing = products.get(key) || {
        id: key,
        name: item.name || "Product",
        quantity: 0,
        revenue: 0,
      };
      existing.quantity += quantity;
      existing.revenue = roundMoney(existing.revenue + revenue);
      products.set(key, existing);
    });
  });

  const rankedProducts = [...products.values()].sort(
    (left, right) => right.quantity - left.quantity || right.revenue - left.revenue,
  );
  const revenue = roundMoney(
    selectedOrders.reduce((sum, order) => sum + Number(order.total || 0), 0),
  );

  return {
    dateKey,
    revenue,
    totalOrders: selectedOrders.length,
    productsSold,
    averageBill: selectedOrders.length ? roundMoney(revenue / selectedOrders.length) : 0,
    topProduct: rankedProducts[0] || null,
    products: rankedProducts,
    orders: selectedOrders,
  };
}

export function addCartItem(cart = [], product) {
  const stock = Number(product.stock || 0);
  const current = cart.find((item) => item.id === product.id)?.quantity || 0;
  if (stock <= current) {
    return { cart, ok: false, message: stock <= 0 ? "Product is out of stock." : "All available stock is already in the cart." };
  }
  const next = cart.some((item) => item.id === product.id)
    ? cart.map((item) => item.id === product.id ? { ...item, ...product, quantity: item.quantity + 1 } : item)
    : [{ ...product, quantity: 1 }, ...cart];
  return { cart: next, ok: true };
}

export function reduceProductStock(products = [], cart = []) {
  return products.map((product) => {
    const sold = cart.find((item) => item.id === product.id);
    return sold ? { ...product, stock: Math.max(0, Number(product.stock) - Number(sold.quantity)) } : product;
  });
}
