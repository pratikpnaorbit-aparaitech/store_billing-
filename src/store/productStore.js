import { create } from "zustand";
import { loadProducts, saveProducts } from "../utils/storage";
import { products as sampleProducts } from "../data/productData";
import sharedCatalogue from "../../backend/data/catalogue.json";
import { reduceProductStock } from "../utils/billing";
import {
  adjustProductStock as adjustProductStockApi,
  createProduct,
  deleteProduct as deleteProductApi,
  fetchProducts,
  hasRemoteApi,
  lookupProduct as lookupProductApi,
  updateProduct as updateProductApi,
} from "../services/productApi";

const localId = () => `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const normalize = (product) => ({ ...product, id: String(product.id || product._id || localId()) });
const bundledCatalogue = sharedCatalogue.products.map((product) => ({
  ...product,
  _id: `catalog:${product.barcode}`,
  id: `catalog:${product.barcode}`,
  stock: 0,
  imagePublicId: "",
  active: true,
  source: "catalogue",
  catalogue: true,
  virtual: true,
}));

function localCatalogueSnapshot(saved) {
  const savedProducts = (Array.isArray(saved) ? saved : sampleProducts).map(normalize);
  const alreadyContainsCatalogue = savedProducts.some(
    (product) => product.catalogue || product.id.startsWith("catalog:"),
  );
  if (alreadyContainsCatalogue) return savedProducts;

  const savedByBarcode = new Map(
    savedProducts.map((product) => [String(product.barcode || ""), product]),
  );
  const merged = bundledCatalogue.map((catalogueProduct) => {
    const savedProduct = savedByBarcode.get(String(catalogueProduct.barcode));
    if (!savedProduct) return catalogueProduct;
    savedByBarcode.delete(String(catalogueProduct.barcode));
    return {
      ...catalogueProduct,
      ...savedProduct,
      source: "catalogue",
      catalogue: true,
      virtual: false,
    };
  });
  for (const product of savedByBarcode.values()) {
    merged.push({
      ...product,
      source: product.source || "custom",
      catalogue: false,
      virtual: false,
    });
  }
  return merged;
}

export const useProductStore = create((set, get) => ({
  products: [], loading: false, error: null, syncStatus: hasRemoteApi ? "pending" : "offline",
  resetProducts: () => set({ products: [], loading: false, error: null, syncStatus: hasRemoteApi ? "pending" : "offline" }),

  hydrateProducts: async () => {
    set({ loading: true, error: null });
    if (hasRemoteApi) {
      try {
        const products = localCatalogueSnapshot(await fetchProducts());
        set({ products, loading: false, syncStatus: "synced" });
        await saveProducts(products);
      } catch (error) {
        const cached = await loadProducts();
        const products = localCatalogueSnapshot(cached);
        set({ products, loading: false, syncStatus: "offline", error: error.message });
        await saveProducts(products);
      }
      return;
    }
    const saved = await loadProducts();
    const products = localCatalogueSnapshot(saved);
    set({ products, loading: false, syncStatus: "offline" });
    if (!saved || products.length !== saved.length) await saveProducts(products);
  },

  refreshProducts: async () => {
    if (!hasRemoteApi) return get().products;
    const products = localCatalogueSnapshot(await fetchProducts());
    set({ products, syncStatus: "synced", error: null });
    await saveProducts(products);
    return products;
  },

  addProduct: async (product) => {
    if (get().products.some((item) => String(item.barcode) === String(product.barcode))) throw new Error("A product with this barcode already exists.");
    const created = hasRemoteApi ? normalize(await createProduct(product)) : normalize(product);
    const products = [created, ...get().products];
    set({ products, syncStatus: hasRemoteApi ? "synced" : "offline" });
    await saveProducts(products);
    return created;
  },

  updateProduct: async (id, changes) => {
    if (get().products.some((item) => item.id !== id && String(item.barcode) === String(changes.barcode))) throw new Error("A product with this barcode already exists.");
    const updated = hasRemoteApi ? normalize(await updateProductApi(id, changes)) : normalize({ ...get().products.find((item) => item.id === id), ...changes, id, virtual: false });
    const products = get().products.map((item) => item.id === id ? updated : item);
    set({ products, syncStatus: hasRemoteApi ? "synced" : "offline" });
    await saveProducts(products);
    return updated;
  },

  deleteProduct: async (id) => {
    if (hasRemoteApi) await deleteProductApi(id);
    const products = get().products.filter((item) => item.id !== id);
    set({ products });
    await saveProducts(products);
  },

  adjustStock: async (id, changes) => {
    const current = get().products.find((item) => item.id === id);
    if (!current) throw new Error("Product not found.");
    const requestedStock = changes.stock !== undefined
      ? Number(changes.stock)
      : Math.max(0, Number(current.stock || 0) + Number(changes.delta || 0));
    if (!Number.isInteger(requestedStock) || requestedStock < 0) {
      throw new Error("Stock must be a whole number of zero or more.");
    }
    const updated = hasRemoteApi
      ? normalize(await adjustProductStockApi(id, changes))
      : normalize({ ...current, stock: requestedStock, virtual: false });
    const products = get().products.map((item) => item.id === id ? updated : item);
    set({ products, syncStatus: hasRemoteApi ? "synced" : "offline" });
    await saveProducts(products);
    return updated;
  },

  lookupBarcode: async (barcode) => {
    const existing = get().products.find((item) => String(item.barcode) === String(barcode));
    if (existing || !hasRemoteApi) return existing || null;
    try {
      return normalize(await lookupProductApi(barcode));
    } catch (error) {
      if (error.status === 404) return null;
      throw error;
    }
  },

  reduceStock: async (cart) => {
    if (hasRemoteApi) return get().refreshProducts();
    const products = reduceProductStock(get().products, cart);
    set({ products });
    await saveProducts(products);
    return products;
  },
}));
