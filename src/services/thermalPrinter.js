import { Linking, NativeModules, PermissionsAndroid, Platform } from "react-native";
import * as Print from "expo-print";
import { normalizePrinter } from "../utils/printer/printerConfig";
import { thermalReceiptHtml, thermalReceiptPayload } from "../utils/printer/receiptLayout";

let printing = false;
async function nativePrinter() {
  if (Platform.OS !== "android") throw new Error("Direct Bluetooth/LAN printing is available on Android. Use System print on this device.");
  if (!NativeModules.ThermalPrinterModule) throw new Error("Install the new Android build to enable Bluetooth/LAN thermal printing. Use System print in Expo Go.");
  const module = await import("react-native-thermal-printer");
  return module.default;
}
async function bluetoothPermission() {
  if (Number(Platform.Version) >= 31) {
    const permissions = [PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT, PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN];
    const results = await PermissionsAndroid.requestMultiple(permissions);
    if (permissions.some((permission) => results[permission] !== PermissionsAndroid.RESULTS.GRANTED)) throw new Error("Allow Nearby devices permission to use your paired Bluetooth printer.");
  }
}
export async function listBluetoothPrinters() {
  const printer = await nativePrinter();
  await bluetoothPermission();
  return printer.getBluetoothDeviceList();
}
export const openBluetoothSettings = () => Linking.sendIntent("android.settings.BLUETOOTH_SETTINGS");

export async function printThermalReceipt(data, input) {
  if (printing) throw new Error("A print job is already in progress. Wait before printing again.");
  const config = normalizePrinter(input);
  printing = true;
  try {
    if (config.type === "system") {
      const html = thermalReceiptHtml(data, config.paperWidth);
      if (Platform.OS === "web") {
        const popup = window.open("", "_blank");
        if (!popup) throw new Error("Allow pop-ups to open the receipt print window.");
        popup.document.write(html);
        popup.document.close();
        popup.focus();
        popup.print();
      } else {
        await Print.printAsync({ html });
      }
      return;
    }
    const printer = await nativePrinter();
    const options = {
      payload: thermalReceiptPayload(data, config.paperWidth),
      autoCut: config.autoCut, openCashbox: false, mmFeedPaper: 10,
      printerDpi: 203, printerWidthMM: config.paperWidth === 58 ? 48 : 72,
      printerNbrCharactersPerLine: config.paperWidth === 58 ? 32 : 48,
      timeout: 15000,
    };
    if (config.type === "bluetooth") {
      await bluetoothPermission();
      await printer.getBluetoothDeviceList();
      await printer.printBluetooth({ ...options, macAddress: config.address });
    } else {
      await printer.printTcp({ ...options, ip: config.address, port: config.port });
    }
  } finally { printing = false; }
}

export const testPrinter = (printer) => printThermalReceipt({ storeName: "Smart Billing - Printer Test", invoiceNo: "TEST-ONLY", date: new Date().toLocaleString(), cart: [{ name: "Test item", quantity: 1, price: 10 }], subtotal: 10, gst: 0, discount: 0, total: 10 }, printer);
