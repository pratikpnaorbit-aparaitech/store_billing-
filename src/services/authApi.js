import api from "./api";

export const registerAccount = async (payload) => (await api.post("/auth/register", payload)).data.data;
export const loginAccount = async (email, password) => (await api.post("/auth/login", { email, password })).data.data;
export const fetchCurrentUser = async () => (await api.get("/auth/me")).data.data;
export const updateAccountProfile = async (payload) => (await api.put("/auth/profile", payload)).data.data;
export const changeAccountPassword = async (currentPassword, newPassword) => (await api.put("/auth/password", { currentPassword, newPassword })).data;
export const requestPasswordReset = async (email) => (await api.post("/auth/forgot-password", { email })).data;
export const resetPasswordWithCode = async (email, code, newPassword) => (await api.post("/auth/reset-password", { email, code, newPassword })).data;
