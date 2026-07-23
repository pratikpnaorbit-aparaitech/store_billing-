const Customer = require("../models/Customer");

exports.getCustomers = async (req, res) => {
  const customers = await Customer.find({ owner: req.userId, active: true }).sort({ createdAt: -1 });
  res.json({ success: true, count: customers.length, data: customers });
};

exports.createCustomer = async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const phone = String(req.body.phone || "").trim();
    if (!name) return res.status(400).json({ success: false, message: "Customer name is required" });
    if (phone && !/^\d{10}$/.test(phone)) return res.status(400).json({ success: false, message: "Mobile number must have 10 digits" });
    const customer = await Customer.create({ owner: req.userId, name, phone });
    res.status(201).json({ success: true, data: customer });
  } catch (error) {
    res.status(400).json({ success: false, message: error.code === 11000 ? "Mobile number already exists" : error.message });
  }
};

exports.deleteCustomer = async (req, res) => {
  const customer = await Customer.findOneAndUpdate(
    { _id: req.params.id, owner: req.userId, active: true },
    { active: false },
    { returnDocument: "after" },
  );
  if (!customer) return res.status(404).json({ success: false, message: "Customer not found" });
  res.json({ success: true });
};
