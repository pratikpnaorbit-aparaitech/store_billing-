import { create } from "zustand";
import { loadNotifications, saveNotifications } from "../utils/storage";

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  hydrated: false,
  hydrateNotifications: async () => {
    const notifications = await loadNotifications();
    set({ notifications: Array.isArray(notifications) ? notifications : [], hydrated: true });
  },
  addNotification: async (notification) => {
    const next = [{
      id: notification.id || `notification-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: notification.title,
      body: notification.body,
      type: notification.type || "info",
      data: notification.data || {},
      read: false,
      createdAt: notification.createdAt || new Date().toISOString(),
    }, ...get().notifications].slice(0, 100);
    set({ notifications: next });
    await saveNotifications(next);
  },
  markAllRead: async () => {
    const next = get().notifications.map((item) => ({ ...item, read: true }));
    set({ notifications: next });
    await saveNotifications(next);
  },
  clearNotifications: async () => {
    set({ notifications: [] });
    await saveNotifications([]);
  },
  resetNotifications: () => set({ notifications: [], hydrated: false }),
}));
