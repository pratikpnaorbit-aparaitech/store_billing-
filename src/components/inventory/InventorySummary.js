import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../i18n";

export default function InventorySummary({ products = [], onSelect }) {
  const { t } = useTranslation();
  const total = products.filter((product) => (
    Number(product.stock || 0) > 0 || !product.catalogue || product.virtual === false
  )).length;
  const lowStock = products.filter(
    (p) => Number(p.stock) > 0 && Number(p.stock) <= 10,
  ).length;
  const catalogue = products.filter((product) => product.catalogue).length;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="cube-outline" size={22} color="#0A46E4" />
        <Text style={styles.title}>{t("Inventory")}</Text>
      </View>

      <View style={styles.row}>
        <Stat label={t("My Inventory")} value={total} color="#0A46E4" onPress={() => onSelect?.("Custom")} />
        <Stat label={t("Low Stock")} value={lowStock} color="#F59E0B" onPress={() => onSelect?.("Low stock")} />
        <Stat label={t("Catalogue")} value={catalogue} color="#7C3AED" onPress={() => onSelect?.("Catalogue")} />
      </View>
    </View>
  );
}

function Stat({ label, value, color, onPress }) {
  return (
    <TouchableOpacity style={styles.stat} onPress={onPress} activeOpacity={0.75}>
      <Text style={[styles.value, { color }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
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
