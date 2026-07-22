import React, { useMemo, useState } from "react";
import { View, Text, FlatList, ScrollView, StyleSheet } from "react-native";

import SearchBar from "../../components/products/SearchBar";
import CategoryChip from "../../components/products/CategoryChip";
import ProductCard from "../../components/products/ProductCard";
import FloatingActionButton from "../../components/products/FloatingActionButton";
import FloatingCartBar from "../../components/cart/FloatingCartBar";
import InventorySummary from "../../components/inventory/InventorySummary";
import { categories } from "../../data/productData";
import { useProductStore } from "../../store/productStore";

export default function ProductListScreen({ navigation }) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const products = useProductStore((state) => state.products);

  const filteredProducts = useMemo(() => {
    return products.filter((item) => {
      const matchesCategory =
        activeCategory === "All" || item.category === activeCategory;

      const query = search.toLowerCase();
      const matchesSearch =
        item.name.toLowerCase().includes(query) ||
        item.barcode.includes(query) ||
        item.category.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [search, activeCategory, products]);

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
              <Text style={styles.title}>Products</Text>
              <Text style={styles.subtitle}>Manage inventory and pricing</Text>
            </View>

            <InventorySummary products={products} />

            <SearchBar value={search} onChangeText={setSearch} />

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categories}
            >
              {categories.map((category) => (
                <CategoryChip
                  key={category}
                  title={category}
                  active={activeCategory === category}
                  onPress={() => setActiveCategory(category)}
                />
              ))}
            </ScrollView>
          </>
        }
        renderItem={({ item }) => <ProductCard product={item} navigation={navigation} />}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>No products found</Text>
            <Text style={styles.emptyText}>Try another search or category</Text>
          </View>
        }
      />

      <FloatingCartBar onPress={() => navigation.navigate("Billing")} />
      <FloatingActionButton onPress={() => navigation.navigate("AddProduct")} />
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
    paddingVertical: 18,
  },
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
