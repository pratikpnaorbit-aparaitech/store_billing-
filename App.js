import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import AppNavigator from "./src/navigation/AppNavigator";
import { useProductStore } from "./src/store/productStore";
import { useCartStore } from "./src/store/cartStore";
import { useOrderStore } from "./src/store/orderStore";
import { useCustomerStore } from "./src/store/customerStore";
import { useAuthStore } from "./src/store/authStore";
import { useSettingsStore } from "./src/store/settingsStore";

export default function App() {
  const hydrateProducts = useProductStore((state) => state.hydrateProducts);
  const hydrateCart = useCartStore((state) => state.hydrateCart);
  const hydrateOrders = useOrderStore((state) => state.hydrateOrders);
  const hydrateCustomers = useCustomerStore((state) => state.hydrateCustomers);
  const hydrateAuth = useAuthStore((state) => state.hydrateAuth);
  const hydrateSettings = useSettingsStore((state) => state.hydrateSettings);
  const authReady = useAuthStore((state) => state.ready);
  const user = useAuthStore((state) => state.user);
  const resetProducts = useProductStore((state) => state.resetProducts);
  const resetCart = useCartStore((state) => state.resetCart);
  const resetOrders = useOrderStore((state) => state.resetOrders);
  const resetCustomers = useCustomerStore((state) => state.resetCustomers);

  useEffect(() => {
    hydrateAuth();
  }, [hydrateAuth]);

  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      resetProducts();
      resetCart();
      resetOrders();
      resetCustomers();
      return;
    }
    Promise.all([
      hydrateProducts(),
      hydrateCart(),
      hydrateOrders(),
      hydrateCustomers(),
      hydrateSettings(),
    ])
      .then(() => useCartStore.getState().reconcileCart(useProductStore.getState().products))
      .catch((error) => console.warn("App data hydration failed", error));
  }, [authReady, hydrateCart, hydrateCustomers, hydrateOrders, hydrateProducts, hydrateSettings, resetCart, resetCustomers, resetOrders, resetProducts, user]);

  return (
    <NavigationContainer>
      <AppNavigator />
    </NavigationContainer>
  );
}
