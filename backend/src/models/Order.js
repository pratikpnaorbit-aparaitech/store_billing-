const mongoose = require("mongoose");

const OrderItemSchema = new mongoose.Schema(
  {
    productId: String,
    name: String,
    barcode: String,
    price: Number,
    quantity: Number,
    total: Number,
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    invoiceNo: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    items: [OrderItemSchema],

    payment: {
      type: String,
      enum: ["Cash", "UPI", "Card"],
      default: "Cash",
    },

    subtotal: {
      type: Number,
      default: 0,
    },

    gst: {
      type: Number,
      default: 0,
    },

    discount: {
      type: Number,
      default: 0,
    },

    total: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", OrderSchema);
