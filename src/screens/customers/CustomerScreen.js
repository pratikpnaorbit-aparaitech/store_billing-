import React, { useState } from "react";
import { Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CustomerCard from "../../components/customers/CustomerCard";
import { useCustomerStore } from "../../store/customerStore";

export default function CustomerScreen() {
  const customers = useCustomerStore((state) => state.customers);
  const addCustomer = useCustomerStore((state) => state.addCustomer);
  const deleteCustomer = useCustomerStore((state) => state.deleteCustomer);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const save = async () => {
    if (!name.trim()) return Alert.alert("Name required", "Enter the customer name.");
    if (phone && !/^\d{10}$/.test(phone)) return Alert.alert("Invalid mobile", "Enter a 10 digit mobile number or leave it blank.");
    try { await addCustomer({ name, phone }); setName(""); setPhone(""); setShowForm(false); }
    catch (error) { Alert.alert("Could not add customer", error.message); }
  };

  const remove = (customer) => Alert.alert("Delete customer?", customer.name, [{text:"Cancel",style:"cancel"},{text:"Delete",style:"destructive",onPress:()=>deleteCustomer(customer.id)}]);

  return <View style={styles.screen}><View style={styles.header}><View><Text style={styles.title}>Customers</Text><Text style={styles.subtitle}>Customer purchase history</Text></View><TouchableOpacity style={styles.add} onPress={() => setShowForm((value)=>!value)}><Ionicons name={showForm?'close':'person-add-outline'} size={21} color="#FFF" /></TouchableOpacity></View>{showForm ? <View style={styles.form}><TextInput value={name} onChangeText={setName} placeholder="Customer name" style={styles.input}/><TextInput value={phone} onChangeText={setPhone} placeholder="10 digit mobile (optional)" keyboardType="phone-pad" maxLength={10} style={styles.input}/><TouchableOpacity style={styles.save} onPress={save}><Text style={styles.saveText}>Save Customer</Text></TouchableOpacity></View> : null}<FlatList data={customers} keyExtractor={(item)=>item.id} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false} renderItem={({item})=><TouchableOpacity activeOpacity={item.id==='walk-in'?1:0.8} onLongPress={item.id==='walk-in'?undefined:()=>remove(item)}><CustomerCard customer={item}/></TouchableOpacity>} ListEmptyComponent={<View style={styles.empty}><Ionicons name="people-outline" size={48} color="#94A3B8"/><Text>No customers yet</Text></View>}/></View>;
}
const styles=StyleSheet.create({screen:{flex:1,backgroundColor:'#F8FAFC',paddingHorizontal:20,paddingTop:44},header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},title:{fontSize:32,fontWeight:'900',color:'#0F172A'},subtitle:{marginTop:6,color:'#64748B',fontWeight:'600'},add:{width:48,height:48,borderRadius:17,backgroundColor:'#0A46E4',alignItems:'center',justifyContent:'center'},form:{backgroundColor:'#FFF',borderRadius:22,padding:16,marginTop:18,borderWidth:1,borderColor:'#E2E8F0'},input:{height:50,borderRadius:15,borderWidth:1,borderColor:'#E2E8F0',paddingHorizontal:14,marginBottom:10},save:{height:50,borderRadius:15,backgroundColor:'#0F172A',alignItems:'center',justifyContent:'center'},saveText:{color:'#FFF',fontWeight:'900'},list:{paddingTop:22,paddingBottom:110},empty:{alignItems:'center',marginTop:100,gap:10}});
