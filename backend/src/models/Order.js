const mongoose = require("mongoose");

const OrderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  name: { type: String, required: true },
  barcode: { type: String, default: "" },
  price: { type: Number, required: true, min: 0 },
  quantity: { type: Number, required: true, min: 1 },
  total: { type: Number, required: true, min: 0 },
}, { _id: false });

const OrderSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  invoiceNo: { type: String, required: true },
  items: { type: [OrderItemSchema], validate: [(items) => items.length > 0, "Order requires at least one item"] },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", default: null },
  customerName: { type: String, default: "Walk-in Customer" },
  payment: { type: String, enum: ["Cash", "UPI", "Card"], default: "Cash" },
  subtotal: { type: Number, required: true, min: 0 },
  gstRate: { type: Number, required: true, min: 0, max: 100 },
  gst: { type: Number, required: true, min: 0 },
  discount: { type: Number, required: true, min: 0 },
  total: { type: Number, required: true, min: 0 },
}, { timestamps: true });

OrderSchema.index({ owner: 1, invoiceNo: 1 }, { unique: true });
OrderSchema.index({ owner: 1, createdAt: -1 });

module.exports = mongoose.model("Order", OrderSchema, "billing_orders");
