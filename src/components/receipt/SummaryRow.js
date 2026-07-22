import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function SummaryRow({ label, value, total = false }) {
  return <View style={styles.row}><Text style={[styles.label, total && styles.total]}>{label}</Text><Text style={[styles.value, total && styles.totalValue]}>{value}</Text></View>;
}
const styles = StyleSheet.create({ row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }, label: { color: "#64748B", fontWeight: "700" }, value: { color: "#0F172A", fontWeight: "800" }, total: { color: "#0F172A", fontSize: 16 }, totalValue: { color: "#0A46E4", fontSize: 20, fontWeight: "900" } });
