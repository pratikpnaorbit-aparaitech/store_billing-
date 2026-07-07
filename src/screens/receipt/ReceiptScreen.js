import React from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";
import { useCartStore } from "../../store/cartStore";
import { useProductStore } from "../../store/productStore";
import { generateAndShareReceiptPDF } from "../../utils/pdfGenerator";

export default function ReceiptScreen({ navigation, route }) {
  const cart = useCartStore((state) => state.cart);
  const clearCart = useCartStore((state) => state.clearCart);
  const reduceStock = useProductStore((state) => state.reduceStock);

  const {
    payment = "Cash",
    subtotal = 0,
    gst = 0,
    discount = 0,
    total = 0,
  } = route.params || {};

  const invoiceNo = `INV-${Date.now().toString().slice(-6)}`;

  const sharePDF = async () => {
    await generateAndShareReceiptPDF({
      cart,
      payment,
      subtotal,
      gst,
      discount,
      total,
      invoiceNo,
      date: dayjs().format("DD MMM YYYY, hh:mm A"),
    });
  };

  const finishSale = () => {
    reduceStock(cart);
    clearCart();
    navigation.navigate("Main");
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.title}>Receipt</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.receipt}>
          <Text style={styles.storeName}>SMART BILLING</Text>
          <Text style={styles.storeSub}>Scan • Bill • Print</Text>

          <View style={styles.divider} />

          <InfoRow label="Invoice" value={invoiceNo} />
          <InfoRow label="Date" value={dayjs().format("DD MMM YYYY, hh:mm A")} />
          <InfoRow label="Payment" value={payment} />

          <View style={styles.divider} />

          {cart.map((item) => (
            <View style={styles.itemRow} key={item.id}>
              <View style={styles.itemLeft}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemMeta}>{item.quantity} × ₹{item.price}</Text>
              </View>
              <Text style={styles.itemAmount}>₹{Number(item.price) * item.quantity}</Text>
            </View>
          ))}

          <View style={styles.divider} />

          <InfoRow label="Subtotal" value={`₹${subtotal}`} />
          <InfoRow label="GST 5%" value={`₹${gst}`} />
          <InfoRow label="Discount" value={`₹${discount}`} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>TOTAL</Text>
            <Text style={styles.totalValue}>₹{total}</Text>
          </View>

          <Text style={styles.thanks}>Thank you ❤️</Text>
        </View>

        <TouchableOpacity style={styles.printBtn} activeOpacity={0.85} onPress={sharePDF}>
          <Ionicons name="print-outline" size={20} color="#FFFFFF" />
          <Text style={styles.printText}>Share PDF Receipt</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.doneBtn} activeOpacity={0.85} onPress={finishSale}>
          <Text style={styles.doneText}>Done</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
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
  receipt: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  storeName: {
    textAlign: "center",
    fontSize: 22,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: 1,
  },
  storeSub: {
    textAlign: "center",
    marginTop: 4,
    color: "#64748B",
    fontWeight: "700",
  },
  divider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 16,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 9,
  },
  infoLabel: { color: "#64748B", fontWeight: "700" },
  infoValue: { color: "#0F172A", fontWeight: "900" },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  itemLeft: { flex: 1 },
  itemName: { color: "#0F172A", fontWeight: "900", fontSize: 15 },
  itemMeta: { marginTop: 4, color: "#64748B", fontWeight: "600", fontSize: 12 },
  itemAmount: { color: "#0A46E4", fontWeight: "900", fontSize: 15 },
  totalRow: {
    marginTop: 14,
    borderRadius: 18,
    backgroundColor: "#0F172A",
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  totalLabel: { color: "#FFFFFF", fontWeight: "900", fontSize: 16 },
  totalValue: { color: "#FFFFFF", fontWeight: "900", fontSize: 20 },
  thanks: {
    textAlign: "center",
    marginTop: 18,
    color: "#64748B",
    fontWeight: "800",
  },
  printBtn: {
    marginTop: 18,
    height: 56,
    borderRadius: 18,
    backgroundColor: "#0A46E4",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  printText: { color: "#FFFFFF", fontWeight: "900", fontSize: 15 },
  doneBtn: {
    marginTop: 12,
    height: 54,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  doneText: { color: "#0F172A", fontWeight: "900", fontSize: 15 },
});
