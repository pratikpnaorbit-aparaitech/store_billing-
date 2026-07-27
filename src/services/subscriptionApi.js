import api from "./api";

export const fetchSubscriptionStatus = async () => (
  await api.get("/subscriptions/status")
).data.data;

export const createSubscriptionCheckout = async () => (
  await api.post("/subscriptions/checkout-session")
).data.data;
