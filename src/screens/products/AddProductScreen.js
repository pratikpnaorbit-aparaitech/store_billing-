import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { useProductStore } from "../../store/productStore";
import { hasRemoteApi } from "../../services/api";
import { uploadProductImage } from "../../services/uploadApi";
import { createManualBarcode, isManualBarcode } from "../../utils/products";

const MANUAL_ITEM_OPTIONS = [
  { name: "Rice", category: "Grains" },
  { name: "Wheat", category: "Grains" },
  { name: "Toor Dal", category: "Pulses" },
  { name: "Moong Dal", category: "Pulses" },
  { name: "Chana Dal", category: "Pulses" },
  { name: "Sugar", category: "Grocery" },
  { name: "Jaggery", category: "Grocery" },
  { name: "Peanuts", category: "Grocery" },
  { name: "Onion", category: "Produce" },
  { name: "Potato", category: "Produce" },
];
const CATEGORY_OPTIONS = [
  "Grocery",
  "Grains",
  "Pulses",
  "Dairy",
  "Drinks",
  "Snacks",
  "Produce",
  "Bakery",
  "Frozen",
  "Spices",
  "Personal Care",
  "Household",
  "Stationery",
  "Medicine",
  "Other",
];
const UNIT_OPTIONS = ["250 g", "500 g", "1 kg", "2 kg", "5 kg", "1 pc", "1 litre"];
const STOCK_OPTIONS = ["10", "25", "50", "100"];

