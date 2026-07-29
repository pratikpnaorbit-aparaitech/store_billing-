import React, { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useCartStore } from "../../store/cartStore";
import { useProductStore } from "../../store/productStore";
import { useSettingsStore } from "../../store/settingsStore";
import { formatCurrency } from "../../utils/billing";
import { visibleProducts } from "../../utils/catalogue";
import { isManualBarcode } from "../../utils/products";
import { useTranslation } from "../../i18n";

export default function ManualProductPicker({
  visible,
  onClose,
  onCreateProduct,
  onGoToBilling,
  billingButtonLabel = "View Bill",
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [feedback, setFeedback] = useState("");
  const allProducts = useProductStore((state) => state.products);
  const sharedCatalogueEnabled = useSettingsStore(
    (state) => state.settings.sharedCatalogueEnabled !== false,
  );
  const products = useMemo(
    () => visibleProducts(allProducts, sharedCatalogueEnabled),
    [allProducts, sharedCatalogueEnabled],
  );
  const cart = useCartStore((state) => state.cart);
  const addToCart = useCartStore((state) => state.addToCart);

  const categories = useMemo(
    () => [
      "All",
      ...Array.from(new Set(products.map((item) => item.category).filter(Boolean))).sort(),
    ],
    [products],
  );
  const activeCategory = categories.includes(category) ? category : "All";

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products
      .filter((item) => activeCategory === "All" || item.category === activeCategory)
      .filter((item) => {
        if (!query) return true;
        return [item.name, item.category, item.unit, isManualBarcode(item.barcode) ? "" : item.barcode]
          .some((value) => String(value || "").toLowerCase().includes(query));
      })
      .sort((first, second) => {
        const stockDifference = Number(second.stock > 0) - Number(first.stock > 0);
        return stockDifference || first.name.localeCompare(second.name);
      });
  }, [activeCategory, products, search]);

  const cartCount = cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

  const closePicker = () => {
    setFeedback("");
    onClose();
  };

  const createProduct = () => {
    setFeedback("");
    onCreateProduct();
  };

  const goToBilling = () => {
    setFeedback("");
    onGoToBilling();
  };

  const addProduct = (product) => {
    const result = addToCart(product);
    if (!result.ok) {
      setFeedback(result.message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      return;
    }
    setFeedback(`${product.name} ${t("added to the current bill")}`);
    Haptics.selectionAsync().catch(() => {});
  };

  const renderProduct = ({ item }) => {
    const outOfStock = Number(item.stock || 0) <= 0;
    const quantityInCart = cart.find((entry) => entry.id === item.id)?.quantity || 0;

    return (
      <TouchableOpacity
        activeOpacity={0.75}
        disabled={outOfStock}
        onPress={() => addProduct(item)}
        style={[styles.product, outOfStock && styles.productDisabled]}
      >
        <View style={styles.productIcon}>
          <Ionicons
            name={isManualBarcode(item.barcode) ? "basket-outline" : "cube-outline"}
            size={22}
            color="#0A46E4"
          />
        </View>
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.productMeta}>
            {item.unit || "1 pc"} · {outOfStock ? t("Out of stock") : `${t("Stock")} ${item.stock}`}
          </Text>
        </View>
        <View style={styles.productRight}>
          <Text style={styles.productPrice}>{formatCurrency(item.price)}</Text>
          <View style={[styles.addCircle, outOfStock && styles.addCircleDisabled]}>
            {quantityInCart ? (
              <Text style={styles.inCartCount}>{quantityInCart}</Text>
            ) : (
              <Ionicons name="add" size={20} color="#FFFFFF" />
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={closePicker}
    >
      <View style={styles.modalRoot}>
        <Pressable style={styles.backdrop} onPress={closePicker} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>{t("Add without barcode")}</Text>
              <Text style={styles.subtitle}>{t("Tap any product to add it instantly")}</Text>
            </View>
            <TouchableOpacity onPress={closePicker} style={styles.closeButton}>
              <Ionicons name="close" size={22} color="#0F172A" />
            </TouchableOpacity>
          </View>

          <View style={styles.search}>
            <Ionicons name="search-outline" size={20} color="#64748B" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={t("Search product (optional)")}
              placeholderTextColor="#94A3B8"
              style={styles.searchInput}
              returnKeyType="search"
            />
            {search ? (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Ionicons name="close-circle" size={20} color="#94A3B8" />
              </TouchableOpacity>
            ) : null}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryScroll}
            contentContainerStyle={styles.categories}
          >
            {categories.map((item) => {
              const active = activeCategory === item;
              return (
                <TouchableOpacity
                  key={item}
                  onPress={() => setCategory(item)}
                  style={[styles.category, active && styles.categoryActive]}
                >
                  <Text style={[styles.categoryText, active && styles.categoryTextActive]}>{t(item)}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {feedback ? (
            <View style={styles.feedback}>
              <Ionicons name="checkmark-circle" size={18} color="#15803D" />
              <Text style={styles.feedbackText} numberOfLines={2}>{feedback}</Text>
            </View>
          ) : null}

          <FlatList
            data={filteredProducts}
            keyExtractor={(item) => item.id}
            renderItem={renderProduct}
            style={styles.productListContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.productList}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="basket-outline" size={38} color="#94A3B8" />
                <Text style={styles.emptyTitle}>{t("No matching products")}</Text>
                <Text style={styles.emptyText}>{t("Create a no-barcode item once, then reuse it in every bill.")}</Text>
              </View>
            }
          />

          <View style={styles.footer}>
            <TouchableOpacity style={styles.createButton} onPress={createProduct}>
              <Ionicons name="add-circle-outline" size={20} color="#0A46E4" />
              <Text style={styles.createButtonText}>{t("New Item")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.billButton, !cartCount && styles.billButtonDisabled]}
              onPress={goToBilling}
              disabled={!cartCount}
            >
              <Text style={styles.billButtonText}>{billingButtonLabel} · {cartCount}</Text>
              <Ionicons name="arrow-forward" size={19} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(2, 6, 23, 0.62)",
  },
  sheet: {
    height: "84%",
    backgroundColor: "#F8FAFC",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
    paddingHorizontal: 18,
    paddingBottom: 22,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 99,
    backgroundColor: "#CBD5E1",
    alignSelf: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 14,
    paddingBottom: 14,
  },
  headerCopy: { flex: 1 },
  title: { color: "#0F172A", fontSize: 22, fontWeight: "900" },
  subtitle: { color: "#64748B", fontSize: 13, fontWeight: "600", marginTop: 3 },
  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  search: {
    height: 52,
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
  },
  searchInput: { flex: 1, height: "100%", paddingHorizontal: 10, color: "#0F172A", fontWeight: "600" },
  categoryScroll: { flexGrow: 0, flexShrink: 0 },
  categories: { paddingVertical: 14, gap: 8 },
  category: {
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  categoryActive: { backgroundColor: "#0A46E4", borderColor: "#0A46E4" },
  categoryText: { color: "#64748B", fontSize: 13, fontWeight: "800" },
  categoryTextActive: { color: "#FFFFFF" },
  feedback: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 14,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 10,
  },
  feedbackText: { flex: 1, color: "#166534", fontSize: 12, fontWeight: "800" },
  productListContainer: { flex: 1 },
  productList: { paddingBottom: 8 },
  product: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    marginBottom: 9,
  },
  productDisabled: { opacity: 0.48 },
  productIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: "#EAF1FF",
    alignItems: "center",
    justifyContent: "center",
  },
  productInfo: { flex: 1, paddingHorizontal: 11 },
  productName: { color: "#0F172A", fontSize: 15, fontWeight: "900" },
  productMeta: { color: "#64748B", fontSize: 12, fontWeight: "600", marginTop: 4 },
  productRight: { alignItems: "flex-end", gap: 7 },
  productPrice: { color: "#0A46E4", fontSize: 14, fontWeight: "900" },
  addCircle: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: "#0A46E4",
    alignItems: "center",
    justifyContent: "center",
  },
  addCircleDisabled: { backgroundColor: "#94A3B8" },
  inCartCount: { color: "#FFFFFF", fontSize: 12, fontWeight: "900" },
  empty: { alignItems: "center", paddingHorizontal: 28, paddingVertical: 38 },
  emptyTitle: { color: "#0F172A", fontSize: 17, fontWeight: "900", marginTop: 10 },
  emptyText: { color: "#64748B", textAlign: "center", fontWeight: "600", marginTop: 6, lineHeight: 19 },
  footer: {
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 12,
    flexDirection: "row",
    gap: 10,
  },
  createButton: {
    height: 52,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    backgroundColor: "#EFF6FF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    gap: 6,
  },
  createButtonText: { color: "#0A46E4", fontWeight: "900" },
  billButton: {
    flex: 1,
    height: 52,
    borderRadius: 17,
    backgroundColor: "#0F172A",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  billButtonDisabled: { backgroundColor: "#94A3B8" },
  billButtonText: { color: "#FFFFFF", fontWeight: "900" },
});
