const assert = require("node:assert/strict");
const test = require("node:test");
const { app } = require("../server");

async function withServer(run) {
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  try {
    const { port } = server.address();
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("reports API and database health", () => withServer(async (origin) => {
  const response = await fetch(`${origin}/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    success: true,
    status: "OK",
    database: "disconnected",
    authDatabase: "disconnected",
  });
}));

test("returns service metadata and JSON 404", () => withServer(async (origin) => {
  const root = await fetch(origin);
  assert.equal(root.status, 200);
  assert.equal((await root.json()).success, true);
  const missing = await fetch(`${origin}/not-a-route`);
  assert.equal(missing.status, 404);
  assert.deepEqual(await missing.json(), { success: false, message: "Route not found" });
}));

test("protects company data routes and sends security headers", () => withServer(async (origin) => {
  const response = await fetch(`${origin}/api/products`);
  assert.equal(response.status, 401);
  assert.equal((await response.json()).success, false);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-powered-by"), null);
}));

test("validates registration before accessing the database", () => withServer(async (origin) => {
  const response = await fetch(`${origin}/api/auth/register/request`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "not-an-email", password: "short" }),
  });
  assert.equal(response.status, 400);

  const verification = await fetch(`${origin}/api/auth/register/verify`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "user@example.com", code: "12" }),
  });
  assert.equal(verification.status, 400);
}));
