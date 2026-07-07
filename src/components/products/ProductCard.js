import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppCard from "../cards/AppCard";
import { useCartStore } from "../../store/cartStore";

export default function ProductCard({ product }) {
  const addToCart = useCartStore((state) => state.addToCart);
  const isLowStock = product.stock <= 10;

  return (
    <View>
      <AppCard style={styles.card}>
        <View style={styles.row}>
          {product.image ? (
            <Image
              source={{ uri: product.image }}
              style={styles.productImage}
            />
          ) : (
            <View style={styles.iconBox}>
              <Ionicons name="cube-outline" size={24} color="#0A46E4" />
            </View>
          )}

          <View style={styles.info}>
            <Text style={styles.name}>{product.name}</Text>
            <Text style={styles.meta}>{product.category} • {product.unit}</Text>
            <Text style={styles.barcode}>Barcode: {product.barcode}</Text>
          </View>

          <View style={styles.right}>
            <Text style={styles.price}>₹{product.price}</Text>
            <Text style={[styles.stock, isLowStock && styles.lowStock]}>
              Stock {product.stock}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.addButton}
          activeOpacity={0.85}
          onPress={() => addToCart(product)}
        >
          <Ionicons name="cart-outline" size={18} color="#FFFFFF" />
          <Text style={styles.addText}> Add</Text>
        </TouchableOpacity>
      </AppCard>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  row: { flexDirection: "row", alignItems: "center" },
  productImage: {
    width: 56,
    height: 56,
    borderRadius: 16,
    marginRight: 14,
    backgroundColor: "#F1F5F9",
  },

  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: "#EAF1FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: "900", color: "#0F172A" },
  meta: { marginTop: 3, fontSize: 13, color: "#64748B", fontWeight: "600" },
  barcode: { marginTop: 4, fontSize: 11, color: "#94A3B8", fontWeight: "600" },
  right: { alignItems: "flex-end" },
  price: { fontSize: 18, fontWeight: "900", color: "#0A46E4" },
  stock: { marginTop: 6, fontSize: 12, color: "#22C55E", fontWeight: "800" },
  lowStock: { color: "#EF4444" },

  addButton: {
    marginTop: 14,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#0A46E4",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  addText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
  },
});

