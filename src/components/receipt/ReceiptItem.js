import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { formatCurrency } from "../../utils/billing";

export default function ReceiptItem({ item }) {
  return <View style={styles.row}><View style={styles.info}><Text style={styles.name}>{item.name}</Text><Text style={styles.meta}>{item.quantity} × {formatCurrency(item.price)}</Text></View><Text style={styles.amount}>{formatCurrency(Number(item.price) * Number(item.quantity))}</Text></View>;
}
const styles = StyleSheet.create({ row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14 }, info: { flex: 1 }, name: { color: "#0F172A", fontWeight: "900" }, meta: { color: "#64748B", marginTop: 4, fontSize: 12 }, amount: { color: "#0A46E4", fontWeight: "900" } });
