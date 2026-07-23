import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";
import { useCartStore } from "../../store/cartStore";
import { useProductStore } from "../../store/productStore";
import { useOrderStore } from "../../store/orderStore";
import { useCustomerStore } from "../../store/customerStore";
import { generateAndShareReceiptPDF } from "../../utils/pdfGenerator";
import { buildThermalReceipt } from "../../utils/printer/thermalReceipt";
import { createInvoiceNo, formatCurrency } from "../../utils/billing";
import { hasRemoteApi } from "../../services/api";

export default function ReceiptScreen({ navigation, route }) {
  const cart = useCartStore((state) => state.cart);
  const clearCart = useCartStore((state) => state.clearCart);
  const reduceStock = useProductStore((state) => state.reduceStock);
  const addOrder = useOrderStore((state) => state.addOrder);
  const updateCustomerStats = useCustomerStore((state) => state.updateCustomerStats);
  const [busy, setBusy] = useState(false);
  const [invoiceNo] = useState(() => createInvoiceNo());
  const [createdAt] = useState(() => new Date().toISOString());
  const data = { cart, invoiceNo, date: dayjs(createdAt).format("DD MMM YYYY, hh:mm A"), payment:"Cash", subtotal:0, gstRate:5, gst:0, discount:0, total:0, customer:{id:'walk-in',name:'Walk-in Customer'}, ...(route.params || {}) };

  const sharePDF = async () => { try { await generateAndShareReceiptPDF(data); } catch (error) { Alert.alert("PDF failed", error.message); } };
  const previewThermalReceipt = () => Alert.alert("Thermal Receipt Preview", buildThermalReceipt(data));
  const finishSale = async () => {
    if (busy || !cart.length) return;
    setBusy(true);
    try {
      await addOrder({ ...data, createdAt, customer: data.customer });
      if (hasRemoteApi) {
        await Promise.allSettled([
          reduceStock(cart),
          updateCustomerStats(data.customer?.id || "walk-in", data.total),
        ]);
      } else {
        await reduceStock(cart);
        await updateCustomerStats(data.customer?.id || "walk-in", data.total);
      }
      await clearCart();
      navigation.reset({ index: 0, routes: [{ name: "Main" }] });
    } catch (error) { setBusy(false); Alert.alert("Sale not completed", error.message); }
  };

  return <View style={styles.screen}><View style={styles.header}><TouchableOpacity onPress={()=>navigation.goBack()} style={styles.back}><Ionicons name="arrow-back" size={22} color="#0F172A"/></TouchableOpacity><Text style={styles.title}>Receipt</Text></View><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}><View style={styles.receipt}><Text style={styles.store}>SMART BILLING</Text><Text style={styles.sub}>Scan • Bill • Print</Text><View style={styles.line}/><Info label="Invoice" value={invoiceNo}/><Info label="Date" value={data.date}/><Info label="Customer" value={data.customer?.name || 'Walk-in Customer'}/><Info label="Payment" value={data.payment}/><View style={styles.line}/>{cart.map((item)=><View style={styles.item} key={item.id}><View style={styles.flex}><Text style={styles.itemName}>{item.name}</Text><Text style={styles.itemMeta}>{item.quantity} × {formatCurrency(item.price)}</Text></View><Text style={styles.itemAmount}>{formatCurrency(Number(item.price)*item.quantity)}</Text></View>)}<View style={styles.line}/><Info label="Subtotal" value={formatCurrency(data.subtotal)}/><Info label={`GST ${data.gstRate}%`} value={formatCurrency(data.gst)}/><Info label="Discount" value={formatCurrency(data.discount)}/><View style={styles.total}><Text style={styles.totalLabel}>TOTAL</Text><Text style={styles.totalValue}>{formatCurrency(data.total)}</Text></View><Text style={styles.thanks}>Thank you ❤️</Text></View><TouchableOpacity style={styles.primary} onPress={sharePDF}><Ionicons name="share-outline" size={20} color="#FFF"/><Text style={styles.primaryText}>Share PDF Receipt</Text></TouchableOpacity><TouchableOpacity style={styles.secondary} onPress={previewThermalReceipt}><Text style={styles.secondaryText}>Thermal Preview</Text></TouchableOpacity><TouchableOpacity style={styles.complete} onPress={finishSale} disabled={busy}><Text style={styles.primaryText}>{busy?'Saving Sale...':'Complete Sale'}</Text></TouchableOpacity></ScrollView></View>;
}
function Info({label,value}){return <View style={styles.info}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{value}</Text></View>}
const styles=StyleSheet.create({screen:{flex:1,backgroundColor:'#F8FAFC'},header:{paddingTop:44,paddingHorizontal:20,paddingBottom:16,flexDirection:'row',alignItems:'center'},back:{width:44,height:44,borderRadius:16,backgroundColor:'#FFF',alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'#E2E8F0',marginRight:14},title:{fontSize:28,fontWeight:'900',color:'#0F172A'},content:{padding:20,paddingBottom:45},receipt:{backgroundColor:'#FFF',borderRadius:24,padding:22,borderWidth:1,borderColor:'#E2E8F0'},store:{textAlign:'center',fontSize:22,fontWeight:'900',letterSpacing:1,color:'#0F172A'},sub:{textAlign:'center',marginTop:4,color:'#64748B',fontWeight:'700'},line:{height:1,backgroundColor:'#E2E8F0',marginVertical:16},info:{flexDirection:'row',justifyContent:'space-between',marginBottom:9,gap:16},infoLabel:{color:'#64748B',fontWeight:'700'},infoValue:{color:'#0F172A',fontWeight:'900',flexShrink:1,textAlign:'right'},item:{flexDirection:'row',justifyContent:'space-between',marginBottom:14},flex:{flex:1},itemName:{fontWeight:'900',color:'#0F172A'},itemMeta:{marginTop:4,color:'#64748B',fontSize:12},itemAmount:{fontWeight:'900',color:'#0A46E4'},total:{marginTop:14,borderRadius:18,backgroundColor:'#0F172A',padding:16,flexDirection:'row',justifyContent:'space-between'},totalLabel:{color:'#FFF',fontWeight:'900',fontSize:16},totalValue:{color:'#FFF',fontWeight:'900',fontSize:20},thanks:{textAlign:'center',marginTop:18,color:'#64748B',fontWeight:'800'},primary:{marginTop:18,height:56,borderRadius:18,backgroundColor:'#0A46E4',alignItems:'center',justifyContent:'center',flexDirection:'row',gap:8},complete:{marginTop:12,height:56,borderRadius:18,backgroundColor:'#16A34A',alignItems:'center',justifyContent:'center'},primaryText:{color:'#FFF',fontWeight:'900'},secondary:{marginTop:12,height:54,borderRadius:18,backgroundColor:'#FFF',borderWidth:1,borderColor:'#E2E8F0',alignItems:'center',justifyContent:'center'},secondaryText:{color:'#0F172A',fontWeight:'900'}});
