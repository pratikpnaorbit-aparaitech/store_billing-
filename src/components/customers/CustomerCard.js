import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function CustomerCard({ customer }) {
  return (
    <View style={styles.card}>
      <View style={styles.avatar}>
        <Text style={styles.initial}>{customer.name?.charAt(0) || "C"}</Text>
      </View>

      <View style={styles.info}>
        <Text style={styles.name}>{customer.name}</Text>
        <Text style={styles.phone}>{customer.phone || "No mobile number"}</Text>
        <Text style={styles.meta}>
          {customer.totalOrders || 0} orders • ₹{customer.totalSpent || 0}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#EAF1FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  initial: { color: "#0A46E4", fontWeight: "900", fontSize: 18 },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: "900", color: "#0F172A" },
  phone: { marginTop: 3, color: "#64748B", fontWeight: "600" },
  meta: { marginTop: 4, color: "#94A3B8", fontWeight: "700", fontSize: 12 },
});
