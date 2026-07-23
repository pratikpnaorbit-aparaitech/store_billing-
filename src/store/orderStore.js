import { create } from "zustand";
import { loadOrders, saveOrders } from "../utils/storage";
import { createInvoiceNo } from "../utils/billing";
import { hasRemoteApi } from "../services/api";
import { createOrder, fetchOrders } from "../services/orderApi";

const normalize = (order) => ({ ...order, id: String(order.id || order._id), cart: order.cart || order.items || [] });

export const useOrderStore = create((set, get) => ({
  orders: [], loading: false, error: null,
  resetOrders: () => set({ orders: [], loading: false, error: null }),
  hydrateOrders: async () => {
    if (hasRemoteApi) {
      try {
        set({ loading: true, error: null });
        const orders = (await fetchOrders()).map(normalize);
        set({ orders, loading: false });
        await saveOrders(orders);
      } catch (error) {
        const cached = await loadOrders();
        set({ orders: Array.isArray(cached) ? cached.map(normalize) : [], loading: false, error: error.message });
      }
      return;
    }
    set({ orders: await loadOrders() });
  },
  refreshOrders: async () => {
    if (!hasRemoteApi) return get().orders;
    const orders = (await fetchOrders()).map(normalize);
    set({ orders, error: null });
    await saveOrders(orders);
    return orders;
  },
  addOrder: async (order) => {
    const savedOrder = hasRemoteApi
      ? normalize(await createOrder(order))
      : normalize({ ...order, id: order.id || `order-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, invoiceNo: order.invoiceNo || createInvoiceNo(), createdAt: order.createdAt || new Date().toISOString() });
    const orders = [savedOrder, ...get().orders];
    set({ orders });
    await saveOrders(orders);
    return savedOrder;
  },
  deleteOrder: async (id) => {
    if (hasRemoteApi) throw new Error("Cloud invoices cannot be deleted from the device.");
    const orders = get().orders.filter((order) => order.id !== id);
    set({ orders });
    await saveOrders(orders);
  },
}));
