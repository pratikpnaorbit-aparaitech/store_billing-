import React from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";
import { useOrderStore } from "../../store/orderStore";
import { formatCurrency } from "../../utils/billing";

export default function OrderHistoryScreen({ navigation }) {
  const orders = useOrderStore((state) => state.orders);

  const openOrder = (order) => {
    navigation.navigate("Receipt", {
      orderId: String(order.id || order._id),
      fromHistory: true,
    });
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Orders</Text>
      <Text style={styles.subtitle}>Recent invoices and payments</Text>

      <FlatList
        data={orders}
        keyExtractor={(item) => String(item.id || item._id || item.invoiceNo)}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="receipt-outline" size={48} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No orders yet</Text>
            <Text style={styles.emptyText}>Generated bills will appear here</Text>
          </View>
        }
        renderItem={({ item }) => {
          const itemCount = (item.cart || []).reduce(
            (sum, product) => sum + Number(product.quantity || 0),
            0
          );

          return (
            <TouchableOpacity
              activeOpacity={0.82}
              accessibilityRole="button"
              accessibilityLabel={`Open complete bill ${item.invoiceNo}`}
              style={styles.card}
              onPress={() => openOrder(item)}
            >
              <View style={styles.row}>
                <View>
                  <Text style={styles.invoice}>{item.invoiceNo}</Text>
                  <Text style={styles.date}>
                    {dayjs(item.createdAt).format("DD MMM YYYY, hh:mm A")}
                  </Text>
                </View>

                <View style={styles.amountColumn}>
                  <Text style={styles.amount}>{formatCurrency(item.total)}</Text>
                  <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                </View>
              </View>

              <View style={styles.footer}>
                <View style={styles.paymentPill}>
                  <Ionicons
                    name={
                      item.payment === "UPI"
                        ? "phone-portrait-outline"
                        : item.payment === "Card"
                        ? "card-outline"
                        : "cash-outline"
                    }
                    size={15}
                    color="#0A46E4"
                  />
                  <Text style={styles.payment}>{item.payment}</Text>
                </View>

                <Text style={styles.items}>{itemCount} items</Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8FAFC", paddingHorizontal: 20, paddingTop: 44 },
  title: { fontSize: 32, fontWeight: "900", color: "#0F172A" },
  subtitle: { marginTop: 6, color: "#64748B", fontWeight: "600" },
  list: { paddingTop: 22, paddingBottom: 110 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 12,
  },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  amountColumn: { flexDirection: "row", alignItems: "center", gap: 6 },
  invoice: { fontSize: 16, fontWeight: "900", color: "#0F172A" },
  date: { marginTop: 5, fontSize: 12, color: "#64748B", fontWeight: "600" },
  amount: { fontSize: 20, fontWeight: "900", color: "#0A46E4" },
  footer: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  paymentPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EAF1FF",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  payment: { color: "#0A46E4", fontWeight: "900", fontSize: 12 },
  items: { color: "#64748B", fontWeight: "800" },
  emptyBox: { alignItems: "center", marginTop: 120 },
  emptyTitle: { marginTop: 12, fontSize: 20, fontWeight: "900", color: "#0F172A" },
  emptyText: { marginTop: 6, color: "#64748B", fontWeight: "600" },
});
