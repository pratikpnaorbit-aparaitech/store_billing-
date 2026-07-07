import { create } from "zustand";
import { saveProducts } from "../utils/storage";
import {
  fetchProducts,
  createProduct,
  updateProduct as updateProductApi,
  deleteProduct as deleteProductApi,
} from "../services/productApi";

export const useProductStore = create((set, get) => ({
  products: [],
  loading: false,
  error: null,

  hydrateProducts: async () => {
    try {
      set({ loading: true, error: null });
      const products = await fetchProducts();
      const normalized = products.map((p) => ({
        id: p._id,
        ...p,
      }));

      set({ products: normalized, loading: false });
      saveProducts(normalized);
    } catch (err) {
      set({
        loading: false,
        error: err.message || "Failed to load products",
      });
    }
  },

  addProduct: async (product) => {
    const created = await createProduct(product);
    const normalized = { id: created._id, ...created };

    const products = [normalized, ...get().products];
    set({ products });
    saveProducts(products);
  },

  updateProduct: async (id, updatedProduct) => {
    const updated = await updateProductApi(id, updatedProduct);
    const normalized = { id: updated._id, ...updated };

    const products = get().products.map((item) =>
      item.id === id ? normalized : item
    );

    set({ products });
    saveProducts(products);
  },

  deleteProduct: async (id) => {
    await deleteProductApi(id);

    const products = get().products.filter((item) => item.id !== id);
    set({ products });
    saveProducts(products);
  },

  reduceStock: (cart) => {
    const products = get().products.map((product) => {
      const sold = cart.find((i) => i.id === product.id);

      if (!sold) return product;

      return {
        ...product,
        stock: Math.max(0, Number(product.stock) - Number(sold.quantity)),
      };
    });

    set({ products });
    saveProducts(products);
  },
}));
