import api, { hasRemoteApi } from "./api";

function requireRemoteApi() {
  if (!hasRemoteApi) throw new Error("Remote API is not configured");
}

export const fetchProducts = async () => {
  requireRemoteApi();
  const res = await api.get("/products");
  return res.data.data;
};

export const createProduct = async (product) => {
  requireRemoteApi();
  const res = await api.post("/products", product);
  return res.data.data;
};

export const updateProduct = async (id, product) => {
  requireRemoteApi();
  const res = await api.put(`/products/${id}`, product);
  return res.data.data;
};

export const deleteProduct = async (id) => {
  requireRemoteApi();
  await api.delete(`/products/${id}`);
};

export { hasRemoteApi };
