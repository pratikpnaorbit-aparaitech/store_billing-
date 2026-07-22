import React, { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../store/authStore";

export default function ForgotPasswordScreen({ navigation }) {
  const cloudMode = useAuthStore((state) => state.cloudMode);
  const requestPasswordReset = useAuthStore((state) => state.requestPasswordReset);
  const completePasswordReset = useAuthStore((state) => state.completePasswordReset);
  const resetPassword = useAuthStore((state) => state.resetPassword);
  const [step, setStep] = useState("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email)) return Alert.alert("Check email", "Enter a valid account email.");
    if (cloudMode && step === "request") {
      setBusy(true); const result = await requestPasswordReset(email); setBusy(false);
      if (!result.ok) return Alert.alert("Code could not be sent", result.message);
      setStep("reset"); Alert.alert("Check your email", "Enter the 6 digit code sent to your email. It expires in 15 minutes."); return;
    }
    if ((cloudMode && !/^\d{6}$/.test(code)) || password.length < 8) return Alert.alert("Check details", "Enter the 6 digit code and a new password of at least 8 characters.");
    setBusy(true);
    const result = cloudMode ? await completePasswordReset(email, code, password) : await resetPassword(email, password);
    setBusy(false);
    if (!result.ok) return Alert.alert("Reset failed", result.message);
    Alert.alert("Password updated", "You can now log in with the new password.", [{ text: "OK", onPress: () => navigation.goBack() }]);
  };

  return <View style={styles.screen}><TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}><Ionicons name="arrow-back" size={22} color="#0F172A" /></TouchableOpacity><Text style={styles.title}>Reset password</Text><Text style={styles.subtitle}>{cloudMode ? "We will send a secure reset code to your company account email." : "Use the email registered on this device."}</Text><Text style={styles.label}>Email</Text><TextInput value={email} onChangeText={setEmail} editable={step === "request"} autoCapitalize="none" keyboardType="email-address" style={styles.input} placeholder="you@example.com" />{step === "reset" || !cloudMode ? <><Text style={styles.label}>{cloudMode ? "Reset code" : "New password"}</Text>{cloudMode ? <TextInput value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} style={styles.input} placeholder="6 digit code" /> : null}<Text style={styles.label}>New password</Text><TextInput value={password} onChangeText={setPassword} secureTextEntry style={styles.input} placeholder="Minimum 8 characters" /></> : null}<TouchableOpacity style={styles.button} onPress={submit} disabled={busy}><Text style={styles.buttonText}>{busy ? "PLEASE WAIT..." : cloudMode && step === "request" ? "SEND RESET CODE" : "UPDATE PASSWORD"}</Text></TouchableOpacity></View>;
}
const styles=StyleSheet.create({screen:{flex:1,backgroundColor:'#F8FAFC',padding:22,paddingTop:52},back:{width:44,height:44,borderRadius:16,backgroundColor:'#FFF',alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'#E2E8F0',marginBottom:28},title:{fontSize:30,fontWeight:'900',color:'#0F172A'},subtitle:{color:'#64748B',marginTop:8,marginBottom:30,lineHeight:20},label:{fontWeight:'800',fontSize:13,color:'#0F172A',marginBottom:8},input:{height:56,borderRadius:18,backgroundColor:'#FFF',borderWidth:1,borderColor:'#E2E8F0',paddingHorizontal:16,marginBottom:18},button:{height:56,borderRadius:18,backgroundColor:'#0A46E4',alignItems:'center',justifyContent:'center',marginTop:8},buttonText:{color:'#FFF',fontWeight:'900'}});
