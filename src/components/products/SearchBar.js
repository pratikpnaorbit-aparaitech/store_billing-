import React from "react";
import { View, TextInput, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../i18n";

export default function SearchBar({ value, onChangeText }) {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <Ionicons name="search-outline" size={20} color="#64748B" />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={t("Search products...")}
        placeholderTextColor="#94A3B8"
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 54,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginTop: 18,
  },
  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: "#0F172A",
  },
});
