const mongoose = require("mongoose");
const { authConnection } = require("../config/authDb");

const AppConfigSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, trim: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
}, { timestamps: true });

module.exports = authConnection.model("AppConfig", AppConfigSchema, "billing_app_config");
