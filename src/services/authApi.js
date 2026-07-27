import api from "./api";

export const requestRegistrationCode = async (payload) => (await api.post("/auth/register/request", payload, { timeout: 30000 })).data;
export const verifyRegistrationCode = async (email, code, device) => (await api.post("/auth/register/verify", { email, code, ...device }, { timeout: 30000 })).data.data;
export const loginAccount = async (email, password, device) => (await api.post("/auth/login", { email, password, ...device })).data.data;
export const logoutAccount = async () => (await api.post("/auth/logout")).data;
export const fetchCurrentUser = async () => (await api.get("/auth/me")).data.data;
export const updateAccountProfile = async (payload) => (await api.put("/auth/profile", payload)).data.data;
export const changeAccountPassword = async (currentPassword, newPassword) => (await api.put("/auth/password", { currentPassword, newPassword })).data;
export const requestPasswordReset = async (email) => (await api.post("/auth/forgot-password", { email }, { timeout: 30000 })).data;
export const resetPasswordWithCode = async (email, code, newPassword) => (await api.post("/auth/reset-password", { email, code, newPassword }, { timeout: 30000 })).data;
