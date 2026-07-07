import React from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CustomerCard from "../../components/customers/CustomerCard";
import { useCustomerStore } from "../../store/customerStore";

export default function CustomerScreen() {
  const customers = useCustomerStore((state) => state.customers);

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Customers</Text>
      <Text style={styles.subtitle}>Customer purchase history</Text>

      <FlatList
        data={customers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="people-outline" size={48} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No customers yet</Text>
            <Text style={styles.emptyText}>Customers will appear here</Text>
          </View>
        }
        renderItem={({ item }) => <CustomerCard customer={item} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8FAFC", paddingHorizontal: 20, paddingTop: 44 },
  title: { fontSize: 32, fontWeight: "900", color: "#0F172A" },
  subtitle: { marginTop: 6, color: "#64748B", fontWeight: "600" },
  list: { paddingTop: 22, paddingBottom: 110 },
  emptyBox: { alignItems: "center", marginTop: 120 },
  emptyTitle: { marginTop: 12, fontSize: 20, fontWeight: "900", color: "#0F172A" },
  emptyText: { marginTop: 6, color: "#64748B", fontWeight: "600" },
});
