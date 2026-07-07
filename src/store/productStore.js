import { create } from "zustand";
import { loadProducts, saveProducts } from "../utils/storage";

const initialProducts = [
  {
    id: "1",
    name: "Amul Milk",
    category: "Dairy",
    price: 34,
    stock: 25,
    barcode: "8901234567890",
    unit: "500 ml",
    image: null,
  },
  {
    id: "2",
    name: "Coca Cola",
    category: "Drinks",
    price: 40,
    stock: 120,
    barcode: "8901764012345",
    unit: "750 ml",
    image: null,
  },
  {
    id: "3",
    name: "KitKat",
    category: "Snacks",
    price: 20,
    stock: 84,
    barcode: "8901058844552",
    unit: "1 pc",
    image: null,
  },
];

export const useProductStore = create((set, get) => ({
  products: initialProducts,

  hydrateProducts: async () => {
    const savedProducts = await loadProducts();
    if (savedProducts) {
      set({ products: savedProducts });
    }
  },

  addProduct: (product) => {
    const products = [
      {
        id: Date.now().toString(),
        ...product,
      },
      ...get().products,
    ];

    set({ products });
    saveProducts(products);
  },

  updateProduct: (id, updatedProduct) => {
    const products = get().products.map((item) =>
      item.id === id ? { ...item, ...updatedProduct } : item
    );

    set({ products });
    saveProducts(products);
  },

  deleteProduct: (id) => {
    const products = get().products.filter((item) => item.id !== id);
    set({ products });
    saveProducts(products);
  },
}));
