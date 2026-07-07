import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

const CUSTOMER_KEY = "SMART_BILLING_CUSTOMERS";

const initialCustomers = [
  {
    id: "1",
    name: "Walk-in Customer",
    phone: "",
    totalOrders: 0,
    totalSpent: 0,
  },
];

export const useCustomerStore = create((set, get) => ({
  customers: initialCustomers,

  hydrateCustomers: async () => {
    const data = await AsyncStorage.getItem(CUSTOMER_KEY);
    if (data) set({ customers: JSON.parse(data) });
  },

  addCustomer: async (customer) => {
    const customers = [
      {
        id: Date.now().toString(),
        totalOrders: 0,
        totalSpent: 0,
        ...customer,
      },
      ...get().customers,
    ];

    set({ customers });
    await AsyncStorage.setItem(CUSTOMER_KEY, JSON.stringify(customers));
  },

  updateCustomerStats: async (customerId, amount) => {
    const customers = get().customers.map((c) =>
      c.id === customerId
        ? {
            ...c,
            totalOrders: Number(c.totalOrders || 0) + 1,
            totalSpent: Number(c.totalSpent || 0) + Number(amount || 0),
          }
        : c
    );

    set({ customers });
    await AsyncStorage.setItem(CUSTOMER_KEY, JSON.stringify(customers));
  },
}));
