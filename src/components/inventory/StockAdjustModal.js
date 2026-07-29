import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useProductStore } from "../../store/productStore";
import { useTranslation } from "../../i18n";

export default function StockAdjustModal({ product, visible, onClose }) {
  const { t } = useTranslation();
  const adjustStock = useProductStore((state) => state.adjustStock);
  const [value, setValue] = useState(() => String(Number(product?.stock || 0)));
  const [saving, setSaving] = useState(false);

  const numericValue = Number(value);
  const change = (delta) => {
    const current = Number.isFinite(numericValue) ? numericValue : 0;
    setValue(String(Math.max(0, Math.trunc(current + delta))));
  };

  const save = async () => {
    if (!Number.isInteger(numericValue) || numericValue < 0) {
      Alert.alert(t("Invalid stock"), t("Stock must be a whole number of zero or more."));
      return;
    }
    setSaving(true);
    try {
      await adjustStock(product.id, { stock: numericValue });
      onClose();
    } catch (error) {
      Alert.alert(t("Stock was not updated"), error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={saving ? undefined : onClose} />
        <View style={styles.card}>
          <View style={styles.icon}>
            <Ionicons name="layers-outline" size={25} color="#0A46E4" />
          </View>
          <Text style={styles.title}>{t("Update stock")}</Text>
          <Text style={styles.product} numberOfLines={2}>{product?.name}</Text>
          <Text style={styles.hint}>{t("Use − / + or type the exact quantity.")}</Text>

          <View style={styles.stepper}>
            <TouchableOpacity style={styles.stepButton} onPress={() => change(-1)}>
              <Ionicons name="remove" size={25} color="#0F172A" />
            </TouchableOpacity>
            <TextInput
              value={value}
              onChangeText={(text) => setValue(text.replace(/[^\d]/g, ""))}
              keyboardType="number-pad"
              selectTextOnFocus
              style={styles.input}
              accessibilityLabel={t("Exact stock quantity")}
            />
            <TouchableOpacity style={styles.stepButton} onPress={() => change(1)}>
              <Ionicons name="add" size={25} color="#0F172A" />
            </TouchableOpacity>
          </View>

          <View style={styles.quickRow}>
            {[10, 25, 50, 100].map((quantity) => (
              <TouchableOpacity
                key={quantity}
                style={styles.quick}
                onPress={() => setValue(String(quantity))}
              >
                <Text style={styles.quickText}>{quantity}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancel} onPress={onClose} disabled={saving}>
              <Text style={styles.cancelText}>{t("Cancel")}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.save} onPress={save} disabled={saving}>
              {saving
                ? <ActivityIndicator color="#FFFFFF" />
                : <><Ionicons name="checkmark" size={20} color="#FFFFFF" /><Text style={styles.saveText}>{t("Save stock")}</Text></>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center", padding: 22 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(15,23,42,0.62)" },
  card: { width: "100%", maxWidth: 420, borderRadius: 28, backgroundColor: "#FFFFFF", padding: 22, alignItems: "center" },
  icon: { width: 58, height: 58, borderRadius: 20, backgroundColor: "#EAF1FF", alignItems: "center", justifyContent: "center" },
  title: { color: "#0F172A", fontSize: 23, fontWeight: "900", marginTop: 14 },
  product: { color: "#334155", fontSize: 15, fontWeight: "800", textAlign: "center", marginTop: 6 },
  hint: { color: "#64748B", fontSize: 12, marginTop: 5 },
  stepper: { width: "100%", flexDirection: "row", alignItems: "center", gap: 10, marginTop: 22 },
  stepButton: { width: 56, height: 56, borderRadius: 18, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },
  input: { flex: 1, height: 62, borderRadius: 19, borderWidth: 2, borderColor: "#BFDBFE", color: "#0F172A", fontSize: 25, fontWeight: "900", textAlign: "center", backgroundColor: "#F8FAFC" },
  quickRow: { flexDirection: "row", gap: 8, marginTop: 12, width: "100%" },
  quick: { flex: 1, borderRadius: 13, backgroundColor: "#EFF6FF", paddingVertical: 9, alignItems: "center" },
  quickText: { color: "#0A46E4", fontWeight: "900" },
  actions: { flexDirection: "row", gap: 10, width: "100%", marginTop: 22 },
  cancel: { flex: 1, height: 54, borderRadius: 17, borderWidth: 1, borderColor: "#E2E8F0", alignItems: "center", justifyContent: "center" },
  cancelText: { color: "#334155", fontWeight: "900" },
  save: { flex: 1.4, height: 54, borderRadius: 17, backgroundColor: "#0A46E4", flexDirection: "row", gap: 7, alignItems: "center", justifyContent: "center" },
  saveText: { color: "#FFFFFF", fontWeight: "900" },
});
