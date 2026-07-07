import { create } from "zustand";

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

export const useProductStore = create((set) => ({
  products: initialProducts,

  addProduct: (product) =>
    set((state) => ({
      products: [
        {
          id: Date.now().toString(),
          ...product,
        },
        ...state.products,
      ],
    })),

  updateProduct: (id, updatedProduct) =>
    set((state) => ({
      products: state.products.map((item) =>
        item.id === id ? { ...item, ...updatedProduct } : item
      ),
    })),

  deleteProduct: (id) =>
    set((state) => ({
      products: state.products.filter((item) => item.id !== id),
    })),
}));
