const assert = require("node:assert/strict");
const test = require("node:test");
const {
  hashValue,
  normalizeDevice,
} = require("../src/services/deviceSessionService");

test("normalizes a device identity without retaining the raw id", () => {
  const device = normalizeDevice({
    deviceId: "0f0e0d0c-0b0a-4908-8706-050403020100",
    deviceName: "Owner phone",
    platform: "android",
  });
  assert.equal(device.deviceName, "Owner phone");
  assert.equal(device.platform, "android");
  assert.equal(device.deviceIdHash, hashValue("0f0e0d0c-0b0a-4908-8706-050403020100"));
  assert.notEqual(device.deviceIdHash, device.deviceId);
});

test("rejects an app request that has no stable device identity", () => {
  assert.throws(
    () => normalizeDevice({ deviceId: "short" }),
    (error) => error.code === "DEVICE_ID_REQUIRED" && error.status === 400,
  );
});
