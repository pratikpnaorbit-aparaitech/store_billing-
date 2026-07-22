const mongoose = require("mongoose");

async function connectDB() {
  try {
    if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required");
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
