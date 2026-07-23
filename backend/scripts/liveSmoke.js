require("dotenv").config();

const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const { app } = require("../server");
const connectDB = require("../src/config/db");
const { authConnection, connectAuthDB } = require("../src/config/authDb");
const Customer = require("../src/models/Customer");
const Order = require("../src/models/Order");
const PendingRegistration = require("../src/models/PendingRegistration");
const Product = require("../src/models/Product");
const User = require("../src/models/User");

if (process.env.NODE_ENV === "production") {
  throw new Error("The controlled live smoke test is disabled in production");
}

async function request(origin, pathname, options = {}, expectedStatus = 200) {
  const response = await fetch(`${origin}${pathname}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options.headers || {}),
    },
  });
  const body = await response.json();
  assert.equal(response.status, expectedStatus, `${pathname}: ${body.message || response.status}`);
  return body;
}

async function closeServer(server) {
  if (!server?.listening) return;
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
}

async function run() {
  const marker = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `store-billing-audit-${marker}@example.invalid`;
  const password = `Audit-${marker}-Start!`;
  const nextPassword = `Audit-${marker}-Changed!`;
  let user;
  let server;

  try {
    await Promise.all([connectDB(), connectAuthDB()]);
    user = await User.create({
      name: "Store Billing Audit",
      storeName: "Audit Store",
      email,
      phone: `9${String(Date.now()).slice(-9)}`,
      password: await bcrypt.hash(password, 12),
      role: "user",
    });

    server = app.listen(0, "127.0.0.1");
    await new Promise((resolve) => server.once("listening", resolve));
    const origin = `http://127.0.0.1:${server.address().port}`;

    const health = await request(origin, "/health");
    assert.equal(health.database, "connected");
    assert.equal(health.authDatabase, "connected");

    const login = await request(origin, "/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    const token = login.data.token;
    const authorized = { authorization: `Bearer ${token}` };

    const me = await request(origin, "/api/auth/me", { headers: authorized });
    assert.equal(me.data.email, email);

    const profile = await request(origin, "/api/auth/profile", {
      method: "PUT",
      headers: authorized,
      body: JSON.stringify({ name: "Store Billing Audit Updated", storeName: "Audit Store Updated" }),
    });
    assert.equal(profile.data.storeName, "Audit Store Updated");

    await request(origin, "/api/auth/password", {
      method: "PUT",
      headers: authorized,
      body: JSON.stringify({ currentPassword: password, newPassword: nextPassword }),
    });
    await request(origin, "/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password: nextPassword }),
    });

    const image = "data:image/png;base64,aGVsbG8=";
    const upload = await request(origin, "/api/uploads/product-image", {
      method: "POST",
      headers: authorized,
      body: JSON.stringify({ image }),
    }, 201);
    assert.equal(upload.data.url, image);

    const customer = await request(origin, "/api/customers", {
      method: "POST",
      headers: authorized,
      body: JSON.stringify({ name: "Audit Customer", phone: `8${String(Date.now()).slice(-9)}` }),
    }, 201);

    const product = await request(origin, "/api/products", {
      method: "POST",
      headers: authorized,
      body: JSON.stringify({
        name: "Audit Product",
        barcode: `AUDIT-${marker}`,
        category: "Audit",
        price: 100,
        stock: 2,
        unit: "1 pc",
        image: upload.data.url,
        imagePublicId: upload.data.publicId,
      }),
    }, 201);

    const products = await request(origin, "/api/products", { headers: authorized });
    assert.equal(products.data.some((item) => String(item._id) === String(product.data._id)), true);

    const order = await request(origin, "/api/orders", {
      method: "POST",
      headers: authorized,
      body: JSON.stringify({
        invoiceNo: `INV-AUDIT-${Date.now().toString(36).toUpperCase()}`,
        cart: [{ id: product.data._id, quantity: 1 }],
        customer: { id: customer.data._id },
        payment: "UPI",
        gstRate: 5,
        discount: 0,
        total: 105,
      }),
    }, 201);
    assert.equal(order.data.total, 105);

    const [orders, customers, updatedProducts] = await Promise.all([
      request(origin, "/api/orders", { headers: authorized }),
      request(origin, "/api/customers", { headers: authorized }),
      request(origin, "/api/products", { headers: authorized }),
    ]);
    assert.equal(orders.data.some((item) => String(item._id) === String(order.data._id)), true);
    assert.equal(customers.data.find((item) => String(item._id) === String(customer.data._id)).totalOrders, 1);
    assert.equal(updatedProducts.data.find((item) => String(item._id) === String(product.data._id)).stock, 1);

    await request(origin, `/api/customers/${customer.data._id}`, {
      method: "DELETE",
      headers: authorized,
    });
    await request(origin, `/api/products/${product.data._id}`, {
      method: "DELETE",
      headers: authorized,
    });

    console.log("Live API smoke: PASS");
    console.log("Verified: health, auth, profile, password, image, product, customer, order, stock, delete");
  } finally {
    try {
      await closeServer(server);
      if (user?._id) {
        await Promise.all([
          Order.deleteMany({ owner: user._id }),
          Customer.deleteMany({ owner: user._id }),
          Product.deleteMany({ owner: user._id }),
        ]);
      }
      await Promise.all([
        PendingRegistration.deleteMany({ email }),
        User.deleteMany({ email }),
      ]);
      console.log("Temporary audit records: cleaned");
    } finally {
      await Promise.allSettled([
        mongoose.disconnect(),
        authConnection.close(),
      ]);
    }
  }
}

run().catch((error) => {
  console.error("Live API smoke: FAIL");
  console.error(error.message);
  process.exitCode = 1;
});
