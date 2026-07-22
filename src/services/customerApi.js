import api from "./api";

export const fetchCustomers = async () => (await api.get("/customers")).data.data;
export const createCustomer = async (customer) => (await api.post("/customers", customer)).data.data;
export const deleteCustomer = async (id) => api.delete(`/customers/${id}`);
