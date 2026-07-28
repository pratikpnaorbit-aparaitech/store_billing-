import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import SplashScreen from "../screens/auth/SplashScreen";
import LoginScreen from "../screens/auth/LoginScreen";
import SignUpScreen from "../screens/auth/SignUpScreen";
import ForgotPasswordScreen from "../screens/auth/ForgotPasswordScreen";
import MainNavigator from "./MainNavigator";
import AddProductScreen from "../screens/products/AddProductScreen";
import BillingScreen from "../screens/billing/BillingScreen";
import ReceiptScreen from "../screens/receipt/ReceiptScreen";
import ScannerScreen from "../screens/scanner/ScannerScreen";
import ReportsScreen from "../screens/reports/ReportsScreen";
import SalesInsightsScreen from "../screens/reports/SalesInsightsScreen";
import SubscriptionScreen from "../screens/subscription/SubscriptionScreen";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="Main" component={MainNavigator} />
      <Stack.Screen name="AddProduct" component={AddProductScreen} />
      <Stack.Screen name="Billing" component={BillingScreen} />
      <Stack.Screen name="Receipt" component={ReceiptScreen} />
      <Stack.Screen name="BarcodeScanner" component={ScannerScreen} />
      <Stack.Screen name="Reports" component={ReportsScreen} />
      <Stack.Screen name="SalesInsights" component={SalesInsightsScreen} />
      <Stack.Screen name="ManageSubscription" component={SubscriptionScreen} />
    </Stack.Navigator>
  );
}
