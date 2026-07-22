import React from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from "react-native";

export default function AppButton({ title, onPress, loading = false, disabled = false, style }) {
  return <TouchableOpacity accessibilityRole="button" activeOpacity={0.85} onPress={onPress} disabled={disabled || loading} style={[styles.button, (disabled || loading) && styles.disabled, style]}>{loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.text}>{title}</Text>}</TouchableOpacity>;
}
const styles = StyleSheet.create({ button: { minHeight: 54, borderRadius: 18, backgroundColor: "#0A46E4", alignItems: "center", justifyContent: "center", paddingHorizontal: 20 }, disabled: { backgroundColor: "#94A3B8" }, text: { color: "#FFF", fontWeight: "900", fontSize: 15 } });
