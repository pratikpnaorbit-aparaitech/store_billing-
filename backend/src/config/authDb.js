const mongoose = require("mongoose");

const authConnection = mongoose.createConnection();

async function connectAuthDB() {
  if (!process.env.AUTH_MONGODB_URI) throw new Error("AUTH_MONGODB_URI is required");
  await authConnection.openUri(process.env.AUTH_MONGODB_URI);
  console.log("Authentication database connected");
}

module.exports = { authConnection, connectAuthDB };
