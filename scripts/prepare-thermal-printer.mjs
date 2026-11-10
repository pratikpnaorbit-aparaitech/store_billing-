import fs from "node:fs";
import path from "node:path";

// The upstream bridge predates modern Android Gradle namespace requirements.
// Keep these compatibility changes reproducible after npm ci / EAS install.
const root = path.resolve(import.meta.dirname, "../node_modules/react-native-thermal-printer");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
if (pkg.version !== "2.3.6") throw new Error("Review thermal printer Android compatibility before upgrading the bridge.");
const gradlePath = path.join(root, "android/build.gradle");
let gradle = fs.readFileSync(gradlePath, "utf8");
gradle = gradle.replaceAll("jcenter()", "mavenCentral()");
if (!gradle.includes('namespace "com.reactnativethermalprinter"')) gradle = gradle.replace("android {", 'android {\n    namespace "com.reactnativethermalprinter"');
gradle = gradle.replace("safeExtGet('ThermalPrinter_compileSdkVersion', 33)", "safeExtGet('compileSdkVersion', 36)");
gradle = gradle.replace(/    buildToolsVersion.*\r?\n/, "");
gradle = gradle.replace('implementation "com.facebook.react:react-native:+"', 'implementation "com.facebook.react:react-android"');
fs.writeFileSync(gradlePath, gradle);
const manifestPath = path.join(root, "android/src/main/AndroidManifest.xml");
fs.writeFileSync(manifestPath, fs.readFileSync(manifestPath, "utf8").replace(/\s+package="com.reactnativethermalprinter"/, ""));
const javaPath = path.join(root, "android/src/main/java/com/reactnativethermalprinter/ThermalPrinterModule.java");
let java = fs.readFileSync(javaPath, "utf8");
java = java.replace('this.jsPromise.reject("Connection Error", "Bluetooth Device Not Found");', 'this.jsPromise.reject("Connection Error", "Bluetooth Device Not Found");\n      return;');
// Avoid accumulating duplicate paired connections on each print.
java = java.replace("Set<BluetoothDevice> pairedDevices =", "btDevicesList.clear();\n        Set<BluetoothDevice> pairedDevices =");
// Keep repeated postinstall runs idempotent.
java = java.replace(/(btDevicesList.clear\(\);\s*){2,}/g, "btDevicesList.clear();\n        ");
java = java.replace(/return;\s*return;/g, "return;");
fs.writeFileSync(javaPath, java);
console.log("Thermal printer Android compatibility prepared.");
