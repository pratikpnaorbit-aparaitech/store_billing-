import { create } from "zustand";
import { loadProducts, saveProducts } from "../utils/storage";
import { products as sampleProducts } from "../data/productData";
import { reduceProductStock } from "../utils/billing";
import { fetchProducts, createProduct, updateProduct as updateProductApi, deleteProduct as deleteProductApi, hasRemoteApi } from "../services/productApi";

const localId = () => `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const normalize = (product) => ({ ...product, id: String(product.id || product._id || localId()) });

export const useProductStore = create((set, get) => ({
  products: [], loading: false, error: null, syncStatus: hasRemoteApi ? "pending" : "offline",
  resetProducts: () => set({ products: [], loading: false, error: null, syncStatus: hasRemoteApi ? "pending" : "offline" }),

  hydrateProducts: async () => {
    set({ loading: true, error: null });
    if (hasRemoteApi) {
      try {
        const products = (await fetchProducts()).map(normalize);
        set({ products, loading: false, syncStatus: "synced" });
        await saveProducts(products);
      } catch (error) {
        const cached = await loadProducts();
        set({ products: Array.isArray(cached) ? cached.map(normalize) : [], loading: false, syncStatus: "offline", error: error.message });
      }
      return;
    }
    const saved = await loadProducts();
    const products = (Array.isArray(saved) ? saved : sampleProducts).map(normalize);
    set({ products, loading: false, syncStatus: "offline" });
    if (!saved) await saveProducts(products);
  },

  refreshProducts: async () => {
    if (!hasRemoteApi) return get().products;
    const products = (await fetchProducts()).map(normalize);
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
    const updated = hasRemoteApi ? normalize(await updateProductApi(id, changes)) : normalize({ ...get().products.find((item) => item.id === id), ...changes, id });
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

  reduceStock: async (cart) => {
    if (hasRemoteApi) return get().refreshProducts();
    const products = reduceProductStock(get().products, cart);
    set({ products });
    await saveProducts(products);
    return products;
  },
}));
