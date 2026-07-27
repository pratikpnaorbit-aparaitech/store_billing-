import React from "react";
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppCard from "../cards/AppCard";
import { useCartStore } from "../../store/cartStore";
import { useProductStore } from "../../store/productStore";
import { formatCurrency } from "../../utils/billing";
import { isManualBarcode } from "../../utils/products";

export default function ProductCard({ product, navigation }) {
  const addToCart = useCartStore((state) => state.addToCart);
  const removeItem = useCartStore((state) => state.removeItem);
  const deleteProduct = useProductStore((state) => state.deleteProduct);
  const stock = Number(product.stock || 0);
  const out = stock <= 0;
  const low = stock > 0 && stock <= 10;
  const remove = () => Alert.alert("Delete product?", product.name, [
    { text: "Cancel", style: "cancel" },
    {
      text: "Delete",
      style: "destructive",
      onPress: async () => {
        try {
          await deleteProduct(product.id);
          removeItem(product.id);
        } catch (error) {
          Alert.alert("Could not delete product", error.message);
        }
      },
    },
  ]);
  const add = () => { const result = addToCart(product); if (!result.ok) Alert.alert("Cannot add", result.message); };

  return <AppCard style={styles.card}><View style={styles.row}>{product.image ? <Image source={{uri:product.image}} style={styles.image}/> : <View style={styles.icon}><Ionicons name={isManualBarcode(product.barcode)?"basket-outline":"cube-outline"} size={24} color="#0A46E4"/></View>}<View style={styles.info}><Text style={styles.name}>{product.name}</Text><Text style={styles.meta}>{product.category} • {product.unit}</Text><Text style={styles.barcode}>{isManualBarcode(product.barcode)?"No barcode · Manual add":`Barcode: ${product.barcode}`}</Text></View><View style={styles.right}><Text style={styles.price}>{formatCurrency(product.price)}</Text><Text style={[styles.stock,low&&styles.low,out&&styles.out]}>{out?'Out of stock':`Stock ${stock}`}</Text>{low?<Text style={styles.low}>LOW STOCK</Text>:null}</View></View><View style={styles.actions}><TouchableOpacity style={styles.iconAction} onPress={()=>navigation.navigate('AddProduct',{product})}><Ionicons name="create-outline" size={19} color="#0A46E4"/></TouchableOpacity><TouchableOpacity style={styles.iconAction} onPress={remove}><Ionicons name="trash-outline" size={19} color="#EF4444"/></TouchableOpacity><TouchableOpacity style={[styles.add,out&&styles.disabled]} onPress={add} disabled={out}><Ionicons name="cart-outline" size={18} color="#FFF"/><Text style={styles.addText}> Add</Text></TouchableOpacity></View></AppCard>;
}
const styles=StyleSheet.create({card:{marginBottom:12},row:{flexDirection:'row',alignItems:'center'},image:{width:56,height:56,borderRadius:16,marginRight:14,backgroundColor:'#F1F5F9'},icon:{width:50,height:50,borderRadius:16,backgroundColor:'#EAF1FF',alignItems:'center',justifyContent:'center',marginRight:14},info:{flex:1},name:{fontSize:16,fontWeight:'900',color:'#0F172A'},meta:{marginTop:3,fontSize:13,color:'#64748B',fontWeight:'600'},barcode:{marginTop:4,fontSize:11,color:'#94A3B8',fontWeight:'600'},right:{alignItems:'flex-end'},price:{fontSize:16,fontWeight:'900',color:'#0A46E4'},stock:{marginTop:6,fontSize:12,color:'#22C55E',fontWeight:'800'},low:{color:'#F59E0B',fontSize:10,fontWeight:'900',marginTop:4},out:{color:'#EF4444'},actions:{flexDirection:'row',gap:8,marginTop:14},iconAction:{width:42,height:42,borderRadius:14,backgroundColor:'#F8FAFC',borderWidth:1,borderColor:'#E2E8F0',alignItems:'center',justifyContent:'center'},add:{flex:1,height:42,borderRadius:14,backgroundColor:'#0A46E4',flexDirection:'row',alignItems:'center',justifyContent:'center'},disabled:{backgroundColor:'#94A3B8'},addText:{color:'#FFF',fontWeight:'800'}});
