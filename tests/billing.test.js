import assert from "node:assert/strict";
import test from "node:test";
import { addCartItem, calculateBill, createInvoiceNo, getDailySalesInsights, getOrderAnalytics, reduceProductStock, roundMoney } from "../src/utils/billing.js";
import { createManualBarcode, isManualBarcode } from "../src/utils/products.js";
import { buildThermalReceipt } from "../src/utils/printer/thermalReceipt.js";

test("calculates subtotal, GST, discount and total with money rounding", () => {
  assert.deepEqual(calculateBill([{ price: 19.99, quantity: 3 }, { price: 10, quantity: 1 }], 5, 5), {
    subtotal: 69.97,
    gstRate: 5,
    gst: 3.5,
    discount: 5,
    total: 68.47,
  });
});

test("clamps invalid rates and discounts", () => {
  assert.deepEqual(calculateBill([{ price: 100, quantity: 1 }], -2, 999), {
    subtotal: 100,
    gstRate: 0,
    gst: 0,
    discount: 100,
    total: 0,
  });
  assert.equal(roundMoney(1.005), 1.01);
});

test("creates stable sortable invoice format", () => {
  const now = new Date("2026-07-22T12:34:56.789").getTime();
  assert.match(createInvoiceNo(now, 0.25), /^INV-\d{12}-\d{3}-[A-Z0-9]{4}$/);
  assert.notEqual(createInvoiceNo(now, 0.25), createInvoiceNo(now, 0.75));
});

test("aggregates completed order analytics", () => {
  const orders = [{ total: 125.5, cart: [{ quantity: 2 }] }, { total: 74.5, cart: [{ quantity: 1 }, { quantity: 3 }] }];
  assert.deepEqual(getOrderAnalytics(orders, [{ stock: 3 }, { stock: 11 }, { stock: 0 }]), {
    totalSales: 200,
    totalOrders: 2,
    productsSold: 6,
    averageBill: 100,
    lowStock: 2,
  });
});

test("builds date-wise sales and ranks the top product", () => {
  const insights = getDailySalesInsights([
    {
      id: "o1",
      createdAt: "2026-07-27T10:00:00",
      total: 210,
      cart: [{ id: "p1", name: "Powder", price: 100, quantity: 2 }],
    },
    {
      id: "o2",
      createdAt: "2026-07-27T18:00:00",
      total: 50,
      cart: [{ id: "p2", name: "Soap", price: 50, quantity: 1 }],
    },
    {
      id: "o3",
      createdAt: "2026-07-26T18:00:00",
      total: 999,
      cart: [{ id: "p2", name: "Soap", price: 999, quantity: 5 }],
    },
  ], "2026-07-27");
  assert.equal(insights.revenue, 260);
  assert.equal(insights.totalOrders, 2);
  assert.equal(insights.productsSold, 3);
  assert.equal(insights.topProduct.name, "Powder");
  assert.equal(insights.topProduct.quantity, 2);
  assert.deepEqual(insights.orders.map((order) => order.id), ["o2", "o1"]);
});

test("cart addition enforces stock and increments existing lines", () => {
  const product = { id: "p1", name: "Milk", stock: 2, price: 30 };
  const first = addCartItem([], product);
  assert.equal(first.ok, true);
  const second = addCartItem(first.cart, product);
  assert.equal(second.cart[0].quantity, 2);
  const blocked = addCartItem(second.cart, product);
  assert.equal(blocked.ok, false);
  assert.equal(blocked.cart[0].quantity, 2);
});

test("completed sale reduces stock without going below zero", () => {
  assert.deepEqual(reduceProductStock([{ id: "p1", stock: 2 }, { id: "p2", stock: 5 }], [{ id: "p1", quantity: 3 }]), [{ id: "p1", stock: 0 }, { id: "p2", stock: 5 }]);
});

test("creates unique-looking internal codes for products without a barcode", () => {
  const barcode = createManualBarcode(1722000000000, 0.25);
  assert.match(barcode, /^manual-1722000000000-[a-z0-9]{6}$/);
  assert.equal(isManualBarcode(barcode), true);
  assert.equal(isManualBarcode("8901234567890"), false);
});

test("prints the registered store name on thermal receipts", () => {
  const receipt = buildThermalReceipt({
    storeName: "Vivek Super Mart",
    invoiceNo: "INV-TEST",
    cart: [{ name: "Soap", price: 50, quantity: 1 }],
    total: 50,
  });
  assert.match(receipt, /^VIVEK SUPER MART/);
  assert.doesNotMatch(receipt, /^SMART BILLING/);
});
