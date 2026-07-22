import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

export default function RevenueCard({
  revenue = "₹15,420",
  growth = "+12.6%",
  orders = "28",
  customers = "31",
}) {
  return (
    <LinearGradient colors={["#0A46E4", "#0732A3"]} style={styles.card}>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.label}>Today’s Revenue</Text>
          <Text style={styles.amount}>{revenue}</Text>
        </View>

        <View style={styles.iconBox}>
          <Ionicons name="trending-up-outline" size={26} color="#FFFFFF" />
        </View>
      </View>

      <View style={styles.growthBox}>
        <Ionicons name="arrow-up" size={14} color="#BBF7D0" />
        <Text style={styles.growth}>{growth} from yesterday</Text>
      </View>

      <View style={styles.footer}>
        <View>
          <Text style={styles.footerValue}>{orders}</Text>
          <Text style={styles.footerLabel}>Orders</Text>
        </View>

        <View style={styles.divider} />

        <View>
          <Text style={styles.footerValue}>{customers}</Text>
          <Text style={styles.footerLabel}>Customers</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
    padding: 24,
    marginTop: 24,
    shadowColor: "#0A46E4",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.24,
    shadowRadius: 24,
    elevation: 10,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  label: {
    color: "#BFDBFE",
    fontSize: 14,
    fontWeight: "800",
  },
  amount: {
    marginTop: 8,
    color: "#FFFFFF",
    fontSize: 38,
    fontWeight: "900",
    letterSpacing: -1,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  growthBox: {
    marginTop: 14,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(34,197,94,0.16)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  growth: {
    color: "#DCFCE7",
    fontSize: 12,
    fontWeight: "800",
  },
  footer: {
    marginTop: 22,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.18)",
    flexDirection: "row",
    alignItems: "center",
    gap: 24,
  },
  footerValue: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "900",
  },
  footerLabel: {
    marginTop: 4,
    color: "#DBEAFE",
    fontSize: 12,
    fontWeight: "700",
  },
  divider: {
    width: 1,
    height: 34,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
});
