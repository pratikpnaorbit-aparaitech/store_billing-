import React from "react";
import { ScrollView, View, StyleSheet } from "react-native";

import AppHeader from "../../components/common/AppHeader";
import SectionHeader from "../../components/common/SectionHeader";
import RevenueCard from "../../components/cards/RevenueCard";
import QuickActionCard from "../../components/cards/QuickActionCard";
import StatCard from "../../components/cards/StatCard";
import RecentBillCard from "../../components/cards/RecentBillCard";

export default function DashboardScreen({ navigation }) {
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
