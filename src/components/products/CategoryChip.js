import React from "react";
import { Text, TouchableOpacity, StyleSheet } from "react-native";

export default function CategoryChip({ title, active, onPress }) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.chip, active && styles.activeChip]}
    >
      <Text style={[styles.text, active && styles.activeText]}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginRight: 10,
  },
  activeChip: {
    backgroundColor: "#0A46E4",
    borderColor: "#0A46E4",
  },
  text: {
    color: "#64748B",
    fontWeight: "800",
    fontSize: 13,
  },
  activeText: {
    color: "#FFFFFF",
  },
});
