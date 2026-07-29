import { create } from "zustand";
import { getLocales } from "expo-localization";
import { loadSettings, saveSettings } from "../utils/storage";

const deviceLanguage = () => {
  const code = getLocales()?.[0]?.languageCode;
  return ["en", "hi", "mr"].includes(code) ? code : "en";
};
const defaults = {
  gstRate: 5,
  currency: "INR",
  language: deviceLanguage(),
  sharedCatalogueEnabled: true,
};

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
