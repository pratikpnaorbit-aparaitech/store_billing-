import assert from "node:assert/strict";
import test from "node:test";
import { addCartItem, calculateBill, createInvoiceNo, getOrderAnalytics, reduceProductStock, roundMoney } from "../src/utils/billing.js";

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
  assert.match(createInvoiceNo(new Date("2026-07-22T12:34:56").getTime()), /^INV-\d{12}$/);
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
