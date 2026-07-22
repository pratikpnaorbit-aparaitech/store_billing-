import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function SectionHeader({ title, action }) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {action ? <Text style={styles.action}>{action}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginTop: 26,
    marginBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
  },
  action: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0A46E4",
  },
});
