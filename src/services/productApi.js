import api from "./api";

export const fetchProducts = async () => {
  const res = await api.get("/products");
  return res.data.data;
};

export const createProduct = async (product) => {
  const res = await api.post("/products", product);
  return res.data.data;
};

export const updateProduct = async (id, product) => {
  const res = await api.put(`/products/${id}`, product);
  return res.data.data;
};

export const deleteProduct = async (id) => {
  await api.delete(`/products/${id}`);
};
