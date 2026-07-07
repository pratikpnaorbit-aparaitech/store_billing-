import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import DashboardScreen from "../screens/dashboard/DashboardScreen";
import ProductListScreen from "../screens/products/ProductListScreen";
import ScannerScreen from "../screens/scanner/ScannerScreen";
import OrderHistoryScreen from "../screens/orders/OrderHistoryScreen";
import ProfileScreen from "../screens/profile/ProfileScreen";
import CustomerScreen from "../screens/customers/CustomerScreen";

const Tab = createBottomTabNavigator();

export default function MainNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: "#0A46E4",
        tabBarInactiveTintColor: "#94A3B8",
        tabBarStyle: {
          height: 72,
          paddingBottom: 10,
          paddingTop: 8,
          borderTopWidth: 0,
          elevation: 12,
        },
        tabBarIcon: ({ color, size }) => {
          const icons = {
            Home: "home-outline",
            Products: "cube-outline",
            Scan: "scan-outline",
            Orders: "receipt-outline",
            Customers: "people-outline",
            Profile: "person-outline",
          };

          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={DashboardScreen} />
      <Tab.Screen name="Products" component={ProductListScreen} />
      <Tab.Screen name="Scan" component={ScannerScreen} />
      <Tab.Screen name="Orders" component={OrderHistoryScreen} />
      <Tab.Screen name="Customers" component={CustomerScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