export default function AddProductScreen({ navigation, route }) {
  const editing = route?.params?.product;
  const draft = route?.params?.draft;
  const manualMode = Boolean(
    route?.params?.manual ||
    isManualBarcode(editing?.barcode) ||
    isManualBarcode(draft?.barcode),
  );
  const [image, setImage] = useState(draft?.image || editing?.image || null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: draft?.name ?? editing?.name ?? "",
    barcode: route?.params?.barcode ?? draft?.barcode ?? editing?.barcode ?? "",
    category: draft?.category ?? editing?.category ?? "",
    price: draft?.price ?? (editing ? String(editing.price) : ""),
    stock: draft?.stock ?? (editing ? String(editing.stock) : ""),
    unit: draft?.unit ?? editing?.unit ?? "",
  });

  const addProduct = useProductStore((state) => state.addProduct);
  const updateProduct = useProductStore((state) => state.updateProduct);
  const categoryOptions = form.category && !CATEGORY_OPTIONS.includes(form.category)
    ? [form.category, ...CATEGORY_OPTIONS]
    : CATEGORY_OPTIONS;

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const saveProduct = async () => {
    const price = Number(form.price);
    const stock = Number(form.stock || 0);
    if (!form.name.trim() || !Number.isFinite(price) || price <= 0) {
      Alert.alert("Invalid details", "Product name and a selling price greater than zero are required.");
      return;
    }
    if (!Number.isInteger(stock) || stock < 0) {
      Alert.alert("Invalid stock", "Stock must be a whole number of zero or more.");
      return;
    }

    let uploadedImage = { url: image || "", publicId: editing?.imagePublicId || "" };
    setSaving(true);
    try {
      if (hasRemoteApi && image && !/^https:\/\//i.test(image)) {
        uploadedImage = await uploadProductImage(image);
      }
    } catch (error) {
      setSaving(false);
      Alert.alert("Photo upload failed", `${error.message}. Check image storage configuration and try again.`);
      return;
    }
    const product = {
      name: form.name.trim(),
      barcode: form.barcode.trim() || createManualBarcode(),
      category: form.category.trim() || "Grocery",
      price,
      stock,
      unit: form.unit.trim() || "1 pc",
      image: uploadedImage.url,
      imagePublicId: uploadedImage.publicId,
    };
    try {
      if (editing) await updateProduct(editing.id, product);
      else await addProduct(product);
      navigation.goBack();
    } catch (error) {
      setSaving(false);
      Alert.alert("Could not save product", error.message);
    }
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Permission needed", "Please allow gallery access to select product image.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      if (Platform.OS === "web" || !FileSystem.documentDirectory) {
        setImage(asset.uri);
      } else {
        const extension = asset.fileName?.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || "jpg";
        const destination = `${FileSystem.documentDirectory}product-${Date.now()}.${extension}`;
        await FileSystem.copyAsync({ from: asset.uri, to: destination });
        setImage(destination);
      }
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.title}>
          {editing
            ? manualMode ? "Edit No-Barcode Item" : "Edit Product"
            : manualMode ? "Add No-Barcode Item" : "Add Product"}
        </Text>
      </View>

      {manualMode ? (
        <View style={styles.manualIntro}>
          <View style={styles.manualIntroIcon}>
            <Ionicons name="basket-outline" size={24} color="#0A46E4" />
          </View>
          <View style={styles.manualIntroCopy}>
            <Text style={styles.manualIntroTitle}>Set up once, then tap to bill</Text>
            <Text style={styles.manualIntroText}>
              This item will appear under “Add manually” and does not need a barcode.
            </Text>
          </View>
        </View>
      ) : (
        <>
          <TouchableOpacity activeOpacity={0.85} style={styles.imagePicker} onPress={pickImage}>
            {image ? (
              <Image source={{ uri: image }} style={styles.productImage} />
            ) : (
              <>
                <Ionicons name="camera-outline" size={34} color="#0A46E4" />
                <Text style={styles.imageTitle}>Add Product Photo</Text>
                <Text style={styles.imageSub}>Tap to choose from gallery</Text>
              </>
            )}
          </TouchableOpacity>

          {image ? (
            <TouchableOpacity onPress={pickImage}>
              <Text style={styles.changeImage}>Change Image</Text>
            </TouchableOpacity>
          ) : null}
        </>
      )}

      {manualMode ? (
        <View style={styles.quickSection}>
          <View style={styles.optionHeading}>
            <Text style={styles.quickTitle}>Common loose items</Text>
            <Text style={styles.swipeHint}>Swipe & tap</Text>
          </View>
          <ScrollView
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickOptions}
          >
            {MANUAL_ITEM_OPTIONS.map((item) => (
              <QuickOption
                key={item.name}
                label={item.name}
                active={form.name === item.name}
                onPress={() => setForm((current) => ({
                  ...current,
                  name: item.name,
                  category: item.category,
                }))}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}

      {[
        ["Product Name", "name"],
        ...(!manualMode ? [["Barcode (optional)", "barcode"]] : []),
        ["Category", "category"],
        ["Selling Price", "price"],
        ["Stock Quantity", "stock"],
        ["Unit", "unit"],
      ].map(([label, key]) => (
        <View key={key} style={styles.field}>
          <View style={styles.optionHeading}>
            <Text style={styles.label}>{label}</Text>
            {["category", "stock", "unit"].includes(key) ? (
              <Text style={styles.swipeHint}>Swipe & tap</Text>
            ) : null}
          </View>
          {key === "category" ? (
            <ScrollView
              horizontal
              nestedScrollEnabled
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.fieldOptions}
            >
              {categoryOptions.map((item) => (
                <QuickOption
                  key={item}
                  label={item}
                  active={form.category === item}
                  onPress={() => updateField("category", item)}
                />
              ))}
            </ScrollView>
          ) : (
            <View style={styles.inputRow}>
              <TextInput
                value={form[key]}
                onChangeText={(text) => updateField(key, text)}
                placeholder={label}
                placeholderTextColor="#94A3B8"
                style={styles.input}
                keyboardType={key === "price" || key === "stock" ? "numeric" : "default"}
              />
              {key === "barcode" ? (
                <TouchableOpacity
                  style={styles.scanBtn}
                  onPress={() => navigation.navigate("BarcodeScanner", {
                    mode: "fillBarcode",
                    product: editing,
                    draft: { ...form, image },
                  })}
                >
                  <Ionicons name="scan-outline" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              ) : null}
            </View>
          )}
          {key === "stock" ? (
            <ScrollView
              horizontal
              nestedScrollEnabled
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.fieldOptions}
            >
              {STOCK_OPTIONS.map((item) => (
                <QuickOption
                  key={item}
                  label={item}
                  active={form.stock === item}
                  onPress={() => updateField("stock", item)}
                />
              ))}
            </ScrollView>
          ) : null}
          {key === "unit" ? (
            <ScrollView
              horizontal
              nestedScrollEnabled
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.fieldOptions}
            >
              {UNIT_OPTIONS.map((item) => (
                <QuickOption
                  key={item}
                  label={item}
                  active={form.unit === item}
                  onPress={() => updateField("unit", item)}
                />
              ))}
            </ScrollView>
          ) : null}
        </View>
      ))}

      <TouchableOpacity activeOpacity={0.85} style={styles.button} onPress={saveProduct} disabled={saving}>
        <Text style={styles.buttonText}>{saving ? "Saving..." : editing ? "Update Product" : "Save Product"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function QuickOption({ label, active, onPress }) {
  return (
    <TouchableOpacity
      activeOpacity={0.78}
      onPress={onPress}
      style={[styles.quickOption, active && styles.quickOptionActive]}
    >
      <Text style={[styles.quickOptionText, active && styles.quickOptionTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 20, paddingTop: 44, paddingBottom: 40 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 24 },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginRight: 14,
  },
  title: { flex: 1, fontSize: 26, fontWeight: "900", color: "#0F172A" },
  manualIntro: {
    borderRadius: 20,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  manualIntroIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
  },
  manualIntroCopy: { flex: 1, paddingLeft: 12 },
  manualIntroTitle: { color: "#1E3A8A", fontWeight: "900" },
  manualIntroText: { color: "#475569", fontSize: 12, fontWeight: "600", lineHeight: 17, marginTop: 3 },
  quickSection: { marginBottom: 18 },
  optionHeading: {
    minHeight: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  quickTitle: { color: "#0F172A", fontSize: 13, fontWeight: "800" },
  swipeHint: { color: "#0A46E4", fontSize: 10, fontWeight: "800" },
  quickOptions: { flexDirection: "row", gap: 8, paddingTop: 9, paddingRight: 18 },
  fieldOptions: {
    flexDirection: "row",
    gap: 8,
    paddingTop: 9,
    paddingRight: 18,
    paddingBottom: 2,
  },
  quickOption: {
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  quickOptionActive: { backgroundColor: "#0A46E4", borderColor: "#0A46E4" },
  quickOptionText: { color: "#475569", fontSize: 12, fontWeight: "800" },
  quickOptionTextActive: { color: "#FFFFFF" },
  imagePicker: {
    height: 170,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    overflow: "hidden",
  },
  productImage: { width: "100%", height: "100%" },
  imageTitle: { marginTop: 10, fontSize: 15, fontWeight: "900", color: "#0F172A" },
  imageSub: { marginTop: 4, fontSize: 12, fontWeight: "600", color: "#64748B" },
  changeImage: { textAlign: "center", color: "#0A46E4", fontWeight: "900", marginBottom: 18 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "800", color: "#0F172A" },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
  },
  input: {
    flex: 1,
    height: 54,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 16,
    fontSize: 15,
    color: "#0F172A",
  },
  scanBtn: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: "#0A46E4",
    alignItems: "center",
    justifyContent: "center",
  },
  button: {
    height: 56,
    borderRadius: 18,
    backgroundColor: "#0A46E4",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  buttonText: { color: "#FFFFFF", fontWeight: "900", fontSize: 15 },
});
