import React, { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
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
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const sendCode = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return Alert.alert("Check email", "Enter a valid account email.");
    setBusy(true);
    const result = await requestPasswordReset(email.trim().toLowerCase());
    setBusy(false);
    if (!result.ok) return Alert.alert("Code could not be sent", result.message);
    setStep("reset");
  };

  const updatePassword = async () => {
    if (cloudMode && !/^\d{6}$/.test(code)) return Alert.alert("Check code", "Enter the 6 digit reset code.");
    if (password.length < 8) return Alert.alert("Weak password", "New password must contain at least 8 characters.");
    if (password !== confirm) return Alert.alert("Passwords do not match", "Enter the same new password in both fields.");
    setBusy(true);
    const result = cloudMode
      ? await completePasswordReset(email.trim().toLowerCase(), code, password)
      : await resetPassword(email.trim().toLowerCase(), password);
    setBusy(false);
    if (!result.ok) return Alert.alert("Reset failed", result.message);
    setStep("success");
    setPassword("");
    setConfirm("");
    setCode("");
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => step === "reset" ? setStep("request") : navigation.goBack()} style={styles.back}><Ionicons name="arrow-back" size={22} color="#0F172A" /></TouchableOpacity>
        {step === "success" ? (
          <View style={styles.successBox}>
            <View style={styles.successIcon}><Ionicons name="checkmark" size={38} color="#FFFFFF" /></View>
            <Text style={styles.successTitle}>Password updated</Text>
            <Text style={styles.successText}>Your password has been changed successfully. Log in using the new password.</Text>
            <TouchableOpacity style={styles.button} onPress={() => navigation.replace("Login", { email: email.trim().toLowerCase() })}><Text style={styles.buttonText}>GO TO LOGIN</Text></TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.title}>{step === "request" ? "Reset password" : "Enter reset code"}</Text>
            <Text style={styles.subtitle}>{step === "request" ? "We will email a secure 6 digit code to your ServiceHub account." : `Code sent to ${email.trim().toLowerCase()}. It expires in 15 minutes.`}</Text>
            <Text style={styles.label}>Email</Text>
            <TextInput value={email} onChangeText={setEmail} editable={step === "request"} autoCapitalize="none" keyboardType="email-address" style={[styles.input, step !== "request" && styles.disabled]} placeholder="you@example.com" />
            {step === "reset" || !cloudMode ? (
              <>
                {cloudMode ? <><Text style={styles.label}>6 digit reset code</Text><TextInput value={code} onChangeText={(value) => setCode(value.replace(/\D/g, ""))} keyboardType="number-pad" maxLength={6} style={[styles.input, styles.code]} placeholder="000000" /></> : null}
                <Text style={styles.label}>New password</Text>
                <TextInput value={password} onChangeText={setPassword} secureTextEntry style={styles.input} placeholder="Minimum 8 characters" />
                <Text style={styles.label}>Confirm new password</Text>
                <TextInput value={confirm} onChangeText={setConfirm} secureTextEntry style={styles.input} placeholder="Re-enter new password" />
              </>
            ) : null}
            <TouchableOpacity style={styles.button} onPress={step === "request" && cloudMode ? sendCode : updatePassword} disabled={busy}><Text style={styles.buttonText}>{busy ? "PLEASE WAIT..." : step === "request" && cloudMode ? "SEND RESET CODE" : "UPDATE PASSWORD"}</Text></TouchableOpacity>
            {step === "reset" && cloudMode ? <><TouchableOpacity onPress={sendCode} disabled={busy}><Text style={styles.link}>Resend reset code</Text></TouchableOpacity><TouchableOpacity onPress={() => setStep("request")} disabled={busy}><Text style={styles.mutedLink}>Use a different email</Text></TouchableOpacity></> : null}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8FAFC" }, content: { flexGrow: 1, padding: 22, paddingTop: 52, paddingBottom: 40 }, back: { width: 44, height: 44, borderRadius: 16, backgroundColor: "#FFF", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#E2E8F0", marginBottom: 28 },
  title: { fontSize: 30, fontWeight: "900", color: "#0F172A" }, subtitle: { color: "#64748B", marginTop: 8, marginBottom: 30, lineHeight: 20 }, label: { fontWeight: "800", fontSize: 13, color: "#0F172A", marginBottom: 8 },
  input: { height: 56, borderRadius: 18, backgroundColor: "#FFF", borderWidth: 1, borderColor: "#E2E8F0", paddingHorizontal: 16, marginBottom: 18 }, disabled: { backgroundColor: "#F1F5F9", color: "#64748B" }, code: { fontSize: 24, fontWeight: "900", letterSpacing: 8, textAlign: "center" },
  button: { minHeight: 56, borderRadius: 18, backgroundColor: "#0A46E4", alignItems: "center", justifyContent: "center", marginTop: 8, paddingHorizontal: 14 }, buttonText: { color: "#FFF", fontWeight: "900", textAlign: "center" }, link: { color: "#0A46E4", textAlign: "center", fontWeight: "900", marginTop: 22 }, mutedLink: { color: "#64748B", textAlign: "center", fontWeight: "800", marginTop: 16 },
  successBox: { flex: 1, justifyContent: "center", alignItems: "center" }, successIcon: { width: 76, height: 76, borderRadius: 38, backgroundColor: "#16A34A", alignItems: "center", justifyContent: "center" }, successTitle: { marginTop: 22, fontSize: 28, fontWeight: "900", color: "#0F172A" }, successText: { marginTop: 10, color: "#64748B", lineHeight: 21, textAlign: "center", marginBottom: 24 },
});
