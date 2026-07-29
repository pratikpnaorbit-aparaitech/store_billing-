import React, { useState } from "react";
import { ActivityIndicator, Alert, Linking, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuthStore } from "../../store/authStore";
import { useTranslation } from "../../i18n";

export default function AccountPausedScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const refreshSubscription = useAuthStore((state) => state.refreshSubscription);
  const logout = useAuthStore((state) => state.logout);
  const [refreshing, setRefreshing] = useState(false);

  const contactSupport = async () => {
    const message = [
      t("Hello Smart Billing Support,"),
      t("My account is paused and I need assistance."),
      `${t("Store")}: ${user?.storeName || t("Not set")}`,
      `${t("Email")}: ${user?.email || t("Not available")}`,
    ].join("\n");
    try {
      await Linking.openURL(`https://wa.me/919158852129?text=${encodeURIComponent(message)}`);
    } catch {
      Alert.alert(t("Contact support"), "WhatsApp: +91 91588 52129");
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    try {
      await refreshSubscription();
    } catch (error) {
      Alert.alert(t("Could not refresh"), error.message);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <LinearGradient colors={["#EEF4FF", "#F8FAFC", "#FFFFFF"]} style={styles.screen}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.card}>
          <View style={styles.brand}>
            <View style={styles.brandIcon}><Ionicons name="receipt-outline" size={23} color="#FFFFFF" /></View>
            <Text style={styles.brandText}>Smart Billing</Text>
          </View>
          <View style={styles.pauseIcon}>
            <Ionicons name="pause-circle-outline" size={42} color="#B45309" />
          </View>
          <Text style={styles.title}>{t("Account temporarily paused")}</Text>
          <Text style={styles.message}>
            {user?.subscription?.accountPauseReason || t("Your administrator has temporarily paused access to this account.")}
          </Text>
          <View style={styles.storeCard}>
            <Ionicons name="storefront-outline" size={20} color="#0A46E4" />
            <View style={styles.flex}>
              <Text style={styles.storeName}>{user?.storeName || t("Your store")}</Text>
              <Text style={styles.email}>{user?.email}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.primary} onPress={contactSupport}>
            <Ionicons name="logo-whatsapp" size={20} color="#FFFFFF" />
            <Text style={styles.primaryText}>{t("Contact support on WhatsApp")}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondary} onPress={refresh} disabled={refreshing}>
            {refreshing
              ? <ActivityIndicator color="#0A46E4" />
              : <><Ionicons name="refresh-outline" size={19} color="#0A46E4" /><Text style={styles.secondaryText}>{t("Check account status")}</Text></>}
          </TouchableOpacity>
          <TouchableOpacity onPress={logout}>
            <Text style={styles.logout}>{t("Log out")}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1, justifyContent: "center", padding: 22 },
  card: { width: "100%", maxWidth: 470, alignSelf: "center", borderRadius: 30, padding: 24, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#DBE5F3", elevation: 7 },
  flex: { flex: 1 },
  brand: { flexDirection: "row", alignItems: "center", marginBottom: 28 },
  brandIcon: { width: 42, height: 42, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: "#0A46E4" },
  brandText: { color: "#0F172A", fontSize: 19, fontWeight: "900", marginLeft: 10 },
  pauseIcon: { width: 78, height: 78, borderRadius: 26, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFBEB", borderWidth: 1, borderColor: "#FDE68A" },
  title: { color: "#0F172A", fontSize: 28, lineHeight: 34, fontWeight: "900", marginTop: 20 },
  message: { color: "#64748B", fontSize: 14, lineHeight: 21, marginTop: 10 },
  storeCard: { flexDirection: "row", alignItems: "center", borderRadius: 18, padding: 14, backgroundColor: "#F8FAFC", marginTop: 22, gap: 11 },
  storeName: { color: "#0F172A", fontWeight: "900" },
  email: { color: "#64748B", fontSize: 11, marginTop: 3 },
  primary: { minHeight: 56, borderRadius: 18, backgroundColor: "#16A34A", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 20 },
  primaryText: { color: "#FFFFFF", fontWeight: "900" },
  secondary: { minHeight: 54, borderRadius: 18, borderWidth: 1, borderColor: "#BFDBFE", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 11 },
  secondaryText: { color: "#0A46E4", fontWeight: "900" },
  logout: { textAlign: "center", color: "#64748B", fontWeight: "800", marginTop: 20 },
});
