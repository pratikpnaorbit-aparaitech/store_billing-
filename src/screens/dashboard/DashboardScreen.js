import React from "react";
import { ScrollView, View, StyleSheet, Text } from "react-native";
import StatsCard from "../../components/analytics/StatsCard";
import SalesChart from "../../components/analytics/SalesChart";
import TopProductCard from "../../components/analytics/TopProductCard";
import { weeklySales } from "../../data/analyticsData";
import { useOrderStore } from "../../store/orderStore";

import AppHeader from "../../components/common/AppHeader";
import SectionHeader from "../../components/common/SectionHeader";
import RevenueCard from "../../components/cards/RevenueCard";
import QuickActionCard from "../../components/cards/QuickActionCard";
import StatCard from "../../components/cards/StatCard";
import RecentBillCard from "../../components/cards/RecentBillCard";

export default function DashboardScreen({ navigation }) {
  const orders = useOrderStore((state) => state.orders);

  const totalSales = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const totalOrders = orders.length;
  const productsSold = orders.reduce(
    (sum, order) =>
      sum + (order.cart || []).reduce((qty, item) => qty + Number(item.quantity || 0), 0),
    0
  );
  const avgBill = totalOrders > 0 ? Math.round(totalSales / totalOrders) : 0;

  const analyticsStats = [
    {
      id: "sales",
      title: "Total Sales",
      value: `₹${totalSales}`,
      icon: "trending-up-outline",
      color: "#0A46E4",
    },
    {
      id: "orders",
      title: "Orders",
      value: `${totalOrders}`,
      icon: "receipt-outline",
      color: "#22C55E",
    },
    {
      id: "sold",
      title: "Products Sold",
      value: `${productsSold}`,
      icon: "cube-outline",
      color: "#F59E0B",
    },
    {
      id: "avg",
      title: "Avg Bill",
      value: `₹${avgBill}`,
      icon: "card-outline",
      color: "#8B5CF6",
    },
  ];

  const soldMap = {};

  orders.forEach((order) => {
    (order.cart || []).forEach((item) => {
      if (!soldMap[item.name]) {
        soldMap[item.name] = { id: item.id, name: item.name, sold: 0 };
      }
      soldMap[item.name].sold += Number(item.quantity || 0);
    });
  });

  const topProducts = Object.values(soldMap)
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 3)
    .map((item, index) => ({ ...item, rank: index + 1 }));

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <AppHeader name="Vivek" />

      <RevenueCard
        revenue="₹15,420"
        growth="+12.6%"
        orders="28"
        customers="31"
      />

      <SectionHeader title="Quick Actions" />
      <View style={styles.quickGrid}>
        <QuickActionCard
          icon="scan-outline"
          title="Scan Product"
          onPress={() => navigation.navigate("Scan")}
        />
        <QuickActionCard
          icon="cube-outline"
          title="Products"
          onPress={() => navigation.navigate("Products")}
        />
        <QuickActionCard
          icon="receipt-outline"
          title="Orders"
          onPress={() => navigation.navigate("Orders")}
        />
        <QuickActionCard icon="bar-chart-outline" title="Reports" />
      </View>

      <SectionHeader title="Today's Overview" />
      <View style={styles.statsGrid}>
        <StatCard
          icon="bag-check-outline"
          title="Orders"
          value="28"
          color="#0A46E4"
        />
        <StatCard
          icon="cash-outline"
          title="Revenue"
          value="₹15k"
          color="#22C55E"
        />
      </View>

      <View style={styles.statsGrid}>
        <StatCard
          icon="time-outline"
          title="Pending"
          value="02"
          color="#F59E0B"
        />
        <StatCard
          icon="warning-outline"
          title="Low Stock"
          value="06"
          color="#EF4444"
        />
      </View>

      <SectionHeader title="Recent Bills" action="View all" />

      <RecentBillCard
        billNo="#1056"
        customer="Walk-in Customer"
        amount="₹420"
        payment="Cash"
      />
      <RecentBillCard
        billNo="#1055"
        customer="Rahul Store"
        amount="₹840"
        payment="UPI"
      />
      <RecentBillCard
        billNo="#1054"
        customer="Walk-in Customer"
        amount="₹350"
        payment="Cash"
      />
    
      <View style={{ marginTop: 24 }}>
        <View style={{
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "space-between",
        }}>
          {analyticsStats.map((item) => (
            <StatsCard key={item.id} {...item} />
          ))}
        </View>

        <View style={{ marginTop: 20 }}>
          <SalesChart data={weeklySales} />
        </View>

        <Text style={{
          fontSize: 20,
          fontWeight: "900",
          color: "#0F172A",
          marginTop: 24,
          marginBottom: 14,
        }}>
          Top Selling Products
        </Text>

        {topProducts.map((item) => (
          <TopProductCard key={item.id} product={item} />
        ))}
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 110,
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  statsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
});
