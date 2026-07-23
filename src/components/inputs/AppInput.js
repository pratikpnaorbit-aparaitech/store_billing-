import React from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

export default function AppInput({ label, error, style, ...props }) {
  return <View style={style}>{label ? <Text style={styles.label}>{label}</Text> : null}<TextInput placeholderTextColor="#94A3B8" style={[styles.input, error && styles.invalid]} {...props} />{error ? <Text style={styles.error}>{error}</Text> : null}</View>;
}
const styles = StyleSheet.create({ label: { fontSize: 13, fontWeight: "800", color: "#0F172A", marginBottom: 8 }, input: { height: 54, borderRadius: 18, backgroundColor: "#FFF", borderWidth: 1, borderColor: "#E2E8F0", paddingHorizontal: 16, color: "#0F172A" }, invalid: { borderColor: "#EF4444" }, error: { color: "#DC2626", fontSize: 12, marginTop: 5 } });
