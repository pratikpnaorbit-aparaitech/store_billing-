import React, { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../store/authStore";
import { useTranslation } from "../../i18n";

export default function SignUpScreen({ navigation }) {
  const { t } = useTranslation();
  const cloudMode = useAuthStore((state) => state.cloudMode);
  const requestRegistration = useAuthStore((state) => state.requestRegistration);
  const verifyRegistration = useAuthStore((state) => state.verifyRegistration);
  const [step, setStep] = useState("details");
  const [form, setForm] = useState({ name: "", storeName: "", email: "", phone: "", password: "", confirm: "" });
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState(null);
  const [accountExists, setAccountExists] = useState(false);
  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const sendCode = async () => {
    setFormError(null);
    setAccountExists(false);
    const phone = form.phone.replace(/[\s()-]/g, "");
    if (!form.name.trim() || !form.storeName.trim() || !/^\S+@\S+\.\S+$/.test(form.email.trim()) || !/^\+?\d{10,15}$/.test(phone) || form.password.length < 8) {
      Alert.alert(t("Check details"), t("Name, store name, valid email, 10–15 digit mobile number and a password of at least 8 characters are required."));
      return;
    }
    if (form.password !== form.confirm) {
      Alert.alert(t("Passwords do not match"), t("Re-enter the same password in both fields."));
      return;
    }
    setBusy(true);
    const result = await requestRegistration(form);
    setBusy(false);
    if (!result.ok) {
      setFormError(result.message);
      setAccountExists(result.code === "ACCOUNT_EXISTS" || result.status === 409);
      return;
    }
    if (result.local) {
      navigation.reset({ index: 0, routes: [{ name: "Main" }] });
      return;
    }
    setStep("verify");
  };

  const verifyCode = async () => {
    if (!/^\d{6}$/.test(code)) return Alert.alert(t("Check code"), t("Enter the 6 digit code sent to your email."));
    setBusy(true);
    const result = await verifyRegistration(form.email, code);
    setBusy(false);
    if (!result.ok) return Alert.alert(t("Verification failed"), result.message);
    navigation.reset({ index: 0, routes: [{ name: "Main" }] });
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity onPress={() => step === "verify" ? setStep("details") : navigation.goBack()} style={styles.back}>
            <Ionicons name="arrow-back" size={22} color="#0F172A" />
          </TouchableOpacity>
          <View><Text style={styles.title}>{step === "details" ? t("Create account") : t("Verify email")}</Text><Text style={styles.subtitle}>{step === "details" ? t("Set up your billing account") : `${t("Code sent to")} ${form.email.trim().toLowerCase()}`}</Text></View>
        </View>

        {step === "details" ? (
          <>
            {[["Your name", "name", "default"], ["Store name", "storeName", "default"], ["Email", "email", "email-address"], ["Mobile number", "phone", "phone-pad"], ["Password", "password", "default"], ["Confirm password", "confirm", "default"]].map(([label, key, keyboard]) => (
              <View key={key}><Text style={styles.label}>{t(label)}</Text><TextInput value={form[key]} onChangeText={(value) => setField(key, value)} keyboardType={keyboard} autoCapitalize={key === "email" ? "none" : "words"} secureTextEntry={key === "password" || key === "confirm"} style={styles.input} placeholder={t(label)} /></View>
            ))}
            {formError ? <View style={styles.errorBox}><Ionicons name={accountExists ? "person-circle-outline" : "alert-circle-outline"} size={24} color="#B91C1C" /><View style={styles.errorContent}><Text style={styles.errorTitle}>{t(accountExists ? "Account already exists" : "Registration could not continue")}</Text><Text style={styles.errorText}>{formError}</Text></View></View> : null}
            {accountExists ? <View style={styles.existingActions}><TouchableOpacity style={styles.loginButton} onPress={() => navigation.replace("Login", { email: form.email.trim().toLowerCase() })}><Text style={styles.loginButtonText}>{t("GO TO LOGIN")}</Text></TouchableOpacity><TouchableOpacity style={styles.resetButton} onPress={() => navigation.navigate("ForgotPassword", { email: form.email.trim().toLowerCase() })}><Text style={styles.resetButtonText}>{t("RESET PASSWORD")}</Text></TouchableOpacity></View> : null}
            <TouchableOpacity style={styles.button} onPress={sendCode} disabled={busy}><Text style={styles.buttonText}>{busy ? t("SENDING CODE...") : cloudMode ? t("SEND VERIFICATION CODE") : t("CREATE ACCOUNT")}</Text></TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.notice}><Ionicons name="mail-unread-outline" size={28} color="#0A46E4" /><Text style={styles.noticeText}>{t("Enter the 6 digit verification code. It expires in 15 minutes.")}</Text></View>
            <Text style={styles.label}>{t("Verification code")}</Text>
            <TextInput value={code} onChangeText={(value) => setCode(value.replace(/\D/g, ""))} keyboardType="number-pad" maxLength={6} style={[styles.input, styles.code]} placeholder="000000" />
            <TouchableOpacity style={styles.button} onPress={verifyCode} disabled={busy}><Text style={styles.buttonText}>{t(busy ? "VERIFYING..." : "VERIFY & CREATE ACCOUNT")}</Text></TouchableOpacity>
            <TouchableOpacity onPress={sendCode} disabled={busy}><Text style={styles.link}>{t("Resend verification code")}</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setStep("details")} disabled={busy}><Text style={styles.mutedLink}>{t("Change email or details")}</Text></TouchableOpacity>
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
  link: { textAlign: "center", color: "#0A46E4", fontWeight: "900", marginTop: 22 }, mutedLink: { textAlign: "center", color: "#64748B", fontWeight: "800", marginTop: 16 }, errorBox: { flexDirection: "row", gap: 10, padding: 14, borderRadius: 16, backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA", marginTop: 4 }, errorContent: { flex: 1 }, errorTitle: { color: "#991B1B", fontWeight: "900" }, errorText: { color: "#B91C1C", marginTop: 3, lineHeight: 18 }, existingActions: { flexDirection: "row", gap: 10, marginTop: 12 }, loginButton: { flex: 1, minHeight: 48, borderRadius: 15, backgroundColor: "#0F172A", alignItems: "center", justifyContent: "center", paddingHorizontal: 8 }, loginButtonText: { color: "#FFF", fontWeight: "900", fontSize: 12, textAlign: "center" }, resetButton: { flex: 1, minHeight: 48, borderRadius: 15, backgroundColor: "#FFF", borderWidth: 1, borderColor: "#0A46E4", alignItems: "center", justifyContent: "center", paddingHorizontal: 8 }, resetButtonText: { color: "#0A46E4", fontWeight: "900", fontSize: 12, textAlign: "center" },
});
