import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppCard from "./AppCard";

export default function RecentBillCard({
  billNo = "#1056",
  customer = "Walk-in Customer",
  amount = "₹420",
  payment = "Cash",
  onPress,
}) {
  const card = (
    <AppCard style={styles.card}>
      <View style={styles.left}>
        <View style={styles.iconBox}>
          <Ionicons name="receipt-outline" size={20} color="#0A46E4" />
        </View>

        <View>
          <Text style={styles.bill}>{billNo}</Text>
          <Text style={styles.customer}>{customer}</Text>
          <Text style={styles.payment}>{payment}</Text>
        </View>
      </View>

      <Text style={styles.amount}>{amount}</Text>
    </AppCard>
  );
  return onPress ? <TouchableOpacity activeOpacity={0.82} onPress={onPress}>{card}</TouchableOpacity> : card;
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#EAF1FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  bill: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  customer: {
    marginTop: 2,
    color: "#64748B",
    fontSize: 13,
  },
  payment: {
    marginTop: 2,
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
  },
  amount: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0A46E4",
  },
});
