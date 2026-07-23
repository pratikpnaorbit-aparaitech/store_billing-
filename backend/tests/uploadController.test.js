const assert = require("node:assert/strict");
const test = require("node:test");
const { uploadProductImage } = require("../src/controllers/uploadController");

function invokeUpload(image, nodeEnv) {
  const originalNodeEnv = process.env.NODE_ENV;
  const cloudKeys = [
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
  ];
  const originalCloud = Object.fromEntries(cloudKeys.map((key) => [key, process.env[key]]));
  process.env.NODE_ENV = nodeEnv;
  cloudKeys.forEach((key) => delete process.env[key]);

  return new Promise((resolve, reject) => {
    const restore = () => {
      if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = originalNodeEnv;
      cloudKeys.forEach((key) => {
        if (originalCloud[key] === undefined) delete process.env[key];
        else process.env[key] = originalCloud[key];
      });
    };
    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(body) {
        restore();
        resolve({ status: this.statusCode, body });
      },
    };
    Promise.resolve(uploadProductImage({ body: { image } }, res)).catch((error) => {
      restore();
      reject(error);
    });
  });
}

test("uses embedded image storage only for local development", async () => {
  const image = "data:image/png;base64,aGVsbG8=";
  const development = await invokeUpload(image, "development");
  assert.equal(development.status, 201);
  assert.equal(development.body.data.url, image);
  assert.equal(development.body.data.publicId, "");

  const production = await invokeUpload(image, "production");
  assert.equal(production.status, 503);
  assert.equal(production.body.success, false);
});

test("rejects malformed image data before storage", async () => {
  const result = await invokeUpload("data:image/png;base64,not valid!", "development");
  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
});
