import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import AppNavigator from "./src/navigation/AppNavigator";
import { useProductStore } from "./src/store/productStore";
import { useCartStore } from "./src/store/cartStore";
import { useOrderStore } from "./src/store/orderStore";
import { useCustomerStore } from "./src/store/customerStore";

export default function App() {
  const hydrateProducts = useProductStore((state) => state.hydrateProducts);
  const hydrateCart = useCartStore((state) => state.hydrateCart);
  const hydrateOrders = useOrderStore((state) => state.hydrateOrders);
  const hydrateCustomers = useCustomerStore((state) => state.hydrateCustomers);

  useEffect(() => {
    hydrateProducts();
    hydrateCart();
    hydrateOrders();
    hydrateCustomers();
  }, []);

  return (
    <NavigationContainer>
      <AppNavigator />
    </NavigationContainer>
  );
}
