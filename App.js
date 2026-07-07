import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import AppNavigator from "./src/navigation/AppNavigator";
import { useProductStore } from "./src/store/productStore";

export default function App() {
  const hydrateProducts = useProductStore((state) => state.hydrateProducts);

  useEffect(() => {
    hydrateProducts();
  }, []);

  return (
    <NavigationContainer>
      <AppNavigator />
    </NavigationContainer>
  );
}
