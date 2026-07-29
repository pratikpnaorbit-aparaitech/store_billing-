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

export const lookupProduct = async (barcode) => {
  requireRemoteApi();
  const res = await api.get(`/products/lookup/${encodeURIComponent(barcode)}`);
  return res.data.data;
};

export const adjustProductStock = async (id, changes) => {
  requireRemoteApi();
  const res = await api.patch(`/products/${encodeURIComponent(id)}/stock`, changes);
  return res.data.data;
};

export { hasRemoteApi };
