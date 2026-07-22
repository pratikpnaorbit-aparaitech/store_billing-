import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { hasRemoteApi, setApiToken } from "../services/api";
import { changeAccountPassword, fetchCurrentUser, loginAccount, requestRegistrationCode, verifyRegistrationCode, requestPasswordReset, resetPasswordWithCode, updateAccountProfile } from "../services/authApi";
import { clearBusinessData } from "../utils/storage";

const AUTH_KEY = "SMART_BILLING_AUTH";

async function getAuthData() {
  try {
    const raw = Platform.OS === "web" ? await AsyncStorage.getItem(AUTH_KEY) : await SecureStore.getItemAsync(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

async function setAuthData(data) {
  const raw = JSON.stringify(data);
  if (Platform.OS === "web") return AsyncStorage.setItem(AUTH_KEY, raw);
  return SecureStore.setItemAsync(AUTH_KEY, raw);
}

async function removeAuthData() {
  if (Platform.OS === "web") return AsyncStorage.removeItem(AUTH_KEY);
  return SecureStore.deleteItemAsync(AUTH_KEY);
}

export const useAuthStore = create((set, get) => ({
  user: null,
  ready: false,
  cloudMode: hasRemoteApi,
  connectionStatus: hasRemoteApi ? "pending" : "offline",

  hydrateAuth: async () => {
    const saved = await getAuthData();
    if (!saved?.session) return set({ ready: true, user: null, connectionStatus: hasRemoteApi ? "online" : "offline" });
    if (!hasRemoteApi) return set({ ready: true, user: saved.user || null, connectionStatus: "offline" });
    if (!saved.token) return set({ ready: true, user: null, connectionStatus: "online" });
    setApiToken(saved.token);
    try {
      const user = await fetchCurrentUser();
      await setAuthData({ user, token: saved.token, session: true, mode: "cloud" });
      set({ user, ready: true, connectionStatus: "online" });
    } catch (error) {
      if (error.status === 401) {
        setApiToken(null);
        await removeAuthData();
        await clearBusinessData();
        set({ user: null, ready: true, connectionStatus: "online" });
      } else {
        set({ user: saved.user || null, ready: true, connectionStatus: "offline" });
      }
    }
  },

  register: async ({ name, email, phone, password, storeName }) => {
    const payload = { name: name.trim(), email: email.trim().toLowerCase(), phone: phone?.trim() || "", password, storeName: storeName.trim() || "My Store" };
    if (hasRemoteApi) throw new Error("Email verification is required for cloud registration.");
    const user = { name: payload.name, email: payload.email, storeName: payload.storeName };
    await setAuthData({ user, credentials: { email: payload.email, password }, session: true, mode: "local" });
    set({ user, ready: true, connectionStatus: "offline" });
    return user;
  },

  requestRegistration: async (details) => {
    const payload = {
      name: details.name.trim(),
      storeName: details.storeName.trim(),
      email: details.email.trim().toLowerCase(),
      phone: details.phone.trim(),
      password: details.password,
    };
    if (!hasRemoteApi) {
      try { await get().register(payload); return { ok: true, local: true }; }
      catch (error) { return { ok: false, message: error.message }; }
    }
    try { await requestRegistrationCode(payload); return { ok: true, email: payload.email }; }
    catch (error) { return { ok: false, message: error.message }; }
  },

  verifyRegistration: async (email, code) => {
    if (!hasRemoteApi) return { ok: true };
    try {
      const { user, token } = await verifyRegistrationCode(email.trim().toLowerCase(), code);
      setApiToken(token);
      await setAuthData({ user, token, session: true, mode: "cloud" });
      set({ user, ready: true, connectionStatus: "online" });
      return { ok: true, user };
    } catch (error) { return { ok: false, message: error.message }; }
  },

  login: async (email, password) => {
    try {
      if (hasRemoteApi) {
        const { user, token } = await loginAccount(email.trim().toLowerCase(), password);
        setApiToken(token);
        await setAuthData({ user, token, session: true, mode: "cloud" });
        set({ user, connectionStatus: "online" });
        return { ok: true };
      }
      const saved = await getAuthData();
      if (!saved?.credentials) return { ok: false, message: "No account found. Create an account first." };
      if (saved.credentials.email !== email.trim().toLowerCase() || saved.credentials.password !== password) return { ok: false, message: "Email or password is incorrect." };
      await setAuthData({ ...saved, session: true });
      set({ user: saved.user });
      return { ok: true };
    } catch (error) { return { ok: false, message: error.message }; }
  },

  resetPassword: async (email, password) => {
    if (hasRemoteApi) return { ok: false, message: "Request an email reset code first." };
    const saved = await getAuthData();
    if (!saved?.credentials || saved.credentials.email !== email.trim().toLowerCase()) return { ok: false, message: "No account exists for this email." };
    await setAuthData({ ...saved, credentials: { ...saved.credentials, password }, session: false });
    set({ user: null });
    return { ok: true };
  },

  requestPasswordReset: async (email) => {
    if (!hasRemoteApi) return { ok: true };
    try { await requestPasswordReset(email); return { ok: true }; }
    catch (error) { return { ok: false, message: error.message }; }
  },

  completePasswordReset: async (email, code, newPassword) => {
    if (!hasRemoteApi) return get().resetPassword(email, newPassword);
    try { await resetPasswordWithCode(email, code, newPassword); return { ok: true }; }
    catch (error) { return { ok: false, message: error.message }; }
  },

  updateProfile: async (updates) => {
    const saved = await getAuthData();
    const user = hasRemoteApi ? await updateAccountProfile(updates) : { ...(saved?.user || get().user), ...updates };
    await setAuthData({ ...saved, user, session: true });
    set({ user, connectionStatus: hasRemoteApi ? "online" : "offline" });
    return user;
  },

  changePassword: async (currentPassword, newPassword) => {
    if (!hasRemoteApi) return { ok: false, message: "Use Forgot Password for a local account." };
    try { await changeAccountPassword(currentPassword, newPassword); return { ok: true }; }
    catch (error) { return { ok: false, message: error.message }; }
  },

  logout: async () => {
    const saved = await getAuthData();
    setApiToken(null);
    set({ user: null, connectionStatus: hasRemoteApi ? "pending" : "offline" });
    if (hasRemoteApi) {
      await Promise.allSettled([removeAuthData(), clearBusinessData()]);
    } else if (saved) {
      await Promise.allSettled([setAuthData({ ...saved, session: false })]);
    }
  },

  deleteAccount: async () => {
    setApiToken(null);
    await removeAuthData();
    set({ user: null, ready: true });
  },
}));
