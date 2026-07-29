import { create } from "zustand";
import { loadCart, saveCart } from "../utils/storage";
import { addCartItem, setCartItemQuantity } from "../utils/billing";

export const useCartStore = create((set, get) => ({
  cart: [],
  resetCart: () => set({ cart: [] }),

  hydrateCart: async () => set({ cart: await loadCart() }),

  reconcileCart: async (products) => {
    const byId = new Map(products.map((product) => [product.id, product]));
    const cart = get().cart
      .filter((item) => byId.has(item.id) && Number(byId.get(item.id).stock) > 0)
      .map((item) => {
        const product = byId.get(item.id);
        return { ...item, ...product, quantity: Math.min(Number(item.quantity), Number(product.stock)) };
      });
    set({ cart });
    await saveCart(cart);
  },

  addToCart: (product) => {
    const result = addCartItem(get().cart, product);
    if (!result.ok) return result;
    set({ cart: result.cart });
    saveCart(result.cart);
    return result;
  },

  increaseQty: (id) => {
    const item = get().cart.find((entry) => entry.id === id);
    if (!item || item.quantity >= Number(item.stock || 0)) return false;
    const cart = get().cart.map((entry) => entry.id === id ? { ...entry, quantity: entry.quantity + 1 } : entry);
    set({ cart });
    saveCart(cart);
    return true;
  },

  decreaseQty: (id) => {
    const cart = get().cart
      .map((item) => item.id === id ? { ...item, quantity: item.quantity - 1 } : item)
      .filter((item) => item.quantity > 0);
    set({ cart });
    saveCart(cart);
  },

  setQuantity: (id, quantity) => {
    const result = setCartItemQuantity(get().cart, id, quantity);
    if (result.cart !== get().cart) {
      set({ cart: result.cart });
      saveCart(result.cart);
    }
    return result;
  },

  removeItem: (id) => {
    const cart = get().cart.filter((item) => item.id !== id);
    set({ cart });
    saveCart(cart);
  },

  clearCart: async () => {
    set({ cart: [] });
    await saveCart([]);
  },
}));
