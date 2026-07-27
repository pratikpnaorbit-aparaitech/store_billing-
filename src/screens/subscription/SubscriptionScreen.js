import React, { useEffect, useState } from "react";
import { ActivityIndicator, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as WebBrowser from "expo-web-browser";
import { createSubscriptionCheckout, fetchSubscriptionPlans, verifySubscriptionCheckout } from "../../services/subscriptionApi";
import { useAuthStore } from "../../store/authStore";

WebBrowser.maybeCompleteAuthSession();

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function SubscriptionScreen() {
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
  const paymentIssue = ["pending", "halted"].includes(subscription.providerStatus);
  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId) || plans[0];

  useEffect(() => {
    let active = true;
    fetchSubscriptionPlans()
      .then((response) => {
        if (!active) return;
        const available = response.plans || [];
        setPlans(available);
        setSelectedPlanId((current) => current || available[0]?.id || "");
      })
      .catch((error) => {
        if (active) setMessage(error.message || "Could not load subscription plans.");
      })
      .finally(() => {
        if (active) setPlansLoading(false);
      });
    return () => { active = false; };
  }, []);

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

  const subscribe = async () => {
    setBusy(true);
    setMessage("");
    try {
      if (!selectedPlan?.id) throw new Error("Choose a subscription plan first.");
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
    } catch (error) {
      setMessage(error.description || error.message || "Could not open Razorpay checkout.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <LinearGradient colors={["#EAF1FF", "#F8FAFC", "#FFFFFF"]} style={styles.screen}>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.brand}>
            <View style={styles.brandIcon}><Ionicons name="receipt-outline" size={25} color="#FFF" /></View>
            <Text style={styles.brandText}>Smart Billing</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.heroIcon}>
              <Ionicons name={paymentIssue ? "alert-circle-outline" : "lock-closed-outline"} size={34} color={paymentIssue ? "#B45309" : "#0A46E4"} />
            </View>
            <Text style={styles.title}>{paymentIssue ? "Payment needs attention" : "Your free trial has ended"}</Text>
            <Text style={styles.subtitle}>
              {paymentIssue
                ? "Razorpay could not complete the latest charge. Refresh after payment succeeds, or continue to Razorpay."
                : `Your 7-day trial ended on ${formatDate(subscription.trialEndsAt)}. Choose a plan to continue using the app.`}
            </Text>

            <Text style={styles.planHeading}>Choose your billing plan</Text>
            {plansLoading ? (
              <View style={styles.plansLoading}>
                <ActivityIndicator color="#0A46E4" />
                <Text style={styles.plansLoadingText}>Loading current prices…</Text>
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
                        <Text style={styles.planDuration}>{plan.durationMonths} month{plan.durationMonths === 1 ? "" : "s"}</Text>
                        <Text style={styles.planRenewal}>Renews every {plan.durationMonths === 1 ? "month" : `${plan.durationMonths} months`}</Text>
                      </View>
                      <Text style={styles.planPrice}>₹{Number(plan.amount).toLocaleString("en-IN")}</Text>
                    </TouchableOpacity>
                  );
                })}
                {!plans.length ? (
                  <Text style={styles.noPlans}>No plan is available right now. Try again shortly.</Text>
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
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}

            {message ? <View style={styles.messageBox}><Text style={styles.message}>{message}</Text></View> : null}
            <TouchableOpacity
              style={[styles.primary, (!selectedPlan || plansLoading) && styles.disabledButton]}
              onPress={subscribe}
              disabled={busy || refreshing || plansLoading || !selectedPlan}
            >
              {busy
                ? <ActivityIndicator color="#FFF" />
                : <><Ionicons name="card-outline" size={20} color="#FFF" /><Text style={styles.primaryText}>Subscribe securely with Razorpay</Text></>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondary} onPress={refresh} disabled={busy || refreshing}>
              {refreshing
                ? <ActivityIndicator color="#0A46E4" />
                : <><Ionicons name="refresh-outline" size={20} color="#0A46E4" /><Text style={styles.secondaryText}>Refresh payment status</Text></>}
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={logout} disabled={busy || refreshing}>
            <Text style={styles.logout}>Log out of {user?.email}</Text>
          </TouchableOpacity>
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
  logout: { textAlign: "center", color: "#64748B", fontWeight: "700", marginTop: 22 },
});
