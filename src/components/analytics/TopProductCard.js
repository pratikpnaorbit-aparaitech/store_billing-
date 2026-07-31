import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useTranslation } from "../../i18n";

export default function TopProductCard({ product, onPress }) {
  const { t } = useTranslation();
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.82}>
      <View style={styles.rankBox}>
        <Text style={styles.rank}>#{product.rank}</Text>
      </View>

      <View style={styles.info}>
        <Text style={styles.name}>{product.name}</Text>
        <Text style={styles.sold}>{product.sold} {t("units sold")}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  rankBox: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "#EAF1FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  rank: { fontWeight: "900", color: "#0A46E4" },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: "900", color: "#0F172A" },
  sold: { marginTop: 3, color: "#64748B", fontWeight: "700", fontSize: 12 },
});
