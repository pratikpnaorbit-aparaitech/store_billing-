const mongoose = require("mongoose");
const dns = require("node:dns");

async function connectDB() {
  try {
    if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required");
    const dnsServers = String(process.env.MONGO_DNS_SERVERS || "").split(",").map((value) => value.trim()).filter(Boolean);
    if (dnsServers.length) dns.setServers(dnsServers);
    await mongoose.connect(process.env.MONGODB_URI);

    console.log("MongoDB connected");
    console.log("Database:", mongoose.connection.name);
  } catch (err) {
    console.error("MongoDB connection failed");
    console.error(err.message);
    throw err;
  }
}

module.exports = connectDB;
