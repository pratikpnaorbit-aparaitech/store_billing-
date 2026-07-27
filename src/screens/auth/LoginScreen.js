import React, { useState } from "react";
import { Alert, Image, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuthStore } from "../../store/authStore";

export default function LoginScreen({ navigation, route }) {
  const login = useAuthStore((state) => state.login);
  const [email, setEmail] = useState(route?.params?.email || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email) || !password) {
      Alert.alert("Check details", "Enter a valid email and password.");
      return;
    }
    setBusy(true);
    const result = await login(email, password);
    setBusy(false);
    if (!result.ok) {
      const title = result.code === "DEVICE_ALREADY_ACTIVE"
        ? "Account active on another phone"
        : "Login failed";
      return Alert.alert(title, result.message);
    }
    navigation.reset({ index: 0, routes: [{ name: "Main" }] });
  };

  return (
    <LinearGradient colors={["#F8FAFC", "#EEF4FF"]} style={styles.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.container}>
        <View style={styles.brandBox}>
          <View style={styles.logoBox}><Image source={require("../../assets/images/logo.png")} style={styles.logo} resizeMode="contain" /></View>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Manage billing, products and receipts</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.label}>Email Address</Text>
          <View style={styles.inputBox}><Ionicons name="mail-outline" size={20} color="#64748B" /><TextInput value={email} onChangeText={setEmail} placeholder="you@example.com" autoCapitalize="none" keyboardType="email-address" style={styles.input} /></View>
          <Text style={styles.label}>Password</Text>
          <View style={styles.inputBox}><Ionicons name="lock-closed-outline" size={20} color="#64748B" /><TextInput value={password} onChangeText={setPassword} placeholder="Your password" secureTextEntry={!showPassword} style={styles.input} /><TouchableOpacity onPress={() => setShowPassword((value) => !value)}><Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#64748B" /></TouchableOpacity></View>
          <TouchableOpacity style={styles.forgot} onPress={() => navigation.navigate("ForgotPassword")}><Text style={styles.link}>Forgot Password?</Text></TouchableOpacity>
          <TouchableOpacity activeOpacity={0.88} onPress={submit} disabled={busy}><LinearGradient colors={["#0A46E4", "#0732A3"]} style={styles.button}><Text style={styles.buttonText}>{busy ? "PLEASE WAIT..." : "LOGIN"}</Text></LinearGradient></TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate("SignUp")}><Text style={styles.createText}>Create new account</Text></TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, container: { flex: 1, padding: 24, justifyContent: "center" }, brandBox: { alignItems: "center", marginBottom: 28 },
  logoBox: { width: 82, height: 82, borderRadius: 24, backgroundColor: "#FFF", alignItems: "center", justifyContent: "center", marginBottom: 16, elevation: 6 }, logo: { width: 58, height: 58 },
  title: { fontSize: 31, fontWeight: "900", color: "#0F172A" }, subtitle: { marginTop: 8, color: "#64748B", textAlign: "center" },
  card: { backgroundColor: "#FFF", borderRadius: 28, padding: 22, borderWidth: 1, borderColor: "#E2E8F0", elevation: 7 }, label: { fontSize: 13, fontWeight: "800", color: "#0F172A", marginBottom: 8 },
  inputBox: { height: 56, borderRadius: 18, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0", flexDirection: "row", alignItems: "center", paddingHorizontal: 15, marginBottom: 16 }, input: { flex: 1, marginLeft: 10, fontSize: 15, color: "#0F172A" },
  forgot: { alignSelf: "flex-end", marginBottom: 20 }, link: { color: "#0A46E4", fontWeight: "800", fontSize: 13 }, button: { height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center" }, buttonText: { color: "#FFF", fontSize: 15, fontWeight: "900", letterSpacing: 1.2 }, createText: { textAlign: "center", marginTop: 20, color: "#0A46E4", fontWeight: "800" },
});
