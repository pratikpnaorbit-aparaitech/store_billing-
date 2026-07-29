import React, { useMemo, useState } from "react";
import { View, Text, FlatList, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import SearchBar from "../../components/products/SearchBar";
import CategoryChip from "../../components/products/CategoryChip";
import ProductCard from "../../components/products/ProductCard";
import FloatingActionButton from "../../components/products/FloatingActionButton";
import FloatingCartBar from "../../components/cart/FloatingCartBar";
import InventorySummary from "../../components/inventory/InventorySummary";
import { useProductStore } from "../../store/productStore";
import { useCartStore } from "../../store/cartStore";
import { useTranslation } from "../../i18n";

export default function ProductListScreen({ navigation }) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [stockFilter, setStockFilter] = useState("All");
  const products = useProductStore((state) => state.products);
  const cartHasItems = useCartStore((state) => state.cart.length > 0);
  const categories = useMemo(
    () => ["All", ...Array.from(new Set(products.map((item) => item.category).filter(Boolean))).sort()],
    [products],
  );

  const filteredProducts = useMemo(() => {
    return products.filter((item) => {
      const matchesCategory =
        activeCategory === "All" || item.category === activeCategory;

      const query = search.toLowerCase();
      const matchesSearch =
        item.name.toLowerCase().includes(query) ||
        String(item.brand || "").toLowerCase().includes(query) ||
        String(item.barcode || "").includes(query) ||
        item.category.toLowerCase().includes(query);

      const stock = Number(item.stock || 0);
      const matchesStock = stockFilter === "All"
        || (stockFilter === "In stock" && stock > 0)
        || (stockFilter === "Setup" && (stock <= 0 || Number(item.price || 0) <= 0))
        || (stockFilter === "Custom" && !item.catalogue);
      return matchesCategory && matchesSearch && matchesStock;
    });
  }, [search, activeCategory, products, stockFilter]);

  return (
    <View style={styles.screen}>
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <Text style={styles.title}>{t("Products")}</Text>
              <Text style={styles.subtitle}>{t("Manage inventory and pricing")}</Text>
            </View>

            <InventorySummary products={products} />

            <TouchableOpacity
              style={styles.importCard}
              activeOpacity={0.84}
              onPress={() => navigation.getParent()?.navigate("StockImport")}
            >
              <View style={styles.importIcon}>
                <Ionicons name="document-attach-outline" size={24} color="#FFFFFF" />
              </View>
              <View style={styles.importCopy}>
                <Text style={styles.importTitle}>{t("Import stock from a bill")}</Text>
                <Text style={styles.importText}>{t("Photo, PDF, CSV or Excel • review before applying")}</Text>
              </View>
              <Ionicons name="arrow-forward" size={20} color="#0A46E4" />
            </TouchableOpacity>

            <SearchBar value={search} onChangeText={setSearch} />

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.stockFilters}
            >
              {["All", "In stock", "Setup", "Custom"].map((filter) => (
                <TouchableOpacity
                  key={filter}
                  onPress={() => setStockFilter(filter)}
                  style={[styles.stockFilter, stockFilter === filter && styles.stockFilterActive]}
                >
                  <Text style={[styles.stockFilterText, stockFilter === filter && styles.stockFilterTextActive]}>
                    {t(filter)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categories}
            >
              {categories.map((category) => (
                <CategoryChip
                  key={category}
                  title={t(category)}
                  active={activeCategory === category}
                  onPress={() => setActiveCategory(category)}
                />
              ))}
            </ScrollView>
            <Text style={styles.attribution}>
              {t("Catalogue data: Open Food Facts family (ODbL) • Prices shown only where an INR observation is available")}
            </Text>
          </>
        }
        renderItem={({ item }) => <ProductCard product={item} navigation={navigation} />}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>{t("No products found")}</Text>
            <Text style={styles.emptyText}>{t("Try another search or category")}</Text>
          </View>
        }
      />

      <FloatingCartBar onPress={() => navigation.navigate("Billing")} />
      <FloatingActionButton
        bottom={cartHasItems ? 168 : 92}
        onPress={() => navigation.navigate("AddProduct")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 42,
    paddingBottom: 120,
  },
  header: {
    marginBottom: 2,
  },
  title: {
    fontSize: 32,
    fontWeight: "900",
    color: "#0F172A",
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
  },
  categories: {
    paddingTop: 4,
    paddingBottom: 18,
  },
  importCard: {
    minHeight: 80,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    backgroundColor: "#EFF6FF",
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    marginTop: 14,
  },
  importIcon: { width: 48, height: 48, borderRadius: 17, backgroundColor: "#0A46E4", alignItems: "center", justifyContent: "center" },
  importCopy: { flex: 1, paddingHorizontal: 12 },
  importTitle: { color: "#0F172A", fontSize: 14, fontWeight: "900" },
  importText: { color: "#64748B", fontSize: 11, fontWeight: "600", lineHeight: 16, marginTop: 3 },
  stockFilters: { flexDirection: "row", gap: 8, paddingTop: 14, paddingBottom: 8 },
  stockFilter: { borderRadius: 999, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0", paddingHorizontal: 14, paddingVertical: 9 },
  stockFilterActive: { backgroundColor: "#0F172A", borderColor: "#0F172A" },
  stockFilterText: { color: "#64748B", fontSize: 12, fontWeight: "900" },
  stockFilterTextActive: { color: "#FFFFFF" },
  attribution: { color: "#94A3B8", fontSize: 9, lineHeight: 13, marginBottom: 10 },
  emptyBox: {
    marginTop: 80,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
  },
  emptyText: {
    marginTop: 6,
    color: "#64748B",
    fontWeight: "600",
  },
});
