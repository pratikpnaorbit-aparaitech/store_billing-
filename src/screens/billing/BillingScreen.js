import React, { useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import ManualProductPicker from "../../components/products/ManualProductPicker";
import { useCartStore } from "../../store/cartStore";
import { useCustomerStore } from "../../store/customerStore";
import { useSettingsStore } from "../../store/settingsStore";
import { calculateBill, formatCurrency } from "../../utils/billing";
import { useTranslation } from "../../i18n";

export default function BillingScreen({ navigation }) {
  const { t } = useTranslation();
  const [payment, setPayment] = useState("Cash");
  const [discount, setDiscount] = useState("");
  const [manualPickerVisible, setManualPickerVisible] = useState(false);
  const customers = useCustomerStore((state) => state.customers);
  const [customerId, setCustomerId] = useState(customers[0]?.id || "walk-in");
  const gstRate = useSettingsStore((state) => state.settings.gstRate);
  const cart = useCartStore((state) => state.cart);
  const increaseQty = useCartStore((state) => state.increaseQty);
  const decreaseQty = useCartStore((state) => state.decreaseQty);
  const removeItem = useCartStore((state) => state.removeItem);
  const bill = useMemo(() => calculateBill(cart, gstRate, discount), [cart, discount, gstRate]);
  const selectedCustomer = customers.find((customer) => customer.id === customerId) || customers[0];

  const goToReceipt = () => {
    if (!cart.length) return;
    const unavailable = cart.find((item) => item.quantity > Number(item.stock || 0));
    if (unavailable) {
      Alert.alert(t("Stock changed"), `${unavailable.name}: ${t("No more stock is available.")}`);
      return;
    }
    navigation.navigate("Receipt", { ...bill, payment, customer: selectedCustomer });
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>{t("Billing")}</Text>
          <Text style={styles.headerSubtitle}>{cart.length} {t("product lines")}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.addActions}>
          <TouchableOpacity
            style={styles.scanAction}
            onPress={() => navigation.navigate("BarcodeScanner", { returnToBilling: true })}
          >
            <Ionicons name="scan-outline" size={22} color="#FFFFFF" />
            <View>
              <Text style={styles.scanActionTitle}>{t("Scan barcode")}</Text>
              <Text style={styles.scanActionText}>{t("Use camera")}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.manualAction}
            onPress={() => setManualPickerVisible(true)}
          >
            <Ionicons name="basket-outline" size={22} color="#0A46E4" />
            <View>
              <Text style={styles.manualActionTitle}>{t("Add manually")}</Text>
              <Text style={styles.manualActionText}>{t("No barcode")}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {!cart.length ? (
          <View style={styles.empty}>
            <Ionicons name="cart-outline" size={48} color="#94A3B8" />
            <Text style={styles.emptyTitle}>{t("Cart is empty")}</Text>
            <Text style={styles.muted}>{t("Scan a barcode or tap “Add manually” for loose items.")}</Text>
          </View>
        ) : (
          cart.map((item) => (
            <View style={styles.item} key={item.id}>
              <View style={styles.itemTop}>
                <View style={styles.flex}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.muted}>
                    {formatCurrency(item.price)} / {item.unit || "1 pc"} · Stock {item.stock}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => removeItem(item.id)}
                  accessibilityLabel={`Remove ${item.name}`}
                >
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
              <View style={styles.itemBottom}>
                <View style={styles.qty}>
                  <TouchableOpacity style={styles.qtyButton} onPress={() => decreaseQty(item.id)}>
                    <Ionicons name="remove" size={18} color="#0F172A" />
                  </TouchableOpacity>
                  <Text style={styles.qtyText}>{item.quantity}</Text>
                  <TouchableOpacity
                    style={styles.qtyButton}
                    onPress={() => {
                      if (!increaseQty(item.id)) {
                        Alert.alert(t("Stock limit"), t("No more stock is available."));
                      }
                    }}
                  >
                    <Ionicons name="add" size={18} color="#0F172A" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.itemTotal}>
                  {formatCurrency(Number(item.price) * item.quantity)}
                </Text>
              </View>
            </View>
          ))
        )}

        {cart.length ? (
          <>
            <Text style={styles.section}>{t("Customer")}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {customers.map((customer) => (
                <TouchableOpacity
                  key={customer.id}
                  onPress={() => setCustomerId(customer.id)}
                  style={[styles.chip, customerId === customer.id && styles.chipActive]}
                >
                  <Text style={[styles.chipText, customerId === customer.id && styles.chipTextActive]}>
                    {customer.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.summary}>
              <Row label={t("Subtotal")} value={formatCurrency(bill.subtotal)} />
              <Row label={`GST ${bill.gstRate}%`} value={formatCurrency(bill.gst)} />
              <View style={styles.discountRow}>
                <Text style={styles.rowLabel}>{t("Discount")} ₹</Text>
                <TextInput
                  value={discount}
                  onChangeText={setDiscount}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  style={styles.discountInput}
                />
              </View>
              <View style={styles.line} />
              <Row label={t("Grand Total")} value={formatCurrency(bill.total)} bold />
            </View>

            <Text style={styles.section}>{t("Payment Method")}</Text>
            <View style={styles.paymentRow}>
              {["Cash", "UPI", "Card"].map((item) => (
                <TouchableOpacity
                  key={item}
                  onPress={() => setPayment(item)}
                  style={[styles.payment, payment === item && styles.paymentActive]}
                >
                  <Text style={[styles.paymentText, payment === item && styles.paymentTextActive]}>
                    {t(item)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.generate} onPress={goToReceipt}>
              <Text style={styles.generateText}>{t("Review & Generate Bill")}</Text>
            </TouchableOpacity>
          </>
        ) : null}
      </ScrollView>

      <ManualProductPicker
        visible={manualPickerVisible}
        onClose={() => setManualPickerVisible(false)}
        onCreateProduct={() => {
          setManualPickerVisible(false);
          navigation.navigate("AddProduct", { manual: true });
        }}
        onGoToBilling={() => setManualPickerVisible(false)}
        billingButtonLabel={t("Continue Billing")}
      />
    </View>
  );
}

function Row({ label, value, bold }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, bold && styles.bold]}>{label}</Text>
      <Text style={[styles.rowValue, bold && styles.total]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    paddingTop: 44,
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  back: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginRight: 14,
  },
  headerCopy: { flex: 1 },
  title: { fontSize: 28, fontWeight: "900", color: "#0F172A" },
  headerSubtitle: { color: "#64748B", fontWeight: "600", marginTop: 2 },
  content: { padding: 20, paddingBottom: 50 },
  addActions: { flexDirection: "row", gap: 10, marginBottom: 18 },
  scanAction: {
    flex: 1,
    minHeight: 64,
    borderRadius: 20,
    backgroundColor: "#0A46E4",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    gap: 10,
  },
  scanActionTitle: { color: "#FFFFFF", fontWeight: "900" },
  scanActionText: { color: "#BFDBFE", fontSize: 11, fontWeight: "700", marginTop: 2 },
  manualAction: {
    flex: 1,
    minHeight: 64,
    borderRadius: 20,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    gap: 10,
  },
  manualActionTitle: { color: "#0A46E4", fontWeight: "900" },
  manualActionText: { color: "#64748B", fontSize: 11, fontWeight: "700", marginTop: 2 },
  item: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 12,
  },
  itemTop: { flexDirection: "row", alignItems: "center" },
  flex: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: "900", color: "#0F172A" },
  muted: { marginTop: 5, color: "#64748B", fontWeight: "600", textAlign: "center" },
  itemBottom: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  qty: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 4,
  },
  qtyButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  qtyText: { minWidth: 34, textAlign: "center", fontWeight: "900" },
  itemTotal: { fontSize: 18, fontWeight: "900", color: "#0A46E4" },
  section: { marginTop: 22, marginBottom: 12, fontSize: 18, fontWeight: "900", color: "#0F172A" },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 9,
  },
  chipActive: { backgroundColor: "#0A46E4", borderColor: "#0A46E4" },
  chipText: { color: "#64748B", fontWeight: "800" },
  chipTextActive: { color: "#FFFFFF" },
  summary: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginTop: 20,
  },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  rowLabel: { color: "#64748B", fontWeight: "700" },
  rowValue: { color: "#0F172A", fontWeight: "800" },
  bold: { color: "#0F172A", fontSize: 16 },
  total: { color: "#0A46E4", fontSize: 20, fontWeight: "900" },
  discountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  discountInput: {
    height: 38,
    width: 100,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    textAlign: "right",
    paddingHorizontal: 10,
  },
  line: { height: 1, backgroundColor: "#E2E8F0", marginVertical: 8 },
  paymentRow: { flexDirection: "row", gap: 10 },
  payment: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  paymentActive: { backgroundColor: "#0A46E4", borderColor: "#0A46E4" },
  paymentText: { fontWeight: "900", color: "#64748B" },
  paymentTextActive: { color: "#FFFFFF" },
  generate: {
    height: 56,
    borderRadius: 18,
    backgroundColor: "#0F172A",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 22,
  },
  generateText: { color: "#FFFFFF", fontWeight: "900" },
  empty: { marginTop: 76, alignItems: "center", paddingHorizontal: 20 },
  emptyTitle: { marginTop: 12, fontSize: 20, fontWeight: "900", color: "#0F172A" },
});
