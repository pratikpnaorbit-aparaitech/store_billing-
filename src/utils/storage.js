import AsyncStorage from "@react-native-async-storage/async-storage";

export const STORAGE_KEYS = {
  products: "SMART_BILLING_PRODUCTS",
  cart: "SMART_BILLING_CART",
  orders: "SMART_BILLING_ORDERS",
  customers: "SMART_BILLING_CUSTOMERS",
  settings: "SMART_BILLING_SETTINGS",
};

export async function saveJson(key, value) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn(`Unable to save ${key}`, error);
    return false;
  }
}

export async function loadJson(key, fallback = null) {
  try {
    const value = await AsyncStorage.getItem(key);
    if (!value) return fallback;
    return JSON.parse(value);
  } catch (error) {
    console.warn(`Unable to load ${key}`, error);
    return fallback;
  }
}

export const saveProducts = (products) => saveJson(STORAGE_KEYS.products, products);
export const loadProducts = () => loadJson(STORAGE_KEYS.products, null);
export const saveCart = (cart) => saveJson(STORAGE_KEYS.cart, cart);
export const loadCart = () => loadJson(STORAGE_KEYS.cart, []);
export const saveOrders = (orders) => saveJson(STORAGE_KEYS.orders, orders);
export const loadOrders = () => loadJson(STORAGE_KEYS.orders, []);
export const saveCustomers = (customers) => saveJson(STORAGE_KEYS.customers, customers);
export const loadCustomers = () => loadJson(STORAGE_KEYS.customers, null);
export const saveSettings = (settings) => saveJson(STORAGE_KEYS.settings, settings);
export const loadSettings = () => loadJson(STORAGE_KEYS.settings, null);

export async function clearBusinessData() {
  await AsyncStorage.multiRemove([
    STORAGE_KEYS.products,
    STORAGE_KEYS.cart,
    STORAGE_KEYS.orders,
    STORAGE_KEYS.customers,
  ]);
}
