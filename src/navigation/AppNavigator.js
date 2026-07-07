import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import SplashScreen from "../screens/auth/SplashScreen";
import LoginScreen from "../screens/auth/LoginScreen";
import MainNavigator from "./MainNavigator";
import AddProductScreen from "../screens/products/AddProductScreen";
import BillingScreen from "../screens/billing/BillingScreen";
import ReceiptScreen from "../screens/receipt/ReceiptScreen";
import ScannerScreen from "../screens/scanner/ScannerScreen";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Main" component={MainNavigator} />
      <Stack.Screen name="AddProduct" component={AddProductScreen} />
      <Stack.Screen name="Billing" component={BillingScreen} />
      <Stack.Screen name="Receipt" component={ReceiptScreen} />
      <Stack.Screen name="BarcodeScanner" component={ScannerScreen} />
    </Stack.Navigator>
  );
}
