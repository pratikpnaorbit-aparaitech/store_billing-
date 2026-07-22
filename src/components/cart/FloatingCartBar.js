import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useCartStore } from "../../store/cartStore";

export default function FloatingCartBar({ onPress }) {
  const cart = useCartStore((state) => state.cart);

  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (itemCount === 0) return null;

  return (
    <TouchableOpacity activeOpacity={0.88} style={styles.bar} onPress={onPress}>
      <View style={styles.left}>
        <Ionicons name="cart" size={22} color="#FFFFFF" />
        <View>
          <Text style={styles.items}>{itemCount} Items</Text>
          <Text style={styles.total}>₹{total}</Text>
        </View>
      </View>

      <Text style={styles.action}>View Cart</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 92,
    height: 64,
    borderRadius: 22,
    backgroundColor: "#0F172A",
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 10,
  },
  left: { flexDirection: "row", alignItems: "center", gap: 12 },
  items: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
  total: { color: "#CBD5E1", marginTop: 2, fontSize: 13, fontWeight: "700" },
  action: { color: "#FFFFFF", fontWeight: "900" },
});
