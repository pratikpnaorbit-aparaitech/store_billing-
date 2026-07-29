import api from "./api";

function asUploadPart(asset) {
  if (asset.file) return asset.file;
  return {
    uri: asset.uri,
    name: asset.name || asset.fileName || `stock-${Date.now()}.jpg`,
    type: asset.mimeType || asset.type || "image/jpeg",
  };
}

export async function previewInventoryFile(asset, language = "en") {
  const form = new FormData();
  form.append("language", language);
  form.append("file", asUploadPart(asset));
  const response = await api.post("/inventory-import/preview", form, {
    timeout: 120000,
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data.data;
}

export async function applyInventoryRows(items) {
  const response = await api.post("/inventory-import/apply", { items }, { timeout: 30000 });
  return response.data.data;
}
