import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import AppNavigator from "./src/navigation/AppNavigator";
import { useProductStore } from "./src/store/productStore";
import { useCartStore } from "./src/store/cartStore";
import { useOrderStore } from "./src/store/orderStore";

export default function App() {
  const hydrateProducts = useProductStore((state) => state.hydrateProducts);
  const hydrateCart = useCartStore((state) => state.hydrateCart);
  const hydrateOrders = useOrderStore((state) => state.hydrateOrders);

  useEffect(() => {
    hydrateProducts();
    hydrateCart();
    hydrateOrders();
  }, []);

  return (
    <NavigationContainer>
      <AppNavigator />
    </NavigationContainer>
  );
}
