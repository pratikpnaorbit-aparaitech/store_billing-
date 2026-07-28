import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ManualProductPicker from "../../components/products/ManualProductPicker";
import { useProductStore } from "../../store/productStore";
import { useCartStore } from "../../store/cartStore";

const BARCODE_TYPES = [
  "ean13",
  "ean8",
  "upc_a",
  "upc_e",
  "code128",
  "code39",
  "code93",
  "itf14",
  "codabar",
  "qr",
  "datamatrix",
  "pdf417",
  "aztec",
];

export default function ScannerScreen({ navigation, route }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [cameraKey, setCameraKey] = useState(0);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [manualPickerVisible, setManualPickerVisible] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(null);
  const [successOpacity] = useState(() => new Animated.Value(0));
  const [successScale] = useState(() => new Animated.Value(0.7));
  const [checkScale] = useState(() => new Animated.Value(0));
  const [pulse] = useState(() => new Animated.Value(0));
  const successTimer = useRef(null);
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const scanFrameWidth = Math.min(windowWidth * 0.76, 310);
  const scanFrameHeight = scanFrameWidth / 1.45;

  const products = useProductStore((state) => state.products);
  const addToCart = useCartStore((state) => state.addToCart);
  const cartCount = useCartStore((state) => (
    state.cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
  ));

  useEffect(() => {
    const unsubscribeFocus = navigation.addListener("focus", () => {
      setScanned(false);
      setCameraReady(false);
      setTorchEnabled(false);
      setCameraError("");
      setScanSuccess(null);
    });
    const unsubscribeBlur = navigation.addListener("blur", () => {
      setCameraReady(false);
      setTorchEnabled(false);
    });
    return () => {
      clearTimeout(successTimer.current);
      unsubscribeFocus();
      unsubscribeBlur();
    };
  }, [navigation]);

  const playSuccess = (details, onComplete) => {
    clearTimeout(successTimer.current);
    setScanSuccess(details);
    successOpacity.setValue(0);
    successScale.setValue(0.7);
    checkScale.setValue(0);
    pulse.setValue(0);
    Animated.parallel([
      Animated.timing(successOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.spring(successScale, {
        toValue: 1,
        friction: 6,
        tension: 95,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(150),
        Animated.spring(checkScale, {
          toValue: 1,
          friction: 5,
          tension: 120,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(pulse, {
        toValue: 1,
        duration: 850,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
    successTimer.current = setTimeout(() => {
      Animated.timing(successOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start(() => {
        setScanSuccess(null);
        if (onComplete) onComplete();
        else setScanned(false);
      });
    }, 1350);
  };

  const retryCamera = () => {
    setScanned(false);
    setCameraReady(false);
    setCameraError("");
    setCameraKey((value) => value + 1);
  };

  const openManualPicker = () => {
    setCameraReady(false);
    setTorchEnabled(false);
    setManualPickerVisible(true);
  };

  const closeManualPicker = () => {
    setManualPickerVisible(false);
    setScanned(false);
    setCameraReady(false);
    setCameraError("");
  };

  const goToBilling = () => {
    if (route?.params?.returnToBilling && navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate("Billing");
  };

  const handleBarcodeScanned = ({ data }) => {
    if (scanned) return;

    setScanned(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    if (route?.params?.mode === "fillBarcode") {
      playSuccess({
        title: "Barcode captured",
        detail: String(data),
      }, () => {
        navigation.replace("AddProduct", {
          barcode: data,
          product: route?.params?.product,
          draft: route?.params?.draft,
        });
      });
      return;
    }

    const product = products.find((item) => String(item.barcode) === String(data));

    if (product) {
      const result = addToCart(product);
      if (!result.ok) {
        Alert.alert("Cannot add product", result.message, [
          { text: "Scan Again", onPress: () => setScanned(false) },
        ]);
        return;
      }
      playSuccess({
        title: "Scan successful",
        detail: `${product.name} added to bill`,
      });
    } else {
      Alert.alert("Product Not Found", `Barcode: ${data}`, [
        { text: "Scan Again", onPress: () => setScanned(false) },
        { text: "Add Product", onPress: () => navigation.navigate("AddProduct", { barcode: data }) },
      ]);
    }
  };

  if (!permission) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Loading camera...</Text>
      </View>
    );
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

        {route?.params?.mode !== "fillBarcode" ? (
          <TouchableOpacity
            style={styles.permissionManualButton}
            onPress={openManualPicker}
          >
            <Ionicons name="basket-outline" size={20} color="#0A46E4" />
            <Text style={styles.permissionManualText}>Add without barcode</Text>
          </TouchableOpacity>
        ) : null}

        <ManualProductPicker
          visible={manualPickerVisible}
          onClose={closeManualPicker}
          onCreateProduct={() => {
            closeManualPicker();
            navigation.navigate("AddProduct", { manual: true });
          }}
          onGoToBilling={() => {
            closeManualPicker();
            goToBilling();
          }}
        />
      </View>
    );
  }

  const showCamera = isFocused && !manualPickerVisible;

  return (
    <View style={styles.screen}>
      <View style={styles.cameraLayer}>
        {showCamera ? (
          <CameraView
            key={cameraKey}
            style={styles.camera}
            facing="back"
            mode="picture"
            enableTorch={torchEnabled}
            barcodeScannerSettings={{ barcodeTypes: BARCODE_TYPES }}
            onCameraReady={() => {
              setCameraReady(true);
              setCameraError("");
            }}
            onMountError={({ message }) => {
              setCameraReady(false);
              setCameraError(message || "Camera preview could not start.");
            }}
            onBarcodeScanned={cameraReady && !scanned ? handleBarcodeScanned : undefined}
          />
        ) : (
          <View style={styles.cameraPlaceholder} />
        )}
      </View>

      <View style={styles.overlay}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
          <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={23} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Scan Barcode</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.smallIconButton, torchEnabled && styles.smallIconButtonActive]}
              onPress={() => setTorchEnabled((value) => !value)}
            >
              <Ionicons name={torchEnabled ? "flash" : "flash-outline"} size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.smallIconButton} onPress={retryCamera}>
              <Ionicons name="refresh" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.scannerContent}>
          <View
            style={[
              styles.scanBox,
              { width: scanFrameWidth, height: scanFrameHeight },
            ]}
          >
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>

          <Text
            style={[
              styles.hint,
              { top: "50%", marginTop: scanFrameHeight / 2 + 24 },
            ]}
          >
            {cameraReady ? "Place barcode inside the frame" : "Starting camera preview..."}
          </Text>
        </View>

        <View
          style={[styles.bottomActions, { paddingBottom: Math.max(insets.bottom, 16) }]}
        >
          {cameraError ? (
            <View style={styles.errorBox}>
              <Ionicons name="warning-outline" size={19} color="#991B1B" />
              <Text style={styles.errorText} numberOfLines={2}>{cameraError}</Text>
              <TouchableOpacity onPress={retryCamera}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {route?.params?.mode !== "fillBarcode" ? (
            <View style={styles.saleActions}>
              <TouchableOpacity
                activeOpacity={0.82}
                style={styles.manualButton}
                onPress={openManualPicker}
              >
                <View style={styles.manualButtonIcon}>
                  <Ionicons name="basket-outline" size={23} color="#0A46E4" />
                </View>
                <View style={styles.manualButtonCopy}>
                  <Text style={styles.manualButtonTitle}>No barcode?</Text>
                  <Text style={styles.manualButtonText}>Tap to add rice, dal and other items</Text>
                </View>
                <Ionicons name="chevron-up" size={20} color="#64748B" />
              </TouchableOpacity>

              {cartCount ? (
                <TouchableOpacity style={styles.cartButton} onPress={goToBilling}>
                  <Ionicons name="cart" size={20} color="#FFFFFF" />
                  <Text style={styles.cartButtonText}>{cartCount}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>

      <ManualProductPicker
        visible={manualPickerVisible}
        onClose={closeManualPicker}
        onCreateProduct={() => {
          closeManualPicker();
          navigation.navigate("AddProduct", { manual: true });
        }}
        onGoToBilling={() => {
          closeManualPicker();
          goToBilling();
        }}
      />
      {scanSuccess ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.successBackdrop,
            {
              opacity: successOpacity,
              transform: [{ scale: successScale }],
            },
          ]}
        >
          <View style={styles.successCard}>
            <View style={styles.successLogoWrap}>
              <Image source={require("../../assets/images/logo.png")} style={styles.successLogo} />
              <Animated.View
                style={[
                  styles.pulseRing,
                  {
                    opacity: pulse.interpolate({
                      inputRange: [0, 0.65, 1],
                      outputRange: [0.7, 0.2, 0],
                    }),
                    transform: [{
                      scale: pulse.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.7, 1.65],
                      }),
                    }],
                  },
                ]}
              />
              <Animated.View style={[styles.checkBadge, { transform: [{ scale: checkScale }] }]}>
                <Ionicons name="checkmark" size={30} color="#FFFFFF" />
              </Animated.View>
            </View>
            <Text style={styles.successTitle}>{scanSuccess.title}</Text>
            <Text style={styles.successDetail}>{scanSuccess.detail}</Text>
            <View style={styles.successProgress}>
              <Animated.View
                style={[
                  styles.successProgressFill,
                  {
                    transform: [{
                      scaleX: pulse.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.05, 1],
                      }),
                    }],
                  },
                ]}
              />
            </View>
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
    backgroundColor: "#000000",
  },
  cameraLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    pointerEvents: "none",
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  cameraPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#020617",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
    elevation: 1,
    pointerEvents: "box-none",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: "rgba(15, 23, 42, 0.72)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "900",
    textShadowColor: "rgba(0, 0, 0, 0.45)",
    textShadowRadius: 6,
  },
  headerActions: { flexDirection: "row", gap: 8 },
  smallIconButton: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: "rgba(15, 23, 42, 0.72)",
    alignItems: "center",
    justifyContent: "center",
  },
  smallIconButtonActive: { backgroundColor: "#F59E0B" },
  scannerContent: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none",
  },
  scanBox: {
    borderRadius: 26,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 44,
    height: 44,
    borderColor: "#38BDF8",
  },
  topLeft: { top: 0, left: 0, borderTopWidth: 5, borderLeftWidth: 5, borderTopLeftRadius: 18 },
  topRight: { top: 0, right: 0, borderTopWidth: 5, borderRightWidth: 5, borderTopRightRadius: 18 },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: 5, borderLeftWidth: 5, borderBottomLeftRadius: 18 },
  bottomRight: { bottom: 0, right: 0, borderBottomWidth: 5, borderRightWidth: 5, borderBottomRightRadius: 18 },
  hint: {
    position: "absolute",
    alignSelf: "center",
    textAlign: "center",
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
    backgroundColor: "rgba(15, 23, 42, 0.72)",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    overflow: "hidden",
  },
  bottomActions: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 0,
    gap: 10,
  },
  saleActions: { flexDirection: "row", alignItems: "stretch", gap: 10 },
  manualButton: {
    flex: 1,
    minHeight: 68,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  manualButtonIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: "#EAF1FF",
    alignItems: "center",
    justifyContent: "center",
  },
  manualButtonCopy: { flex: 1, paddingHorizontal: 10 },
  manualButtonTitle: { color: "#0F172A", fontSize: 14, fontWeight: "900" },
  manualButtonText: { color: "#64748B", fontSize: 11, fontWeight: "600", marginTop: 2 },
  cartButton: {
    width: 62,
    borderRadius: 22,
    backgroundColor: "#0A46E4",
    alignItems: "center",
    justifyContent: "center",
  },
  cartButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900", marginTop: 2 },
  errorBox: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: "#FEE2E2",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 8,
  },
  errorText: { flex: 1, color: "#991B1B", fontSize: 12, fontWeight: "700" },
  retryText: { color: "#991B1B", fontWeight: "900" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },
  loadingText: { color: "#64748B", fontWeight: "700" },
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
  permissionManualButton: {
    marginTop: 12,
    height: 50,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    backgroundColor: "#EFF6FF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    gap: 7,
  },
  permissionManualText: { color: "#0A46E4", fontWeight: "900" },
  successBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 8,
    elevation: 8,
    alignItems: "center",
    justifyContent: "center",
    padding: 26,
    backgroundColor: "rgba(2, 6, 23, 0.72)",
  },
  successCard: {
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
    borderRadius: 30,
    paddingHorizontal: 24,
    paddingVertical: 30,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.75)",
  },
  successLogoWrap: {
    width: 112,
    height: 112,
    alignItems: "center",
    justifyContent: "center",
  },
  successLogo: {
    width: 82,
    height: 82,
    borderRadius: 25,
    resizeMode: "contain",
  },
  pulseRing: {
    position: "absolute",
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 4,
    borderColor: "#22C55E",
  },
  checkBadge: {
    position: "absolute",
    right: 1,
    bottom: 1,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#16A34A",
    borderWidth: 5,
    borderColor: "#FFFFFF",
  },
  successTitle: {
    color: "#0F172A",
    fontSize: 24,
    fontWeight: "900",
    marginTop: 15,
  },
  successDetail: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 7,
  },
  successProgress: {
    width: "78%",
    height: 5,
    borderRadius: 99,
    backgroundColor: "#DCFCE7",
    overflow: "hidden",
    marginTop: 22,
  },
  successProgressFill: {
    flex: 1,
    borderRadius: 99,
    backgroundColor: "#22C55E",
    transformOrigin: "left",
  },
});
