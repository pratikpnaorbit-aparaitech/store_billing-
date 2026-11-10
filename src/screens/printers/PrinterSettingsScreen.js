import React, { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePrinterStore } from "../../store/printerStore";
import { listBluetoothPrinters, openBluetoothSettings, testPrinter } from "../../services/thermalPrinter";
import useKeyboardForm from "../../hooks/useKeyboardForm";

export default function PrinterSettingsScreen({ navigation }) {
  const { printers, selectedId, addPrinter, removePrinter, selectPrinter } = usePrinterStore();
  const insets = useSafeAreaInsets();
  const { scrollRef, revealFocusedInput } = useKeyboardForm();
  const [form, setForm] = useState({ name: "", type: "system", address: "", port: "9100", paperWidth: 58, autoCut: false });
  const [devices, setDevices] = useState([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const field = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const run = async (action) => {
    if (busy) return;
    setBusy(true); setStatus("");
    try { await action(); } catch (error) { setStatus(error.message || "Printer could not be reached. Check power, connection and paper."); }
    finally { setBusy(false); }
  };
  const test = (printer) => run(async () => {
    await testPrinter(printer);
    setStatus(printer.type === "system" ? "Print dialog opened. Choose your printer to finish." : "Test receipt sent. Check the paper output.");
  });
  const save = () => {
    try { addPrinter(form); setStatus("Printer saved and selected as default."); setForm((current) => ({ ...current, name: "", address: "" })); }
    catch (error) { setStatus(error.message); }
  };
  const remove = (printer) => {
    if (Platform.OS === "web") { if (window.confirm("Remove " + printer.name + "?")) removePrinter(printer.id); }
    else Alert.alert("Remove printer?", printer.name, [{ text: "Cancel", style: "cancel" }, { text: "Remove", style: "destructive", onPress: () => removePrinter(printer.id) }]);
  };
  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : Platform.OS === "android" ? "height" : undefined}>
      <ScrollView ref={scrollRef} onLayout={revealFocusedInput} keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }]}>
        <View style={styles.header}><TouchableOpacity accessibilityLabel="Back" onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={26} color="#0F172A" /></TouchableOpacity><Text style={styles.title}>Receipt printers</Text></View>
        <Text style={styles.help}>Save a printer, select a default and print a test receipt before your first bill.</Text>
        <Text style={styles.heading}>Saved printers</Text>
        {!printers.length ? <Text style={styles.help}>No printers added yet.</Text> : null}
        {printers.map((printer) => <View key={printer.id} style={styles.card}>
          <TouchableOpacity disabled={busy} style={styles.row} onPress={() => selectPrinter(printer.id)} accessibilityRole="radio" accessibilityState={{ checked: selectedId === printer.id }}>
            <Ionicons name={selectedId === printer.id ? "radio-button-on" : "radio-button-off"} size={24} color="#0A46E4" /><View style={styles.flex}><Text style={styles.heading}>{printer.name}</Text><Text style={styles.help}>{printer.type} ? {printer.paperWidth}mm{printer.address ? " ? " + printer.address : ""}{selectedId === printer.id ? " ? Default" : ""}</Text></View>
          </TouchableOpacity>
          <View style={styles.row}><TouchableOpacity disabled={busy} style={styles.secondary} onPress={() => test(printer)}><Text style={styles.link}>Test print</Text></TouchableOpacity><TouchableOpacity disabled={busy} style={styles.secondary} onPress={() => remove(printer)}><Text style={styles.danger}>Remove</Text></TouchableOpacity></View>
        </View>)}
        <View style={styles.card}>
          <Text style={styles.heading}>Add a printer</Text>
          <Text style={styles.label}>Connection</Text>
          <View style={styles.choices}>{["system", ...(Platform.OS === "android" ? ["bluetooth", "network"] : [])].map((type) => <TouchableOpacity disabled={busy} key={type} style={[styles.choice, form.type === type && styles.selected]} onPress={() => { field("type", type); field("address", ""); }}><Text style={styles.link}>{({ system: "System print", bluetooth: "Bluetooth", network: "Wi-Fi / LAN" })[type]}</Text></TouchableOpacity>)}</View>
          <Text style={styles.help}>{form.type === "system" ? "Select your installed thermal printer in the device print dialog. USB printers need the manufacturer's driver or Android print service. On iPhone, use an AirPrint-compatible printer." : form.type === "bluetooth" ? "Pair the ESC/POS printer in phone Bluetooth settings, then load paired devices below." : "Connect phone and ESC/POS printer to the same Wi-Fi/LAN. Find the IP address on the printer's network test page."}</Text>
          {form.type === "bluetooth" ? <><TouchableOpacity disabled={busy} style={styles.secondary} onPress={() => run(async () => { await openBluetoothSettings(); })}><Text style={styles.link}>Open Bluetooth settings</Text></TouchableOpacity><TouchableOpacity disabled={busy} style={styles.secondary} onPress={() => run(async () => { const found = await listBluetoothPrinters(); setDevices(found); if (!found.length) setStatus("No paired devices found. Pair your printer in phone settings first."); })}><Text style={styles.link}>Load paired devices</Text></TouchableOpacity>{devices.map((device) => <TouchableOpacity disabled={busy} key={device.macAddress} style={[styles.choice, form.address === device.macAddress && styles.selected]} onPress={() => setForm((current) => ({ ...current, address: device.macAddress, name: device.deviceName || "Thermal printer" }))}><Text>{device.deviceName || "Bluetooth device"} ? {device.macAddress}</Text></TouchableOpacity>)}</> : null}
          <Text style={styles.label}>Printer name</Text><TextInput onFocus={revealFocusedInput} style={styles.input} value={form.name} onChangeText={(value) => field("name", value)} placeholder="Counter printer" editable={!busy} />
          {form.type !== "system" ? <><Text style={styles.label}>{form.type === "network" ? "Printer IP address" : "Bluetooth MAC address"}</Text><TextInput onFocus={revealFocusedInput} style={styles.input} value={form.address} onChangeText={(value) => field("address", value)} autoCapitalize="none" autoCorrect={false} placeholder={form.type === "network" ? "192.168.1.100" : "00:11:22:33:44:55"} editable={!busy} /></> : null}
          {form.type === "network" ? <><Text style={styles.label}>Port</Text><TextInput onFocus={revealFocusedInput} style={styles.input} value={form.port} onChangeText={(value) => field("port", value)} keyboardType="number-pad" editable={!busy} /></> : null}
          <Text style={styles.label}>Paper width</Text><View style={styles.choices}>{[58, 80].map((width) => <TouchableOpacity disabled={busy} key={width} style={[styles.choice, form.paperWidth === width && styles.selected]} onPress={() => field("paperWidth", width)}><Text style={styles.link}>{width}mm</Text></TouchableOpacity>)}</View>
          {form.type !== "system" ? <View style={styles.row}><Text style={styles.flex}>Cut paper after receipt (supported printers)</Text><Switch disabled={busy} value={form.autoCut} onValueChange={(value) => field("autoCut", value)} /></View> : null}
          <TouchableOpacity disabled={busy} style={styles.button} onPress={save}><Text style={styles.buttonText}>Save & select printer</Text></TouchableOpacity>
        </View>
        {status ? <Text accessibilityLiveRegion="polite" style={styles.status}>{status}</Text> : null}
        {busy ? <Text style={styles.help}>Working with printer?</Text> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8FAFC" }, content: { padding: 20 }, header: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 12 }, title: { fontSize: 25, fontWeight: "900", color: "#0F172A" }, heading: { fontSize: 16, fontWeight: "800", color: "#0F172A", marginVertical: 6 }, help: { color: "#64748B", lineHeight: 20, marginBottom: 12 }, card: { padding: 18, backgroundColor: "white", borderRadius: 22, borderWidth: 1, borderColor: "#E2E8F0", marginTop: 14 }, row: { flexDirection: "row", alignItems: "center", gap: 12 }, flex: { flex: 1 }, label: { marginTop: 16, marginBottom: 8, fontWeight: "800", color: "#334155" }, input: { height: 52, borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 14, paddingHorizontal: 14, backgroundColor: "#F8FAFC" }, choices: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }, choice: { padding: 12, borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 12, marginBottom: 4 }, selected: { borderColor: "#0A46E4", backgroundColor: "#EEF4FF" }, link: { color: "#0A46E4", fontWeight: "800" }, danger: { color: "#B91C1C", fontWeight: "800" }, secondary: { padding: 12 }, button: { padding: 17, alignItems: "center", backgroundColor: "#0A46E4", borderRadius: 15, marginTop: 18 }, buttonText: { color: "white", fontWeight: "900" }, status: { backgroundColor: "#EEF4FF", padding: 16, borderRadius: 14, marginTop: 16, color: "#1E3A8A", lineHeight: 21 },
});
