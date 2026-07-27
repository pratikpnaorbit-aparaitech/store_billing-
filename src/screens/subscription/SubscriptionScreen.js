import React, { useState } from "react";
import { ActivityIndicator, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as WebBrowser from "expo-web-browser";
import { createSubscriptionCheckout, verifySubscriptionCheckout } from "../../services/subscriptionApi";
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
  const subscription = user?.subscription || {};
  const monthlyAmount = Number(subscription.plan?.amount || 300);
  const paymentIssue = ["pending", "halted"].includes(subscription.providerStatus);

  const refresh = async () => {
    setRefreshing(true);
    setMessage("");
    try {
      const updated = await refreshSubscription();
      if (!updated?.accessAllowed) setMessage("Subscription is not active yet. Complete or retry the Razorpay payment.");
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
      const checkout = await createSubscriptionCheckout();
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
          description: checkout.description || "Monthly subscription",
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
          <View style={styles.brand}><View style={styles.brandIcon}><Ionicons name="receipt-outline" size={25} color="#FFF" /></View><Text style={styles.brandText}>Smart Billing</Text></View>
          <View style={styles.card}>
            <View style={styles.heroIcon}><Ionicons name={paymentIssue ? "alert-circle-outline" : "lock-closed-outline"} size={34} color={paymentIssue ? "#B45309" : "#0A46E4"} /></View>
            <Text style={styles.title}>{paymentIssue ? "Payment needs attention" : "Your free trial has ended"}</Text>
            <Text style={styles.subtitle}>
              {paymentIssue
                ? "Razorpay could not complete the latest monthly charge. Refresh after payment succeeds, or continue to Razorpay."
                : `Your 7-day trial ended on ${formatDate(subscription.trialEndsAt)}. Activate the monthly plan to continue using the app.`}
            </Text>

            <View style={styles.priceRow}><Text style={styles.price}>₹{monthlyAmount.toLocaleString("en-IN")}</Text><Text style={styles.period}>/ month</Text></View>
            {[
              "Unlimited billing and inventory",
              "Customers, reports and receipts",
              "Automatic monthly Razorpay billing",
              "Server-verified secure access",
            ].map((feature) => (
              <View key={feature} style={styles.feature}><Ionicons name="checkmark-circle" size={20} color="#16A34A" /><Text style={styles.featureText}>{feature}</Text></View>
            ))}

            {message ? <View style={styles.messageBox}><Text style={styles.message}>{message}</Text></View> : null}
            <TouchableOpacity style={styles.primary} onPress={subscribe} disabled={busy || refreshing}>
              {busy ? <ActivityIndicator color="#FFF" /> : <><Ionicons name="card-outline" size={20} color="#FFF" /><Text style={styles.primaryText}>Subscribe securely with Razorpay</Text></>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondary} onPress={refresh} disabled={busy || refreshing}>
              {refreshing ? <ActivityIndicator color="#0A46E4" /> : <><Ionicons name="refresh-outline" size={20} color="#0A46E4" /><Text style={styles.secondaryText}>Refresh payment status</Text></>}
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={logout} disabled={busy || refreshing}><Text style={styles.logout}>Log out of {user?.email}</Text></TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, safe: { flex: 1 }, content: { flexGrow: 1, justifyContent: "center", padding: 22, paddingVertical: 42 },
  brand: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 22 },
  brandIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: "#0A46E4", alignItems: "center", justifyContent: "center" },
  brandText: { color: "#0F172A", fontSize: 21, fontWeight: "900", marginLeft: 10 },
  card: { width: "100%", maxWidth: 480, alignSelf: "center", backgroundColor: "#FFF", borderRadius: 28, borderWidth: 1, borderColor: "#DBE5F3", padding: 24, elevation: 7 },
  heroIcon: { width: 66, height: 66, borderRadius: 22, backgroundColor: "#EAF1FF", alignItems: "center", justifyContent: "center", marginBottom: 20 },
  title: { color: "#0F172A", fontSize: 27, lineHeight: 33, fontWeight: "900" },
  subtitle: { color: "#64748B", lineHeight: 21, marginTop: 10, marginBottom: 20 },
  priceRow: { flexDirection: "row", alignItems: "flex-end", padding: 17, borderRadius: 18, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0", marginBottom: 20 },
  price: { color: "#0A46E4", fontSize: 34, fontWeight: "900" }, period: { color: "#64748B", fontWeight: "700", marginBottom: 6, marginLeft: 6 },
  feature: { flexDirection: "row", alignItems: "center", marginBottom: 12 }, featureText: { color: "#334155", fontWeight: "700", marginLeft: 9, flex: 1 },
  messageBox: { padding: 13, borderRadius: 14, backgroundColor: "#FFF7ED", borderWidth: 1, borderColor: "#FED7AA", marginTop: 6, marginBottom: 12 },
  message: { color: "#9A3412", fontSize: 13, lineHeight: 18, textAlign: "center" },
  primary: { minHeight: 56, borderRadius: 18, backgroundColor: "#0A46E4", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, marginTop: 10 },
  primaryText: { color: "#FFF", fontWeight: "900", textAlign: "center" },
  secondary: { minHeight: 54, borderRadius: 18, backgroundColor: "#FFF", borderWidth: 1, borderColor: "#BFDBFE", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, marginTop: 11 },
  secondaryText: { color: "#0A46E4", fontWeight: "900" },
  logout: { textAlign: "center", color: "#64748B", fontWeight: "700", marginTop: 22 },
});
