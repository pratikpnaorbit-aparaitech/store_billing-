import { create as createAxios } from "axios";

const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/$/, "") || "";
export const API_BASE_URL = configuredUrl;
export const hasRemoteApi = Boolean(configuredUrl);
let authToken = null;

export function setApiToken(token) {
  authToken = token || null;
}

const api = createAxios({
  baseURL: hasRemoteApi ? `${configuredUrl}/api` : undefined,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  if (authToken) config.headers.Authorization = `Bearer ${authToken}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || error.message || "Network request failed";
    const normalized = new Error(message);
    normalized.status = error.response?.status;
    normalized.code = error.response?.data?.code;
    return Promise.reject(normalized);
  },
);

export default api;
