import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  Image,
  Modal,
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
import { useTranslation } from "../../i18n";
import {
  getCachedCameraPermission,
  rememberCameraPermission,
} from "../../services/cameraPermission";

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
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraPermission = permission || getCachedCameraPermission();
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
  const [scanLineProgress] = useState(() => new Animated.Value(0));
  const successTimer = useRef(null);
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const scanFrameWidth = Math.min(windowWidth * 0.76, 310);
  const scanFrameHeight = scanFrameWidth / 1.45;

  const products = useProductStore((state) => state.products);
  const lookupBarcode = useProductStore((state) => state.lookupBarcode);
  const addToCart = useCartStore((state) => state.addToCart);
  const cartCount = useCartStore((state) => (
    state.cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
  ));

  useEffect(() => {
    rememberCameraPermission(permission);
  }, [permission]);

  const requestCameraAccess = async () => {
    const nextPermission = await requestPermission();
    rememberCameraPermission(nextPermission);
  };

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

  useEffect(() => {
    if (!isFocused || !cameraReady || scanned || manualPickerVisible) {
      scanLineProgress.stopAnimation();
      scanLineProgress.setValue(0);
      return undefined;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineProgress, {
          toValue: 1,
          duration: 1700,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scanLineProgress, {
          toValue: 0,
          duration: 1700,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [cameraReady, isFocused, manualPickerVisible, scanLineProgress, scanned]);

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
    if (onComplete) {
      successTimer.current = setTimeout(() => {
        Animated.timing(successOpacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }).start(() => {
          setScanSuccess(null);
          onComplete();
        });
      }, 1200);
    }
  };

  const closeScanSuccess = (scanNext = false) => {
    clearTimeout(successTimer.current);
    Animated.timing(successOpacity, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setScanSuccess(null);
      if (scanNext) setScanned(false);
    });
  };

  const scanNextProduct = () => closeScanSuccess(true);

  const openManualAfterScan = () => {
    const barcode = scanSuccess?.barcode;
    const productMissing = scanSuccess?.productMissing;
    const productSetup = scanSuccess?.productSetup;
    const product = scanSuccess?.product;
    clearTimeout(successTimer.current);
    setScanSuccess(null);
    if (productSetup && product) {
      navigation.navigate("AddProduct", { product });
      return;
    }
    if (productMissing && barcode) {
      navigation.navigate("AddProduct", { barcode });
      return;
    }
    openManualPicker();
  };

  const goToBillingAfterScan = () => {
    clearTimeout(successTimer.current);
    setScanSuccess(null);
    goToBilling();
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

  const handleBarcodeScanned = async ({ data }) => {
    if (scanned) return;

    setScanned(true);

    if (route?.params?.mode === "fillBarcode") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      playSuccess({
        title: t("Barcode captured"),
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

    let product = products.find((item) => String(item.barcode) === String(data));
    if (!product) {
      try {
        product = await lookupBarcode(data);
      } catch (error) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        Alert.alert(t("Lookup failed"), error.message, [
          { text: t("Scan New"), onPress: () => setScanned(false) },
        ]);
        return;
      }
    }

    if (product) {
      if (Number(product.stock || 0) <= 0 || Number(product.price || 0) <= 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
        playSuccess({
          title: t("Product found"),
          detail: `${product.name}: ${t("Set its price and stock before billing.")}`,
          eyebrow: t("SETUP REQUIRED"),
          product,
          productSetup: true,
        });
        return;
      }
      const result = addToCart(product);
      if (!result.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        Alert.alert(t("Cannot add"), result.message, [
          { text: t("Scan New"), onPress: () => setScanned(false) },
        ]);
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      playSuccess({
        title: t("Scan successful"),
        detail: `${product.name} ${t("added to bill")}`,
        eyebrow: t("PRODUCT ADDED"),
      });
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      playSuccess({
        title: t("Barcode scanned"),
        detail: t("This product is not saved yet. Add its details once to use it in future bills."),
        eyebrow: t("NEW BARCODE"),
        barcode: String(data),
        productMissing: true,
      });
    }
  };

  if (!cameraPermission) {
    return (
      <View style={styles.cameraWarmup} />
    );
  }

  if (!cameraPermission.granted) {
    return (
      <View style={styles.permissionScreen}>
        <Ionicons name="camera-outline" size={58} color="#0A46E4" />
        <Text style={styles.permissionTitle}>{t("Camera Permission Required")}</Text>
        <Text style={styles.permissionText}>{t("Allow camera access to scan product barcodes.")}</Text>

        <TouchableOpacity style={styles.permissionButton} onPress={requestCameraAccess}>
          <Text style={styles.permissionButtonText}>{t("Allow Camera")}</Text>
        </TouchableOpacity>

        {route?.params?.mode !== "fillBarcode" ? (
          <TouchableOpacity
            style={styles.permissionManualButton}
            onPress={openManualPicker}
          >
            <Ionicons name="basket-outline" size={20} color="#0A46E4" />
            <Text style={styles.permissionManualText}>{t("Add without barcode")}</Text>
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

      <Modal
        visible={showCamera && !scanSuccess}
        transparent
        statusBarTranslucent
        animationType="none"
        presentationStyle="overFullScreen"
        onRequestClose={() => navigation.goBack()}
      >
        <View style={styles.modalOverlayRoot}>
          <View pointerEvents="box-none" style={styles.overlay}>
            <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
          <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={23} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("Scan Barcode")}</Text>
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
                <View style={styles.scanFrameSurface} />
                <View style={styles.scanFrameLabel}>
                  <Ionicons name="barcode-outline" size={15} color="#FFFFFF" />
                  <Text style={styles.scanFrameLabelText}>{t("BARCODE AREA")}</Text>
                </View>
                <Animated.View
                  style={[
                    styles.scanLine,
                    {
                      transform: [{
                        translateY: scanLineProgress.interpolate({
                          inputRange: [0, 1],
                          outputRange: [9, scanFrameHeight - 12],
                        }),
                      }],
                    },
                  ]}
                />
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
                {cameraReady ? t("Place the full barcode inside all four corners") : t("Starting camera preview...")}
              </Text>
            </View>

          </View>

          <View
            style={[styles.bottomActions, { paddingBottom: Math.max(insets.bottom, 16) }]}
          >
            {cameraError ? (
              <View style={styles.errorBox}>
                <Ionicons name="warning-outline" size={19} color="#991B1B" />
                <Text style={styles.errorText} numberOfLines={2}>{cameraError}</Text>
                <TouchableOpacity onPress={retryCamera}>
                  <Text style={styles.retryText}>{t("Retry")}</Text>
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
                    <Text style={styles.manualButtonTitle}>{t("No barcode? Add manually")}</Text>
                    <Text style={styles.manualButtonText}>{t("Choose an item or create a new one")}</Text>
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
      </Modal>

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
        <Modal
          visible
          transparent
          statusBarTranslucent
          animationType="none"
          presentationStyle="overFullScreen"
          onRequestClose={scanNextProduct}
        >
          <Animated.View
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
              {scanSuccess.eyebrow ? (
                <Text style={styles.successEyebrow}>{scanSuccess.eyebrow}</Text>
              ) : null}
              <Text style={styles.successTitle}>{scanSuccess.title}</Text>
              <Text style={styles.successDetail}>{scanSuccess.detail}</Text>

              {route?.params?.mode === "fillBarcode" ? (
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
              ) : (
                <View style={styles.successActions}>
                  <TouchableOpacity
                    activeOpacity={0.82}
                    style={[styles.successAction, styles.successActionPrimary, !cartCount && styles.successActionDisabled]}
                    onPress={goToBillingAfterScan}
                    disabled={!cartCount}
                  >
                    <Ionicons name="receipt-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.successActionPrimaryText}>{t("Go to Billing")}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.82}
                    style={styles.successAction}
                    onPress={scanNextProduct}
                  >
                    <Ionicons name="scan-outline" size={20} color="#0A46E4" />
                    <Text style={styles.successActionText}>{t("Scan New")}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.82}
                    style={styles.successAction}
                    onPress={openManualAfterScan}
                  >
                    <Ionicons name="add-circle-outline" size={20} color="#0A46E4" />
                    <Text style={styles.successActionText}>
                      {scanSuccess.productSetup ? t("Set Up Product") : t("Add Manually")}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </Animated.View>
        </Modal>
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
  modalOverlayRoot: {
    flex: 1,
    backgroundColor: "transparent",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    elevation: 1000,
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
  },
  scanBox: {
    borderRadius: 26,
    position: "relative",
    shadowColor: "#000000",
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 20,
  },
  scanFrameSurface: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.42)",
    backgroundColor: "rgba(15, 23, 42, 0.18)",
  },
  scanFrameLabel: {
    position: "absolute",
    top: -39,
    alignSelf: "center",
    minHeight: 28,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.28)",
    backgroundColor: "rgba(2, 6, 23, 0.78)",
  },
  scanFrameLabelText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.25,
  },
  scanLine: {
    position: "absolute",
    left: 15,
    right: 15,
    top: 0,
    height: 3,
    borderRadius: 99,
    backgroundColor: "#22D3EE",
    shadowColor: "#22D3EE",
    shadowOpacity: 1,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 0 },
    elevation: 22,
  },
  corner: {
    position: "absolute",
    width: 52,
    height: 52,
    borderColor: "#FFFFFF",
    zIndex: 4,
    elevation: 24,
  },
  topLeft: { top: -2, left: -2, borderTopWidth: 6, borderLeftWidth: 6, borderTopLeftRadius: 20 },
  topRight: { top: -2, right: -2, borderTopWidth: 6, borderRightWidth: 6, borderTopRightRadius: 20 },
  bottomLeft: { bottom: -2, left: -2, borderBottomWidth: 6, borderLeftWidth: 6, borderBottomLeftRadius: 20 },
  bottomRight: { bottom: -2, right: -2, borderBottomWidth: 6, borderRightWidth: 6, borderBottomRightRadius: 20 },
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
    bottom: 54,
    gap: 10,
    zIndex: 1001,
    elevation: 1001,
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
  cameraWarmup: {
    flex: 1,
    backgroundColor: "#020617",
  },
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
    flex: 1,
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
    marginTop: 7,
  },
  successEyebrow: {
    color: "#15803D",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.4,
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
  successActions: {
    width: "100%",
    marginTop: 23,
    gap: 9,
  },
  successAction: {
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    backgroundColor: "#EFF6FF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  successActionPrimary: {
    borderColor: "#0A46E4",
    backgroundColor: "#0A46E4",
  },
  successActionDisabled: {
    opacity: 0.45,
  },
  successActionText: {
    color: "#0A46E4",
    fontSize: 14,
    fontWeight: "900",
  },
  successActionPrimaryText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
});
