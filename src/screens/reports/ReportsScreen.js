import React, { useMemo } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";
import SalesChart from "../../components/analytics/SalesChart";
import TopProductCard from "../../components/analytics/TopProductCard";
import { useOrderStore } from "../../store/orderStore";
import { formatCurrency, getOrderAnalytics } from "../../utils/billing";

export default function ReportsScreen({ navigation }) {
  const orders = useOrderStore((state) => state.orders);
  const { stats, weekly, top, payments } = useMemo(() => {
    const analytics = getOrderAnalytics(orders);
    const days = Array.from({ length: 7 }, (_, offset) => dayjs().subtract(6 - offset, 'day'));
    const weeklyData = days.map((date) => ({ day: date.format('ddd'), amount: orders.filter((order) => dayjs(order.createdAt).isSame(date, 'day')).reduce((sum, order) => sum + Number(order.total || 0), 0) }));
    const sold = {}; const paymentCounts = { Cash: 0, UPI: 0, Card: 0 };
    orders.forEach((order) => { paymentCounts[order.payment] = (paymentCounts[order.payment] || 0) + 1; (order.cart || []).forEach((item) => { sold[item.id] = sold[item.id] || { id:item.id,name:item.name,sold:0 }; sold[item.id].sold += Number(item.quantity || 0); }); });
    return { stats: analytics, weekly: weeklyData, payments: paymentCounts, top: Object.values(sold).sort((a,b) => b.sold-a.sold).slice(0,5).map((item,index)=>({...item,rank:index+1})) };
  }, [orders]);
  return <ScrollView style={styles.screen} contentContainerStyle={styles.content}><View style={styles.header}><TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}><Ionicons name="arrow-back" size={22} color="#0F172A" /></TouchableOpacity><View><Text style={styles.title}>Reports</Text><Text style={styles.subtitle}>Live data from completed sales</Text></View></View><View style={styles.grid}><Metric label="Total sales" value={formatCurrency(stats.totalSales)} /><Metric label="Average bill" value={formatCurrency(stats.averageBill)} /><Metric label="Orders" value={stats.totalOrders} /><Metric label="Items sold" value={stats.productsSold} /></View><SalesChart data={weekly} /><Text style={styles.section}>Payment mix</Text><View style={styles.paymentCard}>{Object.entries(payments).map(([name,count])=><View key={name} style={styles.paymentRow}><Text style={styles.paymentName}>{name}</Text><Text style={styles.paymentValue}>{count} orders</Text></View>)}</View><Text style={styles.section}>Top products</Text>{top.length ? top.map((item)=><TopProductCard key={item.id} product={item}/>) : <Text style={styles.empty}>Complete a sale to see product rankings.</Text>}</ScrollView>;
}
function Metric({label,value}){return <View style={styles.metric}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>}
const styles=StyleSheet.create({screen:{flex:1,backgroundColor:'#F8FAFC'},content:{padding:20,paddingTop:48,paddingBottom:50},header:{flexDirection:'row',alignItems:'center',marginBottom:22},back:{width:44,height:44,borderRadius:16,backgroundColor:'#FFF',alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'#E2E8F0',marginRight:14},title:{fontSize:28,fontWeight:'900',color:'#0F172A'},subtitle:{color:'#64748B',marginTop:3},grid:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',marginBottom:8},metric:{width:'48%',backgroundColor:'#FFF',borderRadius:20,padding:16,borderWidth:1,borderColor:'#E2E8F0',marginBottom:12},metricValue:{fontSize:20,fontWeight:'900',color:'#0A46E4'},metricLabel:{color:'#64748B',fontWeight:'700',fontSize:12,marginTop:5},section:{fontSize:19,fontWeight:'900',color:'#0F172A',marginTop:24,marginBottom:12},paymentCard:{backgroundColor:'#FFF',borderRadius:22,padding:18,borderWidth:1,borderColor:'#E2E8F0'},paymentRow:{flexDirection:'row',justifyContent:'space-between',paddingVertical:8},paymentName:{fontWeight:'800',color:'#0F172A'},paymentValue:{fontWeight:'700',color:'#64748B'},empty:{color:'#64748B',textAlign:'center',paddingVertical:30}});
