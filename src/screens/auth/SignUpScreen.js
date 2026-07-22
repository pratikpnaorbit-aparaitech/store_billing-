import React, { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../store/authStore";

export default function SignUpScreen({ navigation }) {
  const register = useAuthStore((state) => state.register);
  const [form, setForm] = useState({ name: "", storeName: "", email: "", password: "", confirm: "" });
  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async () => {
    if (!form.name.trim() || !/^\S+@\S+\.\S+$/.test(form.email) || form.password.length < 8) return Alert.alert("Check details", "Name, valid email and a password of at least 8 characters are required.");
    if (form.password !== form.confirm) return Alert.alert("Passwords do not match", "Re-enter the same password in both fields.");
    try { await register(form); navigation.reset({ index: 0, routes: [{ name: "Main" }] }); }
    catch (error) { Alert.alert("Account could not be created", error.message); }
  };
  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}><TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}><Ionicons name="arrow-back" size={22} color="#0F172A" /></TouchableOpacity><View><Text style={styles.title}>Create account</Text><Text style={styles.subtitle}>Set up this billing device</Text></View></View>
        {[['Your name','name','default'],['Store name','storeName','default'],['Email','email','email-address'],['Password','password','default'],['Confirm password','confirm','default']].map(([label,key,keyboard]) => <View key={key}><Text style={styles.label}>{label}</Text><TextInput value={form[key]} onChangeText={(value) => setField(key,value)} keyboardType={keyboard} autoCapitalize={key === 'email' ? 'none' : 'words'} secureTextEntry={key === 'password' || key === 'confirm'} style={styles.input} placeholder={label} /></View>)}
        <TouchableOpacity style={styles.button} onPress={submit}><Text style={styles.buttonText}>CREATE ACCOUNT</Text></TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({ screen:{flex:1,backgroundColor:'#F8FAFC'},content:{padding:22,paddingTop:52,paddingBottom:40},header:{flexDirection:'row',alignItems:'center',marginBottom:30},back:{width:44,height:44,borderRadius:16,backgroundColor:'#FFF',alignItems:'center',justifyContent:'center',marginRight:14,borderWidth:1,borderColor:'#E2E8F0'},title:{fontSize:28,fontWeight:'900',color:'#0F172A'},subtitle:{color:'#64748B',marginTop:3},label:{fontSize:13,fontWeight:'800',color:'#0F172A',marginBottom:8},input:{height:56,borderRadius:18,backgroundColor:'#FFF',borderWidth:1,borderColor:'#E2E8F0',paddingHorizontal:16,marginBottom:16,fontSize:15},button:{height:56,borderRadius:18,backgroundColor:'#0A46E4',alignItems:'center',justifyContent:'center',marginTop:12},buttonText:{color:'#FFF',fontWeight:'900'} });
