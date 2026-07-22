import { create } from "zustand";
import { loadCustomers, saveCustomers } from "../utils/storage";
import { hasRemoteApi } from "../services/api";
import { createCustomer, deleteCustomer as deleteCustomerApi, fetchCustomers } from "../services/customerApi";

const walkInCustomer = { id: "walk-in", name: "Walk-in Customer", phone: "", totalOrders: 0, totalSpent: 0 };
const normalize = (customer) => ({ ...customer, id: String(customer.id || customer._id) });

export const useCustomerStore = create((set, get) => ({
  customers: [walkInCustomer], loading: false, error: null,
  resetCustomers: () => set({ customers: [walkInCustomer], loading: false, error: null }),
  hydrateCustomers: async () => {
    if (hasRemoteApi) {
      try {
        set({ loading: true, error: null });
        const customers = [walkInCustomer, ...(await fetchCustomers()).map(normalize)];
        set({ customers, loading: false });
        await saveCustomers(customers);
      } catch (error) {
        const cached = await loadCustomers();
        set({
          customers: Array.isArray(cached) && cached.length ? cached.map(normalize) : [walkInCustomer],
          loading: false,
          error: error.message,
        });
      }
      return;
    }
    const saved = await loadCustomers();
    set({ customers: Array.isArray(saved) && saved.length ? saved : [walkInCustomer] });
  },
  refreshCustomers: async () => {
    if (!hasRemoteApi) return get().customers;
    const customers = [walkInCustomer, ...(await fetchCustomers()).map(normalize)];
    set({ customers, error: null });
    await saveCustomers(customers);
    return customers;
  },
  addCustomer: async (customer) => {
    const phone = customer.phone.trim();
    if (phone && get().customers.some((item) => item.phone === phone)) throw new Error("A customer with this mobile number already exists.");
    const savedCustomer = hasRemoteApi ? normalize(await createCustomer({ name: customer.name.trim(), phone })) : { id: `customer-${Date.now()}`, name: customer.name.trim(), phone, totalOrders: 0, totalSpent: 0 };
    const customers = [savedCustomer, ...get().customers];
    set({ customers });
    await saveCustomers(customers);
    return savedCustomer;
  },
  updateCustomerStats: async (customerId, amount) => {
    if (hasRemoteApi) return get().refreshCustomers();
    const customers = get().customers.map((customer) => customer.id === customerId ? { ...customer, totalOrders: Number(customer.totalOrders || 0) + 1, totalSpent: Number(customer.totalSpent || 0) + Number(amount || 0) } : customer);
    set({ customers });
    await saveCustomers(customers);
  },
  deleteCustomer: async (id) => {
    if (id === "walk-in") return;
    if (hasRemoteApi) await deleteCustomerApi(id);
    const customers = get().customers.filter((customer) => customer.id !== id);
    set({ customers });
    await saveCustomers(customers);
  },
}));
