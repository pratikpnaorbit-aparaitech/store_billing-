import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function SalesChart({ data }) {
  const max = Math.max(...data.map((i) => i.amount), 1);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Weekly Sales Trend</Text>

      {data.map((item) => {
        const width = `${Math.max((item.amount / max) * 100, 8)}%`;

        return (
          <View style={styles.row} key={item.day}>
            <Text style={styles.day}>{item.day}</Text>
            <View style={styles.track}>
              <View style={[styles.bar, { width }]} />
            </View>
            <Text style={styles.amount}>₹{item.amount}</Text>
          </View>
        );
      })}
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
  },
  title: { fontSize: 18, fontWeight: "900", color: "#0F172A", marginBottom: 16 },
  row: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  day: { width: 38, fontWeight: "800", color: "#64748B" },
  track: {
    flex: 1,
    height: 10,
    borderRadius: 999,
    backgroundColor: "#E2E8F0",
    overflow: "hidden",
    marginHorizontal: 10,
  },
  bar: { height: "100%", borderRadius: 999, backgroundColor: "#0A46E4" },
  amount: { width: 58, textAlign: "right", fontSize: 12, fontWeight: "800", color: "#0F172A" },
});
