import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";

import { useProductStore } from "../../store/productStore";
import { useCartStore } from "../../store/cartStore";

export default function ScannerScreen({ navigation, route }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  const products = useProductStore((state) => state.products);
  const addToCart = useCartStore((state) => state.addToCart);

  const handleBarcodeScanned = ({ data }) => {
    if (scanned) return;

    setScanned(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    if (route?.params?.mode === "fillBarcode") {
      navigation.replace("AddProduct", {
        barcode: data,
        product: route?.params?.product,
        draft: route?.params?.draft,
      });
      return;
    }

    const product = products.find((item) => item.barcode === data);

    if (product) {
      const result = addToCart(product);
      if (!result.ok) {
        Alert.alert("Cannot add product", result.message, [
          { text: "Scan Again", onPress: () => setScanned(false) },
        ]);
        return;
      }
      Alert.alert("Product Added", `${product.name} added to cart`, [
        { text: "Scan Again", onPress: () => setScanned(false) },
        { text: "Go to Billing", onPress: () => navigation.navigate("Billing") },
      ]);
    } else {
      Alert.alert("Product Not Found", `Barcode: ${data}`, [
        { text: "Scan Again", onPress: () => setScanned(false) },
        { text: "Add Product", onPress: () => navigation.navigate("AddProduct", { barcode: data }) },
      ]);
    }
  };

  if (!permission) {
    return <View style={styles.center}><Text>Loading camera...</Text></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionScreen}>
        <Ionicons name="camera-outline" size={58} color="#0A46E4" />
        <Text style={styles.permissionTitle}>Camera Permission Required</Text>
        <Text style={styles.permissionText}>Allow camera access to scan product barcodes.</Text>

        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Allow Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "code128", "qr"],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
      />

      <View style={styles.overlay}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Scan Barcode</Text>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setScanned(false)}>
            <Ionicons name="refresh" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.scanBox}>
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
        </View>

        <Text style={styles.hint}>Place barcode inside the frame</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#000" },
  camera: { ...StyleSheet.absoluteFillObject },
  overlay: { flex: 1, padding: 22, justifyContent: "space-between" },
  header: { marginTop: 32, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  iconBtn: {
    width: 46,
    height: 46,
    borderRadius: 18,
    backgroundColor: "rgba(15,23,42,0.65)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { color: "#FFFFFF", fontSize: 20, fontWeight: "900" },
  scanBox: {
    alignSelf: "center",
    width: 280,
    height: 190,
    borderRadius: 26,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 42,
    height: 42,
    borderColor: "#38BDF8",
  },
  topLeft: { top: 0, left: 0, borderTopWidth: 5, borderLeftWidth: 5, borderTopLeftRadius: 18 },
  topRight: { top: 0, right: 0, borderTopWidth: 5, borderRightWidth: 5, borderTopRightRadius: 18 },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: 5, borderLeftWidth: 5, borderBottomLeftRadius: 18 },
  bottomRight: { bottom: 0, right: 0, borderBottomWidth: 5, borderRightWidth: 5, borderBottomRightRadius: 18 },
  hint: {
    marginBottom: 70,
    textAlign: "center",
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 15,
    backgroundColor: "rgba(15,23,42,0.65)",
    alignSelf: "center",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  permissionScreen: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  permissionTitle: { marginTop: 18, fontSize: 22, fontWeight: "900", color: "#0F172A" },
  permissionText: { marginTop: 8, color: "#64748B", fontWeight: "600", textAlign: "center" },
  permissionButton: {
    marginTop: 24,
    height: 54,
    borderRadius: 18,
    backgroundColor: "#0A46E4",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  permissionButtonText: { color: "#FFFFFF", fontWeight: "900" },
});
