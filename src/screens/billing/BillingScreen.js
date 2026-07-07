import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useCartStore } from "../../store/cartStore";

export default function BillingScreen({ navigation }) {
  const [payment, setPayment] = useState("Cash");

  const cart = useCartStore((state) => state.cart);
  const increaseQty = useCartStore((state) => state.increaseQty);
  const decreaseQty = useCartStore((state) => state.decreaseQty);
  const removeItem = useCartStore((state) => state.removeItem);

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0),
    [cart]
  );

  const gst = Math.round(subtotal * 0.05);
  const discount = 0;
  const total = subtotal + gst - discount;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.title}>Billing</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {cart.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="cart-outline" size={48} color="#94A3B8" />
            <Text style={styles.emptyTitle}>Cart is empty</Text>
            <Text style={styles.emptyText}>Add products to generate bill</Text>
          </View>
        ) : (
          cart.map((item) => (
            <View style={styles.itemCard} key={item.id}>
              <View style={styles.itemTop}>
                <View>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemMeta}>₹{item.price} × {item.quantity}</Text>
                </View>

                <TouchableOpacity onPress={() => removeItem(item.id)}>
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>

              <View style={styles.itemBottom}>
                <View style={styles.qtyBox}>
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => decreaseQty(item.id)}>
                    <Ionicons name="remove" size={18} color="#0F172A" />
                  </TouchableOpacity>

                  <Text style={styles.qty}>{item.quantity}</Text>

                  <TouchableOpacity style={styles.qtyBtn} onPress={() => increaseQty(item.id)}>
                    <Ionicons name="add" size={18} color="#0F172A" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.itemTotal}>₹{Number(item.price) * item.quantity}</Text>
              </View>
            </View>
          ))
        )}

        {cart.length > 0 ? (
          <>
            <View style={styles.summary}>
              <Row label="Subtotal" value={`₹${subtotal}`} />
              <Row label="GST 5%" value={`₹${gst}`} />
              <Row label="Discount" value={`₹${discount}`} />
              <View style={styles.line} />
              <Row label="Grand Total" value={`₹${total}`} bold />
            </View>

            <Text style={styles.sectionTitle}>Payment Method</Text>
            <View style={styles.paymentRow}>
              {["Cash", "UPI", "Card"].map((item) => (
                <TouchableOpacity
                  key={item}
                  onPress={() => setPayment(item)}
                  style={[styles.paymentChip, payment === item && styles.activePayment]}
                >
                  <Text style={[styles.paymentText, payment === item && styles.activePaymentText]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity activeOpacity={0.85} style={styles.generateBtn} onPress={() => navigation.navigate("Receipt", { payment, subtotal, gst, discount, total })}>
              <Text style={styles.generateText}>Generate Bill</Text>
            </TouchableOpacity>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Row({ label, value, bold }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, bold && styles.boldText]}>{label}</Text>
      <Text style={[styles.rowValue, bold && styles.boldValue]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { paddingTop: 44, paddingHorizontal: 20, paddingBottom: 16, flexDirection: "row", alignItems: "center" },
  backBtn: {
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
  title: { fontSize: 28, fontWeight: "900", color: "#0F172A" },
  content: { padding: 20, paddingBottom: 40 },
  itemCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 12,
  },
  itemTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  itemName: { fontSize: 16, fontWeight: "900", color: "#0F172A" },
  itemMeta: { marginTop: 4, color: "#64748B", fontWeight: "600" },
  itemBottom: { marginTop: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  qtyBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#F8FAFC", borderRadius: 14, padding: 4 },
  qtyBtn: { width: 34, height: 34, borderRadius: 12, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  qty: { minWidth: 34, textAlign: "center", fontWeight: "900", color: "#0F172A" },
  itemTotal: { fontSize: 18, fontWeight: "900", color: "#0A46E4" },
  summary: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginTop: 12,
  },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  rowLabel: { color: "#64748B", fontWeight: "700" },
  rowValue: { color: "#0F172A", fontWeight: "800" },
  boldText: { color: "#0F172A", fontSize: 16 },
  boldValue: { color: "#0A46E4", fontSize: 20, fontWeight: "900" },
  line: { height: 1, backgroundColor: "#E2E8F0", marginVertical: 8 },
  sectionTitle: { marginTop: 24, marginBottom: 12, fontSize: 18, fontWeight: "900", color: "#0F172A" },
  paymentRow: { flexDirection: "row", gap: 10 },
  paymentChip: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  activePayment: { backgroundColor: "#0A46E4", borderColor: "#0A46E4" },
  paymentText: { fontWeight: "900", color: "#64748B" },
  activePaymentText: { color: "#FFFFFF" },
  generateBtn: {
    height: 56,
    borderRadius: 18,
    backgroundColor: "#0F172A",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 22,
  },
  generateText: { color: "#FFFFFF", fontWeight: "900", fontSize: 15 },
  emptyBox: { marginTop: 120, alignItems: "center" },
  emptyTitle: { marginTop: 12, fontSize: 20, fontWeight: "900", color: "#0F172A" },
  emptyText: { marginTop: 6, color: "#64748B", fontWeight: "600" },
});
