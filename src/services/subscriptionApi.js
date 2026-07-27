import api from "./api";

export const fetchSubscriptionStatus = async () => (
  await api.get("/subscriptions/status")
).data.data;

export const fetchSubscriptionPlans = async () => (
  await api.get("/subscriptions/plans")
).data.data;

export const createSubscriptionCheckout = async (planId) => (
  await api.post("/subscriptions/checkout-session", { planId })
).data.data;

export const verifySubscriptionCheckout = async (payload) => (
  await api.post("/subscriptions/checkout/verify", payload)
).data.data;
