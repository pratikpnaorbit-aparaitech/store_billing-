import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../store/authStore";
import { useSettingsStore } from "../../store/settingsStore";

export default function ProfileScreen({ navigation }) {
  const user = useAuthStore((state) => state.user);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const logout = useAuthStore((state) => state.logout);
  const changePassword = useAuthStore((state) => state.changePassword);
  const cloudMode = useAuthStore((state) => state.cloudMode);
  const connectionStatus = useAuthStore((state) => state.connectionStatus);
  const settings = useSettingsStore((state) => state.settings);
  const updateSettings = useSettingsStore((state) => state.updateSettings);
  const [name, setName] = useState(user?.name || "");
  const [storeName, setStoreName] = useState(user?.storeName || "");
  const [gstRate, setGstRate] = useState(String(settings.gstRate));
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const save = async () => {
    if (!name.trim() || !storeName.trim()) return Alert.alert("Missing details", "Name and store name are required.");
    const rate = Number(gstRate);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) return Alert.alert("Invalid GST", "GST rate must be between 0 and 100.");
    try {
      await Promise.all([updateProfile({ name: name.trim(), storeName: storeName.trim() }), updateSettings({ gstRate: rate })]);
      Alert.alert("Saved", "Profile and billing settings updated.");
    } catch (error) { Alert.alert("Could not save", error.message); }
  };

  const updatePassword = async () => {
    if (!currentPassword || newPassword.length < 8) return Alert.alert("Check password", "Enter the current password and a new password of at least 8 characters.");
    const result = await changePassword(currentPassword, newPassword);
    if (!result.ok) return Alert.alert("Password not changed", result.message);
    setCurrentPassword(""); setNewPassword(""); Alert.alert("Password changed", "Your company account password was updated.");
  };

  const signOut = () => Alert.alert("Log out?", "You can sign in again on this device.", [
    { text: "Cancel", style: "cancel" },
    { text: "Log out", style: "destructive", onPress: async () => { await logout(); navigation.getParent()?.reset({ index: 0, routes: [{ name: "Login" }] }); } },
  ]);

  return <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
    <Text style={styles.title}>Profile & Settings</Text><Text style={styles.subtitle}>Store identity and billing preferences</Text>
    <View style={[styles.status, connectionStatus === 'online' ? styles.statusOnline : styles.statusOffline]}><Text style={styles.statusText}>{cloudMode ? `Cloud: ${connectionStatus}` : 'Standalone offline mode'}</Text></View>
    <View style={styles.avatar}><Text style={styles.avatarText}>{(name || "U").charAt(0).toUpperCase()}</Text></View>
    {[['Your name',name,setName],['Store name',storeName,setStoreName],['Default GST %',gstRate,setGstRate]].map(([label,value,setter]) => <View key={label}><Text style={styles.label}>{label}</Text><TextInput value={value} onChangeText={setter} keyboardType={label.includes('GST') ? 'decimal-pad' : 'default'} style={styles.input} /></View>)}
    <Text style={styles.label}>Account email</Text><View style={styles.readOnly}><Ionicons name="mail-outline" size={18} color="#64748B" /><Text style={styles.readOnlyText}>{user?.email}</Text></View>
    <TouchableOpacity style={styles.save} onPress={save}><Text style={styles.saveText}>Save Changes</Text></TouchableOpacity>
    {cloudMode ? <View style={styles.passwordCard}><Text style={styles.passwordTitle}>Change Password</Text><TextInput value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry placeholder="Current password" style={styles.input} /><TextInput value={newPassword} onChangeText={setNewPassword} secureTextEntry placeholder="New password (8+ characters)" style={styles.input} /><TouchableOpacity style={styles.passwordButton} onPress={updatePassword}><Text style={styles.passwordButtonText}>Update Password</Text></TouchableOpacity></View> : null}
    <TouchableOpacity style={styles.logout} onPress={signOut}><Ionicons name="log-out-outline" size={20} color="#DC2626" /><Text style={styles.logoutText}>Log out</Text></TouchableOpacity>
    <Text style={styles.note}>{cloudMode ? "Company data is secured in the cloud. Cached business data is cleared when you log out." : "Products, orders and customers are stored on this device and remain available offline."}</Text>
  </ScrollView>;
}

const styles=StyleSheet.create({screen:{flex:1,backgroundColor:'#F8FAFC'},content:{padding:22,paddingTop:48,paddingBottom:120},title:{fontSize:30,fontWeight:'900',color:'#0F172A'},subtitle:{color:'#64748B',marginTop:6,marginBottom:12},status:{alignSelf:'flex-start',borderRadius:999,paddingHorizontal:12,paddingVertical:7,marginBottom:20},statusOnline:{backgroundColor:'#DCFCE7'},statusOffline:{backgroundColor:'#FEF3C7'},statusText:{fontSize:12,fontWeight:'900',color:'#334155'},avatar:{width:72,height:72,borderRadius:24,backgroundColor:'#EAF1FF',alignItems:'center',justifyContent:'center',marginBottom:24},avatarText:{fontSize:28,fontWeight:'900',color:'#0A46E4'},label:{fontSize:13,fontWeight:'800',color:'#0F172A',marginBottom:8},input:{height:54,borderRadius:17,backgroundColor:'#FFF',borderWidth:1,borderColor:'#E2E8F0',paddingHorizontal:16,marginBottom:17},readOnly:{height:54,borderRadius:17,backgroundColor:'#E2E8F0',paddingHorizontal:16,flexDirection:'row',alignItems:'center',gap:10},readOnlyText:{color:'#475569',fontWeight:'700'},save:{height:56,borderRadius:18,backgroundColor:'#0A46E4',alignItems:'center',justifyContent:'center',marginTop:24},saveText:{color:'#FFF',fontWeight:'900'},passwordCard:{backgroundColor:'#FFF',borderRadius:22,padding:18,borderWidth:1,borderColor:'#E2E8F0',marginTop:18},passwordTitle:{fontSize:17,fontWeight:'900',color:'#0F172A',marginBottom:16},passwordButton:{height:50,borderRadius:16,backgroundColor:'#0F172A',alignItems:'center',justifyContent:'center'},passwordButtonText:{color:'#FFF',fontWeight:'900'},logout:{height:54,borderRadius:18,borderWidth:1,borderColor:'#FECACA',backgroundColor:'#FFF',alignItems:'center',justifyContent:'center',flexDirection:'row',gap:8,marginTop:12},logoutText:{color:'#DC2626',fontWeight:'900'},note:{textAlign:'center',color:'#94A3B8',fontSize:12,lineHeight:18,marginTop:20}});
