const mongoose = require("mongoose");

const CustomerSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  phone: { type: String, trim: true, default: "", index: true },
  totalOrders: { type: Number, default: 0, min: 0 },
  totalSpent: { type: Number, default: 0, min: 0 },
  active: { type: Boolean, default: true },
}, { timestamps: true });

CustomerSchema.index(
  { owner: 1, phone: 1 },
  { unique: true, partialFilterExpression: { phone: { $type: "string", $gt: "" } } },
);

module.exports = mongoose.model("Customer", CustomerSchema);
