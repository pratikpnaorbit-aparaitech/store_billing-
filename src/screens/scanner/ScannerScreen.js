import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function ScannerScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Scanner</Text>
      <Text style={styles.subtitle}>Coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC", alignItems: "center", justifyContent: "center" },
  title: { fontSize: 30, fontWeight: "900", color: "#0F172A" },
  subtitle: { marginTop: 8, color: "#64748B", fontWeight: "600" },
});
