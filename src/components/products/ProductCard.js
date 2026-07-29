import React, { useState } from "react";
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppCard from "../cards/AppCard";
import StockAdjustModal from "../inventory/StockAdjustModal";
import { useCartStore } from "../../store/cartStore";
import { useProductStore } from "../../store/productStore";
import { formatCurrency } from "../../utils/billing";
import { isManualBarcode } from "../../utils/products";
import { useTranslation } from "../../i18n";

export default function ProductCard({ product, navigation }) {
  const { t } = useTranslation();
  const [stockVisible, setStockVisible] = useState(false);
  const addToCart = useCartStore((state) => state.addToCart);
  const removeItem = useCartStore((state) => state.removeItem);
  const deleteProduct = useProductStore((state) => state.deleteProduct);
  const stock = Number(product.stock || 0);
  const priceReady = Number(product.price || 0) > 0;
  const out = stock <= 0;
  const low = stock > 0 && stock <= 10;

  const remove = () => Alert.alert(t("Delete product?"), product.name, [
    { text: t("Cancel"), style: "cancel" },
    {
      text: t("Delete"),
      style: "destructive",
      onPress: async () => {
        try {
          await deleteProduct(product.id);
          removeItem(product.id);
        } catch (error) {
          Alert.alert(t("Could not delete product"), error.message);
        }
      },
    },
  ]);

  const add = () => {
    if (!priceReady) {
      navigation.navigate("AddProduct", { product });
      return;
    }
    const result = addToCart(product);
    if (!result.ok) Alert.alert(t("Cannot add"), result.message);
  };

  return (
    <>
      <AppCard style={styles.card}>
        <View style={styles.row}>
          {product.image ? (
            <Image source={{ uri: product.image }} style={styles.image} />
          ) : (
            <View style={styles.icon}>
              <Ionicons
                name={isManualBarcode(product.barcode) ? "basket-outline" : "cube-outline"}
                size={24}
                color="#0A46E4"
              />
            </View>
          )}
          <View style={styles.info}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
              {product.catalogue ? <View style={styles.cataloguePill}><Text style={styles.catalogueText}>{t("Catalogue").toUpperCase()}</Text></View> : null}
            </View>
            <Text style={styles.meta}>{t(product.category)} • {product.unit}</Text>
            <Text style={styles.barcode}>
              {isManualBarcode(product.barcode) ? "No barcode · Manual item" : `Barcode: ${product.barcode}`}
            </Text>
          </View>
          <View style={styles.right}>
            <Text style={[styles.price, !priceReady && styles.priceMissing]}>
              {priceReady ? formatCurrency(product.price) : t("Set price")}
            </Text>
            <Text style={[styles.stock, low && styles.low, out && styles.out]}>
              {t("Stock")} {out ? 0 : stock}
            </Text>
            {low ? <Text style={styles.lowLabel}>{t("LOW STOCK")}</Text> : null}
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.stockButton} onPress={() => setStockVisible(true)}>
            <Ionicons name="layers-outline" size={18} color="#0A46E4" />
            <Text style={styles.stockButtonText}>{t("Stock")}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconAction} onPress={() => navigation.navigate("AddProduct", { product })}>
            <Ionicons name="create-outline" size={19} color="#0A46E4" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconAction} onPress={remove}>
            <Ionicons name="trash-outline" size={19} color="#EF4444" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.add, (out || !priceReady) && styles.setup]}
            onPress={add}
            disabled={out && priceReady}
          >
            <Ionicons name={priceReady ? "cart-outline" : "pricetag-outline"} size={18} color="#FFFFFF" />
            <Text style={styles.addText}>{priceReady ? t("Add") : t("Set price")}</Text>
          </TouchableOpacity>
        </View>
      </AppCard>
      {stockVisible ? (
        <StockAdjustModal
          product={product}
          visible
          onClose={() => setStockVisible(false)}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  row: { flexDirection: "row", alignItems: "center" },
  image: { width: 56, height: 56, borderRadius: 16, marginRight: 14, backgroundColor: "#F1F5F9" },
  icon: { width: 50, height: 50, borderRadius: 16, backgroundColor: "#EAF1FF", alignItems: "center", justifyContent: "center", marginRight: 14 },
  info: { flex: 1, minWidth: 0 },
  nameRow: { alignItems: "flex-start", gap: 5 },
  name: { fontSize: 15, fontWeight: "900", color: "#0F172A" },
  cataloguePill: { borderRadius: 999, backgroundColor: "#ECFDF5", paddingHorizontal: 7, paddingVertical: 3 },
  catalogueText: { color: "#047857", fontSize: 8, fontWeight: "900", letterSpacing: 0.5 },
  meta: { marginTop: 4, fontSize: 12, color: "#64748B", fontWeight: "600" },
  barcode: { marginTop: 4, fontSize: 10, color: "#94A3B8", fontWeight: "600" },
  right: { alignItems: "flex-end", paddingLeft: 8 },
  price: { fontSize: 15, fontWeight: "900", color: "#0A46E4" },
  priceMissing: { color: "#B45309", fontSize: 12 },
  stock: { marginTop: 6, fontSize: 12, color: "#16A34A", fontWeight: "800" },
  low: { color: "#D97706" },
  lowLabel: { color: "#D97706", fontSize: 9, fontWeight: "900", marginTop: 3 },
  out: { color: "#EF4444" },
  actions: { flexDirection: "row", gap: 8, marginTop: 14 },
  stockButton: { height: 42, borderRadius: 14, paddingHorizontal: 12, backgroundColor: "#EFF6FF", borderWidth: 1, borderColor: "#BFDBFE", flexDirection: "row", gap: 5, alignItems: "center", justifyContent: "center" },
  stockButtonText: { color: "#0A46E4", fontSize: 12, fontWeight: "900" },
  iconAction: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0", alignItems: "center", justifyContent: "center" },
  add: { flex: 1, height: 42, borderRadius: 14, backgroundColor: "#0A46E4", flexDirection: "row", gap: 4, alignItems: "center", justifyContent: "center" },
  setup: { backgroundColor: "#B45309" },
  addText: { color: "#FFFFFF", fontWeight: "800", fontSize: 12 },
});
