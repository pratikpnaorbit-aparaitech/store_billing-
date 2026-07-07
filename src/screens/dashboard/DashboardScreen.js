import React from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

export default function DashboardScreen() {
  return (
    <ScrollView style={styles.screen} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good Morning 👋</Text>
          <Text style={styles.name}>Vivek</Text>
        </View>
        <View style={styles.avatar}>
          <Ionicons name="person" size={22} color="#0A46E4" />
        </View>
      </View>

      <LinearGradient colors={["#0A46E4", "#0732A3"]} style={styles.revenueCard}>
        <Text style={styles.cardLabel}>Today's Revenue</Text>
        <Text style={styles.amount}>₹15,420</Text>
        <Text style={styles.growth}>+12% from yesterday</Text>
      </LinearGradient>

      <Text style={styles.sectionTitle}>Quick Actions</Text>

      <View style={styles.grid}>
        {[
          ["scan-outline", "Scan Product"],
          ["add-circle-outline", "Add Product"],
          ["receipt-outline", "Orders"],
          ["bar-chart-outline", "Reports"],
        ].map((item) => (
          <TouchableOpacity style={styles.actionCard} key={item[1]}>
            <Ionicons name={item[0]} size={28} color="#0A46E4" />
            <Text style={styles.actionText}>{item[1]}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Today Overview</Text>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>28</Text>
          <Text style={styles.statLabel}>Orders</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>06</Text>
          <Text style={styles.statLabel}>Low Stock</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Recent Bills</Text>

      {[1054, 1055, 1056].map((bill) => (
        <View style={styles.billCard} key={bill}>
          <View>
            <Text style={styles.billTitle}>Bill #{bill}</Text>
            <Text style={styles.billSub}>Cash Payment</Text>
          </View>
          <Text style={styles.billAmount}>₹{bill === 1054 ? "450" : bill === 1055 ? "780" : "320"}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8FAFC", padding: 20 },
  header: { marginTop: 32, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  greeting: { color: "#64748B", fontSize: 15, fontWeight: "600" },
  name: { color: "#0F172A", fontSize: 28, fontWeight: "900", marginTop: 4 },
  avatar: { width: 46, height: 46, borderRadius: 18, backgroundColor: "#EAF1FF", alignItems: "center", justifyContent: "center" },
  revenueCard: { marginTop: 24, borderRadius: 28, padding: 24 },
  cardLabel: { color: "#BFDBFE", fontWeight: "700" },
  amount: { color: "#FFFFFF", fontSize: 38, fontWeight: "900", marginTop: 8 },
  growth: { color: "#DBEAFE", marginTop: 8, fontWeight: "600" },
  sectionTitle: { fontSize: 18, fontWeight: "900", color: "#0F172A", marginTop: 28, marginBottom: 14 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  actionCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  actionText: { marginTop: 12, fontWeight: "800", color: "#0F172A" },
  statsRow: { flexDirection: "row", gap: 14 },
  statCard: { flex: 1, backgroundColor: "#FFFFFF", borderRadius: 22, padding: 20, borderWidth: 1, borderColor: "#E2E8F0" },
  statNumber: { fontSize: 30, fontWeight: "900", color: "#0A46E4" },
  statLabel: { marginTop: 6, color: "#64748B", fontWeight: "700" },
  billCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  billTitle: { fontWeight: "900", color: "#0F172A" },
  billSub: { marginTop: 4, color: "#64748B", fontSize: 13 },
  billAmount: { fontWeight: "900", color: "#0A46E4", fontSize: 17 },
});
