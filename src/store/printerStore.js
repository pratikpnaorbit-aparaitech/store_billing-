import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { normalizePrinter } from "../utils/printer/printerConfig";

export const usePrinterStore = create(persist((set) => ({
  printers: [],
  selectedId: null,
  addPrinter: (input) => {
    const printer = normalizePrinter(input);
    printer.id = String(Date.now()) + "-" + Math.random().toString(36).slice(2, 8);
    set((state) => ({ printers: [...state.printers, printer], selectedId: printer.id }));
    return printer;
  },
  selectPrinter: (selectedId) => set({ selectedId }),
  removePrinter: (id) => set((state) => {
    const printers = state.printers.filter((printer) => printer.id !== id);
    return { printers, selectedId: state.selectedId === id ? printers[0]?.id || null : state.selectedId };
  }),
}), { name: "smart-billing-printers-v1", storage: createJSONStorage(() => AsyncStorage) }));
