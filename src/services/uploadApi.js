import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import api from "./api";

async function imageDataUri(uri) {
  if (/^data:image\//i.test(uri)) return uri;
  if (Platform.OS === "web") {
    const blob = await (await fetch(uri)).blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Could not read the selected image"));
      reader.readAsDataURL(blob);
    });
  }
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  const extension = uri.split("?")[0].split(".").pop()?.toLowerCase();
  const mime = extension === "png" ? "image/png" : extension === "webp" ? "image/webp" : "image/jpeg";
  return `data:${mime};base64,${base64}`;
}

export async function uploadProductImage(uri) {
  if (!uri || /^https:\/\//i.test(uri)) return { url: uri || "", publicId: "" };
  const image = await imageDataUri(uri);
  return (await api.post("/uploads/product-image", { image })).data.data;
}
