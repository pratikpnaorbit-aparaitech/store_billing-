import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as WebBrowser from "expo-web-browser";
import {
  createSubscriptionCheckout,
  fetchSubscriptionPlans,
  startSubscriptionMigration,
  verifySubscriptionCheckout,
} from "../../services/subscriptionApi";
import { useAuthStore } from "../../store/authStore";
import { useTranslation } from "../../i18n";

WebBrowser.maybeCompleteAuthSession();

function formatDate(value, language = "en") {
  if (!value) return "";
  return new Intl.DateTimeFormat({ en: "en-IN", hi: "hi-IN", mr: "mr-IN" }[language] || "en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function SubscriptionScreen({ navigation, route }) {
  const { language, t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const refreshSubscription = useAuthStore((state) => state.refreshSubscription);
  const logout = useAuthStore((state) => state.logout);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");
  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [plansLoading, setPlansLoading] = useState(true);
  const subscription = user?.subscription || {};
  const migrationMode = Boolean(route?.params?.migration);
  const manageMode = Boolean(route?.params?.manage);
  const priceChange = subscription.priceChange;
  const paymentIssue = ["pending", "halted"].includes(subscription.providerStatus);
  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId) || plans[0];

  useEffect(() => {
    let active = true;
    fetchSubscriptionPlans()
      .then((response) => {
        if (!active) return;
        const available = response.plans || [];
        setPlans(available);
        const preferred = available.find((plan) => plan.id === priceChange?.targetPlanId)
          || available.find((plan) => plan.durationMonths === subscription.plan?.durationMonths)
          || available[0];
        setSelectedPlanId((current) => current || preferred?.id || "");
      })
      .catch((error) => {
        if (active) setMessage(error.message || "Could not load subscription plans.");
      })
      .finally(() => {
        if (active) setPlansLoading(false);
      });
    return () => { active = false; };
  }, [priceChange?.targetPlanId, subscription.plan?.durationMonths]);

  const refresh = async () => {
    setRefreshing(true);
    setMessage("");
    try {
      const updated = await refreshSubscription();
      if (!updated?.accessAllowed) {
        setMessage("Subscription is not active yet. Complete or retry the Razorpay payment.");
      }
    } catch (error) {
      setMessage(error.message || "Could not refresh subscription.");
    } finally {
      setRefreshing(false);
    }
  };

  const performCheckout = async () => {
    setBusy(true);
    setMessage("");
    try {
      if (!selectedPlan?.id) throw new Error("Choose a subscription plan first.");
      if (migrationMode && priceChange?.required && !subscription.migrationPending) {
        const migration = await startSubscriptionMigration(selectedPlan.id);
        setMessage(migration.message || "Old autopay is scheduled to stop. Continue with Razorpay.");
        await refreshSubscription();
      }
      const checkout = await createSubscriptionCheckout(selectedPlan.id);
      if (Platform.OS === "web") {
        await WebBrowser.openBrowserAsync(checkout.checkoutUrl);
      } else {
        const RazorpayModule = await import("react-native-razorpay");
        const RazorpayCheckout = RazorpayModule.default || RazorpayModule;
        if (!RazorpayCheckout?.open) {
          throw new Error("Razorpay mobile checkout is not available in this build. Install a new development or release build.");
        }
        if (!checkout.keyId || !checkout.subscriptionId || !checkout.checkoutToken) {
          throw new Error("Payment could not be initialized. Please try again.");
        }

        const payment = await RazorpayCheckout.open({
          key: checkout.keyId,
          subscription_id: checkout.subscriptionId,
          name: checkout.name || "Smart Billing",
          description: checkout.description || "Smart Billing subscription",
          currency: checkout.currency || "INR",
          prefill: checkout.prefill || {},
          theme: { color: "#0A46E4" },
          method: { upi: true, card: true, netbanking: true, wallet: true },
          modal: { confirm_close: true },
        });
        await verifySubscriptionCheckout({
          token: checkout.checkoutToken,
          razorpay_payment_id: payment.razorpay_payment_id,
          razorpay_subscription_id: payment.razorpay_subscription_id || checkout.subscriptionId,
          razorpay_signature: payment.razorpay_signature,
        });
      }
      await refreshSubscription();
      if (navigation?.canGoBack?.()) navigation.goBack();
    } catch (error) {
      setMessage(error.description || error.message || t("Could not open Razorpay checkout."));
    } finally {
      setBusy(false);
    }
  };

  const subscribe = () => {
    if (migrationMode && priceChange?.required && !subscription.migrationPending) {
      Alert.alert(
        t("Switch autopay plan?"),
        t("Your current autopay will be scheduled to stop at the end of its paid cycle. You will then authorise the selected latest plan in Razorpay."),
        [
          { text: t("Not now"), style: "cancel" },
          { text: t("Continue"), onPress: performCheckout },
        ],
      );
      return;
    }
    performCheckout();
  };

  return (
    <LinearGradient colors={["#EAF1FF", "#F8FAFC", "#FFFFFF"]} style={styles.screen}>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.brand}>
            {navigation?.canGoBack?.() ? (
              <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={20} color="#0F172A" />
              </TouchableOpacity>
            ) : null}
            <View style={styles.brandIcon}><Ionicons name="receipt-outline" size={25} color="#FFF" /></View>
            <Text style={styles.brandText}>Smart Billing</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.heroIcon}>
              <Ionicons name={paymentIssue ? "alert-circle-outline" : "lock-closed-outline"} size={34} color={paymentIssue ? "#B45309" : "#0A46E4"} />
            </View>
            <Text style={styles.title}>
              {migrationMode
                ? t("Update your autopay")
                : manageMode && subscription.accessAllowed
                  ? t("Your subscription")
                  : paymentIssue
                    ? t("Payment needs attention")
                    : t("Your free trial has ended")}
            </Text>
            <Text style={styles.subtitle}>
              {migrationMode
                ? `Your current plan is ₹${Number(priceChange?.currentPlan?.amount || subscription.plan?.amount || 0).toLocaleString("en-IN")}. Choose a latest plan below and securely replace the old autopay.`
                : manageMode && subscription.accessAllowed
                  ? `Your ${subscription.plan?.durationMonths || 1}-month plan is active. No payment action is required.`
                  : paymentIssue
                ? "Razorpay could not complete the latest charge. Refresh after payment succeeds, or continue to Razorpay."
                : `Your 7-day trial ended on ${formatDate(subscription.trialEndsAt, language)}. Choose a plan to continue using the app.`}
            </Text>

            <Text style={styles.planHeading}>{manageMode && !migrationMode ? t("Current plan prices") : t("Choose your billing plan")}</Text>
            {plansLoading ? (
              <View style={styles.plansLoading}>
                <ActivityIndicator color="#0A46E4" />
                <Text style={styles.plansLoadingText}>{t("Loading current prices…")}</Text>
              </View>
            ) : (
              <View style={styles.plans}>
                {plans.map((plan) => {
                  const selected = plan.id === selectedPlan?.id;
                  return (
                    <TouchableOpacity
                      key={plan.id}
                      style={[styles.planCard, selected && styles.planCardSelected]}
                      onPress={() => setSelectedPlanId(plan.id)}
                      activeOpacity={0.85}
                    >
                      <View style={[styles.radio, selected && styles.radioSelected]}>
                        {selected ? <View style={styles.radioDot} /> : null}
                      </View>
                      <View style={styles.planCopy}>
                        <Text style={styles.planDuration}>{plan.durationMonths} {t(plan.durationMonths === 1 ? "month" : "months")}</Text>
                        <Text style={styles.planRenewal}>{t("Renews every")} {plan.durationMonths} {t(plan.durationMonths === 1 ? "month" : "months")}</Text>
                      </View>
                      <Text style={styles.planPrice}>₹{Number(plan.amount).toLocaleString("en-IN")}</Text>
                    </TouchableOpacity>
                  );
                })}
                {!plans.length ? (
                  <Text style={styles.noPlans}>{t("No plan is available right now. Try again shortly.")}</Text>
                ) : null}
              </View>
            )}

            {[
              "Unlimited billing and inventory",
              "Customers, reports and receipts",
              "Automatic Razorpay recurring billing",
              "Server-verified secure access",
            ].map((feature) => (
              <View key={feature} style={styles.feature}>
                <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
                <Text style={styles.featureText}>{t(feature)}</Text>
              </View>
            ))}

            {message ? <View style={styles.messageBox}><Text style={styles.message}>{message}</Text></View> : null}
            {!manageMode || migrationMode ? (
              <TouchableOpacity
                style={[styles.primary, (!selectedPlan || plansLoading) && styles.disabledButton]}
                onPress={subscribe}
                disabled={busy || refreshing || plansLoading || !selectedPlan}
              >
                {busy
                  ? <ActivityIndicator color="#FFF" />
                  : <><Ionicons name="card-outline" size={20} color="#FFF" /><Text style={styles.primaryText}>{migrationMode ? t("Stop old autopay & authorise new plan") : t("Subscribe securely with Razorpay")}</Text></>}
              </TouchableOpacity>
            ) : (
              <View style={styles.currentPlanNote}>
                <Ionicons name="checkmark-circle" size={21} color="#15803D" />
                <Text style={styles.currentPlanText}>{t("Your authorised autopay price stays unchanged until an admin publishes a new plan price.")}</Text>
              </View>
            )}
            <TouchableOpacity style={styles.secondary} onPress={refresh} disabled={busy || refreshing}>
              {refreshing
                ? <ActivityIndicator color="#0A46E4" />
                : <><Ionicons name="refresh-outline" size={20} color="#0A46E4" /><Text style={styles.secondaryText}>{t("Refresh payment status")}</Text></>}
            </TouchableOpacity>
          </View>
          {!navigation?.canGoBack?.() ? (
            <TouchableOpacity onPress={logout} disabled={busy || refreshing}>
              <Text style={styles.logout}>{t("Log out")} · {user?.email}</Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1 },
  content: { flexGrow: 1, justifyContent: "center", padding: 22, paddingVertical: 42 },
  brand: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 22 },
  backButton: { position: "absolute", left: 0, width: 44, height: 44, borderRadius: 15, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0", alignItems: "center", justifyContent: "center" },
  brandIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: "#0A46E4", alignItems: "center", justifyContent: "center" },
  brandText: { color: "#0F172A", fontSize: 21, fontWeight: "900", marginLeft: 10 },
  card: { width: "100%", maxWidth: 480, alignSelf: "center", backgroundColor: "#FFF", borderRadius: 28, borderWidth: 1, borderColor: "#DBE5F3", padding: 24, elevation: 7 },
  heroIcon: { width: 66, height: 66, borderRadius: 22, backgroundColor: "#EAF1FF", alignItems: "center", justifyContent: "center", marginBottom: 20 },
  title: { color: "#0F172A", fontSize: 27, lineHeight: 33, fontWeight: "900" },
  subtitle: { color: "#64748B", lineHeight: 21, marginTop: 10, marginBottom: 20 },
  planHeading: { color: "#0F172A", fontSize: 14, fontWeight: "900", marginBottom: 10 },
  plans: { gap: 10, marginBottom: 20 },
  planCard: { minHeight: 72, flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 18, backgroundColor: "#F8FAFC", borderWidth: 1.5, borderColor: "#E2E8F0" },
  planCardSelected: { borderColor: "#0A46E4", backgroundColor: "#EEF4FF" },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: "#94A3B8", alignItems: "center", justifyContent: "center", marginRight: 11 },
  radioSelected: { borderColor: "#0A46E4" },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#0A46E4" },
  planCopy: { flex: 1 },
  planDuration: { color: "#0F172A", fontWeight: "900" },
  planRenewal: { color: "#64748B", fontSize: 11, marginTop: 4 },
  planPrice: { color: "#0A46E4", fontSize: 22, fontWeight: "900" },
  plansLoading: { minHeight: 78, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 20, borderRadius: 18, backgroundColor: "#F8FAFC" },
  plansLoadingText: { color: "#64748B", fontWeight: "700" },
  noPlans: { color: "#B45309", lineHeight: 19, textAlign: "center", padding: 12 },
  feature: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  featureText: { color: "#334155", fontWeight: "700", marginLeft: 9, flex: 1 },
  messageBox: { padding: 13, borderRadius: 14, backgroundColor: "#FFF7ED", borderWidth: 1, borderColor: "#FED7AA", marginTop: 6, marginBottom: 12 },
  message: { color: "#9A3412", fontSize: 13, lineHeight: 18, textAlign: "center" },
  primary: { minHeight: 56, borderRadius: 18, backgroundColor: "#0A46E4", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, marginTop: 10 },
  disabledButton: { opacity: 0.55 },
  primaryText: { color: "#FFF", fontWeight: "900", textAlign: "center" },
  secondary: { minHeight: 54, borderRadius: 18, backgroundColor: "#FFF", borderWidth: 1, borderColor: "#BFDBFE", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, marginTop: 11 },
  secondaryText: { color: "#0A46E4", fontWeight: "900" },
  currentPlanNote: { minHeight: 60, borderRadius: 17, backgroundColor: "#F0FDF4", borderWidth: 1, borderColor: "#BBF7D0", flexDirection: "row", alignItems: "center", padding: 14, gap: 9 },
  currentPlanText: { color: "#166534", fontSize: 12, fontWeight: "700", lineHeight: 17, flex: 1 },
  logout: { textAlign: "center", color: "#64748B", fontWeight: "700", marginTop: 22 },
});
