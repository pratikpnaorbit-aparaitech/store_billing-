import React, { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../store/authStore";

export default function SignUpScreen({ navigation }) {
  const cloudMode = useAuthStore((state) => state.cloudMode);
  const requestRegistration = useAuthStore((state) => state.requestRegistration);
  const verifyRegistration = useAuthStore((state) => state.verifyRegistration);
  const [step, setStep] = useState("details");
  const [form, setForm] = useState({ name: "", storeName: "", email: "", phone: "", password: "", confirm: "" });
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const sendCode = async () => {
    const phone = form.phone.replace(/[\s()-]/g, "");
    if (!form.name.trim() || !form.storeName.trim() || !/^\S+@\S+\.\S+$/.test(form.email.trim()) || !/^\+?\d{10,15}$/.test(phone) || form.password.length < 8) {
      Alert.alert("Check details", "Name, store name, valid email, 10–15 digit mobile number and a password of at least 8 characters are required.");
      return;
    }
    if (form.password !== form.confirm) {
      Alert.alert("Passwords do not match", "Re-enter the same password in both fields.");
      return;
    }
    setBusy(true);
    const result = await requestRegistration(form);
    setBusy(false);
    if (!result.ok) return Alert.alert("Code could not be sent", result.message);
    if (result.local) {
      navigation.reset({ index: 0, routes: [{ name: "Main" }] });
      return;
    }
    setStep("verify");
  };

  const verifyCode = async () => {
    if (!/^\d{6}$/.test(code)) return Alert.alert("Check code", "Enter the 6 digit code sent to your email.");
    setBusy(true);
    const result = await verifyRegistration(form.email, code);
    setBusy(false);
    if (!result.ok) return Alert.alert("Verification failed", result.message);
    navigation.reset({ index: 0, routes: [{ name: "Main" }] });
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity onPress={() => step === "verify" ? setStep("details") : navigation.goBack()} style={styles.back}>
            <Ionicons name="arrow-back" size={22} color="#0F172A" />
          </TouchableOpacity>
          <View><Text style={styles.title}>{step === "details" ? "Create account" : "Verify email"}</Text><Text style={styles.subtitle}>{step === "details" ? "Set up your billing account" : `Code sent to ${form.email.trim().toLowerCase()}`}</Text></View>
        </View>

        {step === "details" ? (
          <>
            {[["Your name", "name", "default"], ["Store name", "storeName", "default"], ["Email", "email", "email-address"], ["Mobile number", "phone", "phone-pad"], ["Password", "password", "default"], ["Confirm password", "confirm", "default"]].map(([label, key, keyboard]) => (
              <View key={key}><Text style={styles.label}>{label}</Text><TextInput value={form[key]} onChangeText={(value) => setField(key, value)} keyboardType={keyboard} autoCapitalize={key === "email" ? "none" : "words"} secureTextEntry={key === "password" || key === "confirm"} style={styles.input} placeholder={label} /></View>
            ))}
            <TouchableOpacity style={styles.button} onPress={sendCode} disabled={busy}><Text style={styles.buttonText}>{busy ? "SENDING CODE..." : cloudMode ? "SEND VERIFICATION CODE" : "CREATE ACCOUNT"}</Text></TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.notice}><Ionicons name="mail-unread-outline" size={28} color="#0A46E4" /><Text style={styles.noticeText}>Enter the 6 digit verification code. It expires in 15 minutes.</Text></View>
            <Text style={styles.label}>Verification code</Text>
            <TextInput value={code} onChangeText={(value) => setCode(value.replace(/\D/g, ""))} keyboardType="number-pad" maxLength={6} style={[styles.input, styles.code]} placeholder="000000" />
            <TouchableOpacity style={styles.button} onPress={verifyCode} disabled={busy}><Text style={styles.buttonText}>{busy ? "VERIFYING..." : "VERIFY & CREATE ACCOUNT"}</Text></TouchableOpacity>
            <TouchableOpacity onPress={sendCode} disabled={busy}><Text style={styles.link}>Resend verification code</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setStep("details")} disabled={busy}><Text style={styles.mutedLink}>Change email or details</Text></TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8FAFC" }, content: { padding: 22, paddingTop: 52, paddingBottom: 40 }, header: { flexDirection: "row", alignItems: "center", marginBottom: 30 },
  back: { width: 44, height: 44, borderRadius: 16, backgroundColor: "#FFF", alignItems: "center", justifyContent: "center", marginRight: 14, borderWidth: 1, borderColor: "#E2E8F0" },
  title: { fontSize: 28, fontWeight: "900", color: "#0F172A" }, subtitle: { color: "#64748B", marginTop: 3, maxWidth: 260 }, label: { fontSize: 13, fontWeight: "800", color: "#0F172A", marginBottom: 8 },
  input: { height: 56, borderRadius: 18, backgroundColor: "#FFF", borderWidth: 1, borderColor: "#E2E8F0", paddingHorizontal: 16, marginBottom: 16, fontSize: 15 }, code: { fontSize: 24, fontWeight: "900", letterSpacing: 8, textAlign: "center" },
  button: { minHeight: 56, borderRadius: 18, backgroundColor: "#0A46E4", alignItems: "center", justifyContent: "center", marginTop: 12, paddingHorizontal: 12 }, buttonText: { color: "#FFF", fontWeight: "900", textAlign: "center" },
  notice: { padding: 18, borderRadius: 18, backgroundColor: "#EAF1FF", flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 24 }, noticeText: { flex: 1, color: "#334155", lineHeight: 20, fontWeight: "700" },
  link: { textAlign: "center", color: "#0A46E4", fontWeight: "900", marginTop: 22 }, mutedLink: { textAlign: "center", color: "#64748B", fontWeight: "800", marginTop: 16 },
});
