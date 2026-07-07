import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function InventorySummary({ products = [] }) {
  const total = products.length;
  const lowStock = products.filter(
    (p) => Number(p.stock) > 0 && Number(p.stock) <= 10,
  ).length;
  const outOfStock = products.filter((p) => Number(p.stock) === 0).length;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="cube-outline" size={22} color="#0A46E4" />
        <Text style={styles.title}>Inventory</Text>
      </View>

      <View style={styles.row}>
        <Stat label="Products" value={total} color="#0A46E4" />
        <Stat label="Low Stock" value={lowStock} color="#F59E0B" />
        <Stat label="Out" value={outOfStock} color="#EF4444" />
      </View>
    </View>
  );
}

function Stat({ label, value, color }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.value, { color }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginTop: 18,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 18, fontWeight: "900", color: "#0F172A" },
  row: { flexDirection: "row", justifyContent: "space-between", marginTop: 18 },
  stat: { flex: 1 },
  value: { fontSize: 24, fontWeight: "900" },
  label: { marginTop: 4, color: "#64748B", fontWeight: "700", fontSize: 12 },
});
