import api from "./api";

export const fetchOrders = async () => (await api.get("/orders")).data.data;
export const createOrder = async (order) => (await api.post("/orders", order)).data.data;
