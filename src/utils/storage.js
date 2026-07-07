import AsyncStorage from "@react-native-async-storage/async-storage";

const KEYS = {
  products: "SMART_BILLING_PRODUCTS",
  cart: "SMART_BILLING_CART",
};

export const saveProducts = async (products) => {
  await AsyncStorage.setItem(KEYS.products, JSON.stringify(products));
};

export const loadProducts = async () => {
  const data = await AsyncStorage.getItem(KEYS.products);
  return data ? JSON.parse(data) : null;
};

export const saveCart = async (cart) => {
  await AsyncStorage.setItem(KEYS.cart, JSON.stringify(cart));
};

export const loadCart = async () => {
  const data = await AsyncStorage.getItem(KEYS.cart);
  return data ? JSON.parse(data) : null;
};
