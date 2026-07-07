import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ORDER_KEY = "SMART_BILLING_ORDERS";

export const useOrderStore = create((set, get) => ({
  orders: [],

  hydrateOrders: async () => {
    const data = await AsyncStorage.getItem(ORDER_KEY);
    if (data) set({ orders: JSON.parse(data) });
  },

  addOrder: async (order) => {
    const orders = [
      {
        id: Date.now().toString(),
        invoiceNo: `INV-${Date.now().toString().slice(-6)}`,
        createdAt: new Date().toISOString(),
        ...order,
      },
      ...get().orders,
    ];

    set({ orders });
    await AsyncStorage.setItem(ORDER_KEY, JSON.stringify(orders));
  },
}));
