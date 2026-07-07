import { create } from "zustand";
import { loadCart, saveCart } from "../utils/storage";

export const useCartStore = create((set, get) => ({
  cart: [],

  hydrateCart: async () => {
    const saved = await loadCart();
    if (saved) set({ cart: saved });
  },

  addToCart: (product) => {
    let cart = [...get().cart];
    const index = cart.findIndex((i) => i.id === product.id);

    if (index >= 0) {
      cart[index] = { ...cart[index], quantity: cart[index].quantity + 1 };
    } else {
      cart.unshift({ ...product, quantity: 1 });
    }

    set({ cart });
    saveCart(cart);
  },

  increaseQty: (id) => {
    const cart = get().cart.map((i) =>
      i.id === id ? { ...i, quantity: i.quantity + 1 } : i
    );

    set({ cart });
    saveCart(cart);
  },

  decreaseQty: (id) => {
    const cart = get()
      .cart
      .map((i) =>
        i.id === id ? { ...i, quantity: i.quantity - 1 } : i
      )
      .filter((i) => i.quantity > 0);

    set({ cart });
    saveCart(cart);
  },

  removeItem: (id) => {
    const cart = get().cart.filter((i) => i.id !== id);
    set({ cart });
    saveCart(cart);
  },

  clearCart: () => {
    set({ cart: [] });
    saveCart([]);
  },
}));
