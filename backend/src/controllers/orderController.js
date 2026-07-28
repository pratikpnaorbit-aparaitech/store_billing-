const mongoose = require("mongoose");
const Customer = require("../models/Customer");
const Order = require("../models/Order");
const Product = require("../models/Product");
const { calculateOrderTotals, money } = require("../services/orderCalculator");

const invoiceNo = (requested) => /^INV-[A-Z0-9-]{6,32}$/i.test(String(requested || ""))
  ? String(requested).toUpperCase()
  : `INV-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

function serializeOrder(order) {
  const value = order.toObject ? order.toObject() : order;
  return {
    ...value,
    id: value._id,
    cart: value.items.map((item) => ({
      id: item.productId,
      productId: item.productId,
      name: item.name,
      barcode: item.barcode,
      price: item.price,
      quantity: item.quantity,
    })),
    customer: { id: value.customerId || "walk-in", name: value.customerName },
  };
}

exports.createOrder = async (req, res) => {
  const requestedItems = Array.isArray(req.body.cart) ? req.body.cart : req.body.items;
  if (!Array.isArray(requestedItems) || requestedItems.length === 0) {
    return res.status(400).json({ success: false, message: "Order requires at least one item" });
  }

  const session = await mongoose.startSession();
  try {
    let savedOrder;
    await session.withTransaction(async () => {
      const items = [];
      for (const requested of requestedItems) {
        const productId = requested.productId || requested.id;
        const quantity = Number(requested.quantity);
        if (!mongoose.isValidObjectId(productId) || !Number.isInteger(quantity) || quantity < 1) {
          throw new Error("Order contains an invalid product or quantity");
        }
        const product = await Product.findOne({ _id: productId, owner: req.userId, active: true }).session(session);
        if (!product) throw new Error("A product in this order no longer exists");
        const stockUpdate = await Product.updateOne(
          { _id: product._id, owner: req.userId, stock: { $gte: quantity } },
          { $inc: { stock: -quantity } },
          { session },
        );
        if (stockUpdate.modifiedCount !== 1) throw new Error(`Insufficient stock for ${product.name}`);
        items.push({
          productId: product._id,
          name: product.name,
          barcode: product.barcode,
          price: money(product.price),
          quantity,
          total: money(product.price * quantity),
        });
      }

      const { subtotal, gstRate, gst, discount, total } = calculateOrderTotals(
        items,
        req.body.gstRate,
        req.body.discount,
      );
      if (Number.isFinite(Number(req.body.total)) && Math.abs(Number(req.body.total) - total) > 0.01) {
        throw new Error("Product prices changed. Refresh the cart and review the total again");
      }
      const payment = ["Cash", "UPI", "Card"].includes(req.body.payment) ? req.body.payment : "Cash";

      let customerId = null;
      let customerName = "Walk-in Customer";
      if (req.body.customer?.id && req.body.customer.id !== "walk-in") {
        const customer = await Customer.findOne({ _id: req.body.customer.id, owner: req.userId, active: true }).session(session);
        if (!customer) throw new Error("Selected customer no longer exists");
        customerId = customer._id;
        customerName = customer.name;
        await Customer.updateOne(
          { _id: customer._id, owner: req.userId },
          { $inc: { totalOrders: 1, totalSpent: total } },
          { session },
        );
      }

      [savedOrder] = await Order.create([{
        owner: req.userId,
        storeName: req.user.storeName || req.user.name || "My Store",
        invoiceNo: invoiceNo(req.body.invoiceNo),
        items,
        customerId,
        customerName,
        payment,
        subtotal,
        gstRate,
        gst,
        discount,
        total,
      }], { session });
    });
    res.status(201).json({ success: true, data: serializeOrder(savedOrder) });
  } catch (error) {
    res.status(409).json({ success: false, message: error.message });
  } finally {
    await session.endSession();
  }
};

exports.getOrders = async (req, res) => {
  const orders = await Order.find({ owner: req.userId }).sort({ createdAt: -1 }).limit(1000);
  res.json({ success: true, count: orders.length, data: orders.map(serializeOrder) });
};
