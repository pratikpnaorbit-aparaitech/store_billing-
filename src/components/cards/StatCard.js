import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppCard from "./AppCard";

export default function StatCard({
  icon = "stats-chart",
  title,
  value,
  color = "#0A46E4",
  onPress,
}) {
  const content = (
    <AppCard style={styles.card}>
      <View style={[styles.iconBox, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>

      <Text style={styles.value}>{value}</Text>
      <Text style={styles.title}>{title}</Text>
    </AppCard>
  );
  return onPress ? <TouchableOpacity style={styles.touch} activeOpacity={0.82} onPress={onPress}>{content}</TouchableOpacity> : content;
}

const styles = StyleSheet.create({
  touch: { flex: 1 },
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
