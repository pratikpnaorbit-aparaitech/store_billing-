import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppCard from "./AppCard";

export default function StatCard({
  icon = "stats-chart",
  title,
  value,
  color = "#0A46E4",
}) {
  return (
    <AppCard style={styles.card}>
      <View style={[styles.iconBox, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>

      <Text style={styles.value}>{value}</Text>
      <Text style={styles.title}>{title}</Text>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    marginHorizontal: 4,
    alignItems: "center",
    paddingVertical: 22,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  value: {
    fontSize: 24,
    fontWeight: "900",
    color: "#0F172A",
  },
  title: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
});
