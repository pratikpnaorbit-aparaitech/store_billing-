import { Platform } from "react-native";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

const DEVICE_KEY = "SMART_BILLING_DEVICE_ID";

async function readDeviceId() {
  return Platform.OS === "web"
    ? AsyncStorage.getItem(DEVICE_KEY)
    : SecureStore.getItemAsync(DEVICE_KEY);
}

async function writeDeviceId(value) {
  return Platform.OS === "web"
    ? AsyncStorage.setItem(DEVICE_KEY, value)
    : SecureStore.setItemAsync(DEVICE_KEY, value);
}

export async function getDeviceIdentity() {
  let deviceId = await readDeviceId();
  if (!deviceId) {
    deviceId = Crypto.randomUUID();
    await writeDeviceId(deviceId);
  }
  const model = Platform.constants?.Model
    || Platform.constants?.model
    || Platform.constants?.Brand
    || "";
  return {
    deviceId,
    deviceName: model ? `${model} (${Platform.OS})` : `Smart Billing ${Platform.OS} device`,
    platform: Platform.OS,
  };
}
