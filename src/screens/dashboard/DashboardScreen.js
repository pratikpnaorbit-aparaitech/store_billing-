import React, { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import dayjs from "dayjs";
import AppHeader from "../../components/common/AppHeader";
import SectionHeader from "../../components/common/SectionHeader";
import RevenueCard from "../../components/cards/RevenueCard";
import QuickActionCard from "../../components/cards/QuickActionCard";
import StatCard from "../../components/cards/StatCard";
import RecentBillCard from "../../components/cards/RecentBillCard";
import SalesChart from "../../components/analytics/SalesChart";
import TopProductCard from "../../components/analytics/TopProductCard";
import { useOrderStore } from "../../store/orderStore";
import { useProductStore } from "../../store/productStore";
import { useCustomerStore } from "../../store/customerStore";
import { useAuthStore } from "../../store/authStore";
import { formatCurrency, getOrderAnalytics } from "../../utils/billing";
import SubscriptionBanner from "../../components/subscription/SubscriptionBanner";

export default function DashboardScreen({ navigation }) {
  const orders = useOrderStore((state) => state.orders);
  const products = useProductStore((state) => state.products);
  const customers = useCustomerStore((state) => state.customers);
  const user = useAuthStore((state) => state.user);
  const dashboard = useMemo(() => {
    const stats = getOrderAnalytics(orders, products);
    const weekly = Array.from({ length: 7 }, (_, index) => dayjs().subtract(6 - index, "day")).map((date) => ({ day: date.format("ddd"), amount: orders.filter((order) => dayjs(order.createdAt).isSame(date, "day")).reduce((sum, order) => sum + Number(order.total || 0), 0) }));
    const sold = {};
    orders.forEach((order) => (order.cart || []).forEach((item) => { sold[item.id] = sold[item.id] || { id: item.id, name: item.name, sold: 0 }; sold[item.id].sold += Number(item.quantity || 0); }));
    const top = Object.values(sold).sort((a, b) => b.sold - a.sold).slice(0, 3).map((item, index) => ({ ...item, rank: index + 1 }));
    const today = orders.filter((order) => dayjs(order.createdAt).isSame(dayjs(), "day"));
    return { stats, weekly, top, todaySales: today.reduce((sum, order) => sum + Number(order.total || 0), 0), todayOrders: today.length };
  }, [orders, products]);

  return <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <AppHeader name={user?.name || "User"} onNotifications={() => navigation.navigate("Products")} />
    <SubscriptionBanner onPress={() => navigation.getParent()?.navigate("ManageSubscription", { migration: true })} />
    <RevenueCard revenue={formatCurrency(dashboard.todaySales)} growth="Live totals" orders={String(dashboard.todayOrders)} customers={String(Math.max(0, customers.length - 1))} />
    <SectionHeader title="Quick Actions" /><View style={styles.quick}><QuickActionCard icon="scan-outline" title="Scan Product" onPress={() => navigation.navigate("Scan")} /><QuickActionCard icon="cube-outline" title="Products" onPress={() => navigation.navigate("Products")} /><QuickActionCard icon="receipt-outline" title="Orders" onPress={() => navigation.navigate("Orders")} /><QuickActionCard icon="bar-chart-outline" title="Reports" onPress={() => navigation.getParent()?.navigate("Reports")} /></View>
    <SectionHeader title="Business Overview" /><View style={styles.stats}><StatCard icon="bag-check-outline" title="Orders" value={String(dashboard.stats.totalOrders)} color="#0A46E4" /><StatCard icon="cash-outline" title="Revenue" value={formatCurrency(dashboard.stats.totalSales)} color="#22C55E" /></View><View style={styles.stats}><StatCard icon="cube-outline" title="Items Sold" value={String(dashboard.stats.productsSold)} color="#8B5CF6" /><StatCard icon="warning-outline" title="Low Stock" value={String(dashboard.stats.lowStock)} color="#EF4444" /></View>
    <SectionHeader title="Recent Bills" />{orders.slice(0, 3).map((order) => <RecentBillCard key={order.id} billNo={order.invoiceNo} customer={order.customer?.name || "Walk-in Customer"} amount={formatCurrency(order.total)} payment={order.payment} />)}{!orders.length ? <Text style={styles.empty}>No completed bills yet.</Text> : null}
    <View style={styles.block}><SalesChart data={dashboard.weekly} /><Text style={styles.sectionTitle}>Top Selling Products</Text>{dashboard.top.length ? dashboard.top.map((item) => <TopProductCard key={item.id} product={item} />) : <Text style={styles.empty}>Sales data will appear after the first bill.</Text>}</View>
  </ScrollView>;
}
const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: "#F8FAFC" }, content: { paddingHorizontal: 20, paddingBottom: 110 }, quick: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }, stats: { flexDirection: "row", gap: 12, marginBottom: 12 }, empty: { color: "#64748B", textAlign: "center", paddingVertical: 22 }, block: { marginTop: 24 }, sectionTitle: { fontSize: 20, fontWeight: "900", color: "#0F172A", marginTop: 24, marginBottom: 14 } });
