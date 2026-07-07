import axios from "axios";

export const API_BASE_URL = "http://10.148.72.217:5000";

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
