import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import AppNavigator from "./src/navigation/AppNavigator";
import { useProductStore } from "./src/store/productStore";
import { useCartStore } from "./src/store/cartStore";

export default function App() {
  const hydrateProducts = useProductStore((state) => state.hydrateProducts);
  const hydrateCart = useCartStore((state) => state.hydrateCart);

  useEffect(() => {
    hydrateProducts();
    hydrateCart();
  }, []);

  return (
    <NavigationContainer>
      <AppNavigator />
    </NavigationContainer>
  );
}
