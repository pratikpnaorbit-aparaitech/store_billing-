import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import dayjs from "dayjs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCartStore } from "../../store/cartStore";
import { useProductStore } from "../../store/productStore";
import { useOrderStore } from "../../store/orderStore";
import { useCustomerStore } from "../../store/customerStore";
import { generateAndShareReceiptPDF } from "../../utils/pdfGenerator";
import { buildThermalReceipt } from "../../utils/printer/thermalReceipt";
import { createInvoiceNo, formatCurrency } from "../../utils/billing";
import { hasRemoteApi } from "../../services/api";
import { useAuthStore } from "../../store/authStore";
import { useTranslation } from "../../i18n";
import { notifyLowStock } from "../../services/notifications";
import { buildUpiPaymentUri, isValidUpiId } from "../../utils/upi";

export default function ReceiptScreen({ navigation, route }) {
  const { language, t } = useTranslation();
  const liveCart = useCartStore((state) => state.cart);
  const clearCart = useCartStore((state) => state.clearCart);
  const reduceStock = useProductStore((state) => state.reduceStock);
  const addOrder = useOrderStore((state) => state.addOrder);
  const orders = useOrderStore((state) => state.orders);
  const updateCustomerStats = useCustomerStore((state) => state.updateCustomerStats);
  const user = useAuthStore((state) => state.user);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [busy, setBusy] = useState(false);
  const [liveInvoiceNo] = useState(() => createInvoiceNo());
  const [liveCreatedAt] = useState(() => new Date().toISOString());
  const labels = {
    tagline: t("Scan • Bill • Print"),
    invoice: t("Invoice"),
    date: t("Date"),
    customer: t("Customer"),
    payment: t("Payment"),
    walkInCustomer: t("Walk-in Customer"),
    subtotal: t("Subtotal"),
    discount: t("Discount"),
    total: t("TOTAL"),
    thankYou: t("Thank you"),
    item: t("ITEM"),
    qty: t("QTY"),
    rate: t("RATE"),
    receipt: t("Receipt"),
    allowPopups: t("Allow pop-ups to print the receipt."),
  };

  const historyOrderId = route?.params?.orderId;
  const isHistory = Boolean(route?.params?.fromHistory && historyOrderId);
  const historyOrder = isHistory
    ? orders.find((order) => String(order.id || order._id) === String(historyOrderId))
    : null;
  const historyCart = historyOrder?.cart || historyOrder?.items || [];
  const historyCustomer = historyOrder?.customer || {
    id: historyOrder?.customerId || "walk-in",
    name: historyOrder?.customerName || "Walk-in Customer",
  };

  const data = isHistory
    ? historyOrder && {
      ...historyOrder,
      storeName: historyOrder.storeName || user?.storeName || user?.name || "My Store",
      gstNo: historyOrder.gstNo || user?.gstNo || "",
      cart: historyCart,
      invoiceNo: historyOrder.invoiceNo,
      date: historyOrder.date || dayjs(historyOrder.createdAt).locale(language).format("DD MMM YYYY, hh:mm A"),
      payment: historyOrder.payment || "Cash",
      subtotal: Number(historyOrder.subtotal || 0),
      gstRate: Number(historyOrder.gstRate || 0),
      gst: Number(historyOrder.gst || 0),
      discount: Number(historyOrder.discount || 0),
      total: Number(historyOrder.total || 0),
      customer: historyCustomer,
    }
    : {
      cart: liveCart,
      storeName: user?.storeName || user?.name || "My Store",
      gstNo: user?.gstNo || "",
      invoiceNo: liveInvoiceNo,
      date: dayjs(liveCreatedAt).locale(language).format("DD MMM YYYY, hh:mm A"),
      payment: "Cash",
      subtotal: 0,
      gstRate: 5,
      gst: 0,
      discount: 0,
      total: 0,
      customer: { id: "walk-in", name: "Walk-in Customer" },
      ...(route?.params || {}),
    };
  const showPaymentQr = Boolean(
    !isHistory
    && data
    && ["UPI", "Card"].includes(data.payment)
    && isValidUpiId(user?.upiId)
    && Number(data.total) > 0,
  );
  const paymentQrValue = showPaymentQr
    ? buildUpiPaymentUri({
      upiId: user.upiId,
      payeeName: data.storeName,
      amount: data.total,
      transactionRef: data.invoiceNo,
    })
    : "";
  const qrSize = Math.min(260, Math.max(180, width - 88));

  const sharePDF = async () => {
    try {
      await generateAndShareReceiptPDF({ ...data, labels });
    } catch (error) {
      Alert.alert(t("PDF failed"), error.message);
    }
  };
  const previewThermalReceipt = () => Alert.alert(t("Thermal Receipt Preview"), buildThermalReceipt({ ...data, labels }));

  const finishSale = async () => {
    if (isHistory || busy || !liveCart.length) return;
    setBusy(true);
    try {
      const savedOrder = await addOrder({ ...data, createdAt: liveCreatedAt, customer: data.customer });
      if (hasRemoteApi) {
        await Promise.allSettled([
          reduceStock(liveCart),
          updateCustomerStats(data.customer?.id || "walk-in", data.total),
        ]);
      } else {
        await reduceStock(liveCart);
        await updateCustomerStats(data.customer?.id || "walk-in", data.total);
      }
      await clearCart();
      const lowStock = hasRemoteApi
        ? (savedOrder.lowStock || [])
        : useProductStore.getState().products.filter((product) => (
          Number(product.stock) <= 10 && liveCart.some((item) => String(item.id) === String(product.id))
        ));
      await notifyLowStock(lowStock);
      navigation.reset({ index: 0, routes: [{ name: "Main" }] });
    } catch (error) {
      setBusy(false);
      Alert.alert(t("Sale not completed"), error.message);
    }
  };

  if (!data) {
    return (
      <View style={styles.screen}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
            <Ionicons name="arrow-back" size={22} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.title}>{t("Bill Details")}</Text>
        </View>
        <View style={styles.missing}>
          <Ionicons name="receipt-outline" size={52} color="#94A3B8" />
          <Text style={styles.missingTitle}>{t("Bill not found")}</Text>
          <Text style={styles.missingText}>{t("Return to Bill History and open it again.")}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.title}>{isHistory ? t("Bill Details") : t("Receipt")}</Text>
      </View>

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.receipt}>
          <Text style={styles.store}>{data.storeName}</Text>
          <Text style={styles.sub}>{t("Scan • Bill • Print")}</Text>
          {data.gstNo ? <Text selectable style={styles.gstNo}>GSTIN: {data.gstNo}</Text> : null}
          <View style={styles.line} />

          <Info label={t("Invoice")} value={data.invoiceNo} />
          <Info label={t("Date")} value={data.date} />
          <Info label={t("Customer")} value={data.customer?.name || t("Walk-in Customer")} />
          <Info label={t("Payment")} value={t(data.payment)} />

          <View style={styles.line} />

          {data.cart.map((item, index) => (
            <View
              style={styles.item}
              key={String(item.id || item.productId || item.barcode || `${item.name}-${index}`)}
            >
              <View style={styles.flex}>
                <Text selectable style={styles.itemName}>{item.name}</Text>
                <Text selectable style={styles.itemMeta}>
                  {item.quantity} × {formatCurrency(item.price)}
                </Text>
              </View>
              <Text selectable style={styles.itemAmount}>
                {formatCurrency(Number(item.price) * Number(item.quantity))}
              </Text>
            </View>
          ))}

          <View style={styles.line} />
          <Info label={t("Subtotal")} value={formatCurrency(data.subtotal)} />
          <Info label={`GST ${data.gstRate}%`} value={formatCurrency(data.gst)} />
          <Info label={t("Discount")} value={formatCurrency(data.discount)} />

          <View style={styles.total}>
            <Text style={styles.totalLabel}>{t("TOTAL")}</Text>
            <Text selectable style={styles.totalValue}>{formatCurrency(data.total)}</Text>
          </View>
          <Text style={styles.thanks}>{t("Thank you")} ❤️</Text>
        </View>

        {showPaymentQr ? (
          <View style={styles.paymentQrCard}>
            <View style={styles.paymentQrHeading}>
              <View style={styles.paymentQrIcon}>
                <Ionicons name="qr-code" size={25} color="#0A46E4" />
              </View>
              <View style={styles.flex}>
                <Text style={styles.paymentQrEyebrow}>{t("PAYMENT QR")}</Text>
                <Text style={styles.paymentQrTitle}>{t("Scan to pay exact bill amount")}</Text>
              </View>
            </View>

            <View style={styles.paymentAmountPill}>
              <Text style={styles.paymentAmountLabel}>{t("Exact bill amount")}</Text>
              <Text selectable style={styles.paymentAmount}>{formatCurrency(data.total)}</Text>
            </View>

            <View style={styles.qrSurface}>
              <QRCode
                value={paymentQrValue}
                size={qrSize}
                ecl="M"
                quietZone={10}
                color="#0F172A"
                backgroundColor="#FFFFFF"
              />
            </View>
            <Text style={styles.scanText}>{t("Scan with any UPI app")}</Text>
            <Text selectable style={styles.upiId}>{user.upiId}</Text>
            {data.payment === "Card" ? (
              <Text style={styles.paymentHelp}>
                {t("For Card, choose an eligible linked card in the UPI app.")}
              </Text>
            ) : null}
            <View style={styles.confirmNotice}>
              <Ionicons name="alert-circle-outline" size={19} color="#92400E" />
              <Text style={styles.confirmNoticeText}>
                {t("Confirm that payment was received before completing the sale.")}
              </Text>
            </View>
          </View>
        ) : null}

        <TouchableOpacity style={styles.primary} onPress={sharePDF}>
          <Ionicons name="share-outline" size={20} color="#FFF" />
          <Text style={styles.primaryText}>{t("Share PDF Receipt")}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondary} onPress={previewThermalReceipt}>
          <Text style={styles.secondaryText}>{t("Thermal Preview")}</Text>
        </TouchableOpacity>

        {!isHistory ? (
          <TouchableOpacity style={styles.complete} onPress={finishSale} disabled={busy}>
            <Text style={styles.primaryText}>{busy ? t("Saving Sale...") : t("Complete Sale")}</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Info({ label, value }) {
  return (
    <View style={styles.info}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text selectable style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  back: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginRight: 14,
  },
  title: { fontSize: 28, fontWeight: "900", color: "#0F172A" },
  content: { padding: 20, paddingBottom: 45 },
  receipt: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  store: {
    textAlign: "center",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 1,
    color: "#0F172A",
  },
  sub: { textAlign: "center", marginTop: 4, color: "#64748B", fontWeight: "700" },
  gstNo: { textAlign: "center", marginTop: 4, color: "#334155", fontSize: 12, fontWeight: "800" },
  line: { height: 1, backgroundColor: "#E2E8F0", marginVertical: 16 },
  info: { flexDirection: "row", justifyContent: "space-between", marginBottom: 9, gap: 16 },
  infoLabel: { color: "#64748B", fontWeight: "700" },
  infoValue: { color: "#0F172A", fontWeight: "900", flexShrink: 1, textAlign: "right" },
  item: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14, gap: 12 },
  flex: { flex: 1 },
  itemName: { fontWeight: "900", color: "#0F172A" },
  itemMeta: { marginTop: 4, color: "#64748B", fontSize: 12 },
  itemAmount: { fontWeight: "900", color: "#0A46E4" },
  total: {
    marginTop: 14,
    borderRadius: 18,
    backgroundColor: "#0F172A",
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  totalLabel: { color: "#FFF", fontWeight: "900", fontSize: 16 },
  totalValue: { color: "#FFF", fontWeight: "900", fontSize: 20 },
  thanks: { textAlign: "center", marginTop: 18, color: "#64748B", fontWeight: "800" },
  paymentQrCard: {
    marginTop: 18,
    borderRadius: 26,
    padding: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    alignItems: "center",
  },
  paymentQrHeading: { width: "100%", flexDirection: "row", alignItems: "center", gap: 12 },
  paymentQrIcon: { width: 50, height: 50, borderRadius: 18, backgroundColor: "#EFF6FF", alignItems: "center", justifyContent: "center" },
  paymentQrEyebrow: { color: "#0A46E4", fontSize: 10, fontWeight: "900", letterSpacing: 1.3 },
  paymentQrTitle: { color: "#0F172A", fontSize: 17, fontWeight: "900", marginTop: 3 },
  paymentAmountPill: { width: "100%", borderRadius: 18, backgroundColor: "#0F172A", padding: 14, marginTop: 17, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  paymentAmountLabel: { color: "#CBD5E1", fontSize: 12, fontWeight: "800" },
  paymentAmount: { color: "#FFFFFF", fontSize: 22, fontWeight: "900", fontVariant: ["tabular-nums"] },
  qrSurface: { marginTop: 18, padding: 7, borderRadius: 18, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0" },
  scanText: { color: "#0F172A", fontSize: 15, fontWeight: "900", marginTop: 14 },
  upiId: { color: "#0A46E4", fontSize: 13, fontWeight: "800", marginTop: 5 },
  paymentHelp: { color: "#64748B", fontSize: 11, lineHeight: 17, fontWeight: "600", textAlign: "center", marginTop: 8, paddingHorizontal: 6 },
  confirmNotice: { width: "100%", borderRadius: 16, backgroundColor: "#FFFBEB", borderWidth: 1, borderColor: "#FDE68A", padding: 12, marginTop: 16, flexDirection: "row", alignItems: "center", gap: 9 },
  confirmNoticeText: { color: "#92400E", fontSize: 11, lineHeight: 17, fontWeight: "700", flex: 1 },
  primary: {
    marginTop: 18,
    height: 56,
    borderRadius: 18,
    backgroundColor: "#0A46E4",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  complete: {
    marginTop: 12,
    height: 56,
    borderRadius: 18,
    backgroundColor: "#16A34A",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { color: "#FFF", fontWeight: "900" },
  secondary: {
    marginTop: 12,
    height: 54,
    borderRadius: 18,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: { color: "#0F172A", fontWeight: "900" },
  missing: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28 },
  missingTitle: { marginTop: 14, color: "#0F172A", fontSize: 21, fontWeight: "900" },
  missingText: { marginTop: 6, color: "#64748B", fontWeight: "600", textAlign: "center" },
});
