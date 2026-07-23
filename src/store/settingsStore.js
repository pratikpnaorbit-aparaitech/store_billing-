import { create } from "zustand";
import { loadSettings, saveSettings } from "../utils/storage";

const defaults = { gstRate: 5, currency: "INR" };

export const useSettingsStore = create((set) => ({
  settings: defaults,
  hydrateSettings: async () => {
    const saved = await loadSettings();
    set({ settings: { ...defaults, ...(saved || {}) } });
  },
  updateSettings: async (updates) => {
    let next;
    set((state) => {
      next = { ...state.settings, ...updates };
      return { settings: next };
    });
    await saveSettings(next);
  },
}));
