import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../store/authStore";
import { useTranslation } from "../../i18n";

function formatDate(value, language) {
  if (!value) return "";
  return new Intl.DateTimeFormat({ en: "en-IN", hi: "hi-IN", mr: "mr-IN" }[language] || "en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export default function SubscriptionBanner({ onPress }) {
  const { language, t } = useTranslation();
  const subscription = useAuthStore((state) => state.user?.subscription);
  if (!subscription) return null;
  const trial = subscription.status === "trial_active";
  const priceChange = subscription.priceChange;
  const monthlyAmount = Number(subscription.plan?.amount || 300);
  const title = trial
    ? `${subscription.trialDaysRemaining} ${t("free trial days left")}`
    : `₹${monthlyAmount.toLocaleString("en-IN")} ${t("monthly plan active")}`;
  const detail = trial
    ? `${t("Free access ends")} ${formatDate(subscription.trialEndsAt, language)}`
    : subscription.nextChargeAt
      ? `${t("Next charge")} ${formatDate(subscription.nextChargeAt, language)}`
      : t("Your subscription is verified");

  if (priceChange?.required) {
    return (
      <TouchableOpacity style={[styles.card, styles.updateCard]} onPress={onPress} activeOpacity={0.84}>
        <View style={[styles.icon, styles.updateIcon]}>
          <Ionicons name="notifications" size={22} color="#B45309" />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>{t("Subscription price updated")}</Text>
          <Text style={styles.detail}>{t("Tap to stop old autopay and authorise the latest plan")}</Text>
        </View>
        <Ionicons name="chevron-forward" size={19} color="#B45309" />
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.card, trial ? styles.trialCard : styles.activeCard]}>
      <View style={[styles.icon, trial ? styles.trialIcon : styles.activeIcon]}>
        <Ionicons name={trial ? "time-outline" : "shield-checkmark-outline"} size={22} color={trial ? "#B45309" : "#15803D"} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.detail}>{detail}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", borderRadius: 18, borderWidth: 1, padding: 14, marginBottom: 18 },
  trialCard: { backgroundColor: "#FFFBEB", borderColor: "#FDE68A" },
  activeCard: { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" },
  updateCard: { backgroundColor: "#FFFBEB", borderColor: "#FDE68A" },
  icon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  trialIcon: { backgroundColor: "#FEF3C7" },
  activeIcon: { backgroundColor: "#DCFCE7" },
  updateIcon: { backgroundColor: "#FEF3C7" },
  copy: { flex: 1, marginLeft: 12 },
  title: { color: "#0F172A", fontWeight: "900", fontSize: 14 },
  detail: { color: "#64748B", marginTop: 3, fontSize: 12, fontWeight: "600" },
});
