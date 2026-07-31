import React, { useMemo, useState } from "react";
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useOrderStore } from "../../store/orderStore";
import { formatCurrency, getDailySalesInsights, toLocalDateKey } from "../../utils/billing";
import { useTranslation } from "../../i18n";

function Metric({ icon, label, value, tone }) {
  return (
    <View style={styles.metric}>
      <View style={[styles.metricIcon, { backgroundColor: `${tone}14` }]}>
        <Ionicons name={icon} size={20} color={tone} />
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

export default function SalesInsightsScreen({ navigation }) {
  const { language, t } = useTranslation();
  const orders = useOrderStore((state) => state.orders);
  const insets = useSafeAreaInsets();
  const dateKeys = useMemo(() => {
    const keys = [...new Set(orders.map((order) => toLocalDateKey(order.createdAt || order.date)).filter(Boolean))]
      .sort()
      .reverse();
    const today = toLocalDateKey(new Date());
    return keys.includes(today) ? keys : [today, ...keys];
  }, [orders]);
  const [selectedDate, setSelectedDate] = useState(dateKeys[0] || toLocalDateKey(new Date()));
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => dayjs(selectedDate).startOf("month"));
  const insights = useMemo(
    () => getDailySalesInsights(orders, selectedDate),
    [orders, selectedDate],
  );
  const calendarDays = useMemo(() => {
    const firstDayOffset = calendarMonth.startOf("month").day();
    const daysInMonth = calendarMonth.daysInMonth();
    return [
      ...Array.from({ length: firstDayOffset }, () => null),
      ...Array.from({ length: daysInMonth }, (_, index) => calendarMonth.date(index + 1)),
    ];
  }, [calendarMonth]);

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>{t("BUSINESS ANALYTICS")}</Text>
          <Text style={styles.title}>{t("Daily Sales")}</Text>
        </View>
        <TouchableOpacity
          style={styles.calendarButton}
          onPress={() => {
            setCalendarMonth(dayjs(selectedDate).startOf("month"));
            setCalendarVisible(true);
          }}
          accessibilityLabel={t("Open calendar")}
        >
          <Ionicons name="calendar-outline" size={22} color="#0A46E4" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>{t("Choose a sales date")}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateRow}
        >
          {dateKeys.map((key) => {
            const active = key === selectedDate;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.dateChip, active && styles.dateChipActive]}
                onPress={() => setSelectedDate(key)}
              >
                <Text style={[styles.dateDay, active && styles.dateTextActive]}>
                  {dayjs(key).locale(language).format("DD")}
                </Text>
                <Text style={[styles.dateMonth, active && styles.dateTextActive]}>
                  {dayjs(key).locale(language).format("MMM")}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.hero}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroLabel}>{dayjs(selectedDate).locale(language).format("dddd, DD MMMM YYYY")}</Text>
            <Text style={styles.heroValue}>{formatCurrency(insights.revenue)}</Text>
            <Text style={styles.heroCaption}>{t("Total sales collected")}</Text>
          </View>
          <View style={styles.heroIcon}>
            <Ionicons name="trending-up" size={28} color="#FFFFFF" />
          </View>
        </View>

        <View style={styles.metrics}>
          <Metric icon="receipt-outline" label={t("Bills")} value={String(insights.totalOrders)} tone="#0A46E4" />
          <Metric icon="cube-outline" label={t("Items Sold")} value={String(insights.productsSold)} tone="#7C3AED" />
          <Metric icon="calculator-outline" label={t("Average bill")} value={formatCurrency(insights.averageBill)} tone="#059669" />
        </View>

        <Text style={styles.heading}>{t("Top product")}</Text>
        {insights.topProduct ? (
          <View style={styles.topProduct}>
            <View style={styles.trophy}>
              <Ionicons name="trophy" size={26} color="#B45309" />
            </View>
            <View style={styles.flex}>
              <Text style={styles.topName}>{insights.topProduct.name}</Text>
              <Text style={styles.topMeta}>{insights.topProduct.quantity} unit(s) sold</Text>
            </View>
            <Text style={styles.topRevenue}>{formatCurrency(insights.topProduct.revenue)}</Text>
          </View>
        ) : (
          <View style={styles.empty}>
            <Ionicons name="bar-chart-outline" size={42} color="#94A3B8" />
            <Text style={styles.emptyTitle}>{t("No sales on this date")}</Text>
            <Text style={styles.emptyText}>{t("Completed bills will appear here automatically.")}</Text>
          </View>
        )}

        {insights.orders.length ? (
          <>
            <Text style={styles.heading}>{t("Bills on this date")}</Text>
            <View style={styles.orderList}>
              {insights.orders.map((order) => (
                <TouchableOpacity
                  key={String(order.id || order._id)}
                  style={styles.orderRow}
                  onPress={() => navigation.navigate("Receipt", {
                    orderId: order.id || order._id,
                    fromHistory: true,
                  })}
                >
                  <View style={styles.orderIcon}>
                    <Ionicons name="receipt-outline" size={19} color="#0A46E4" />
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.orderTitle}>{order.invoiceNo}</Text>
                    <Text style={styles.orderMeta}>
                      {dayjs(order.createdAt || order.date).locale(language).format("hh:mm A")} • {order.customer?.name || order.customerName || t("Walk-in Customer")}
                    </Text>
                  </View>
                  <Text style={styles.orderAmount}>{formatCurrency(order.total)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>

      <Modal
        visible={calendarVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCalendarVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.calendarCard}>
            <View style={styles.calendarHeader}>
              <TouchableOpacity
                style={styles.monthButton}
                onPress={() => setCalendarMonth((value) => value.subtract(1, "month"))}
              >
                <Ionicons name="chevron-back" size={22} color="#0F172A" />
              </TouchableOpacity>
              <Text style={styles.monthTitle}>
                {calendarMonth.locale(language).format("MMMM YYYY")}
              </Text>
              <TouchableOpacity
                style={styles.monthButton}
                onPress={() => setCalendarMonth((value) => value.add(1, "month"))}
              >
                <Ionicons name="chevron-forward" size={22} color="#0F172A" />
              </TouchableOpacity>
            </View>
            <View style={styles.weekRow}>
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                <Text key={day} style={styles.weekDay}>{t(day)}</Text>
              ))}
            </View>
            <View style={styles.calendarGrid}>
              {calendarDays.map((date, index) => {
                if (!date) return <View key={`blank-${index}`} style={styles.dayCell} />;
                const dateKey = date.format("YYYY-MM-DD");
                const active = dateKey === selectedDate;
                const hasSales = orders.some((order) => (
                  toLocalDateKey(order.createdAt || order.date) === dateKey
                ));
                return (
                  <TouchableOpacity
                    key={dateKey}
                    style={[styles.dayCell, active && styles.dayCellActive]}
                    onPress={() => {
                      setSelectedDate(dateKey);
                      setCalendarVisible(false);
                    }}
                  >
                    <Text style={[styles.dayText, active && styles.dayTextActive]}>{date.date()}</Text>
                    {hasSales ? <View style={[styles.salesDot, active && styles.salesDotActive]} /> : null}
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity
              style={styles.todayButton}
              onPress={() => {
                const today = toLocalDateKey(new Date());
                setSelectedDate(today);
                setCalendarMonth(dayjs(today).startOf("month"));
                setCalendarVisible(false);
              }}
            >
              <Text style={styles.todayText}>{t("Today")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F6F8FC", overflow: "hidden" },
  header: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 20, paddingBottom: 14 },
  back: { width: 46, height: 46, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0" },
  headerCopy: { flex: 1 },
  calendarButton: { width: 46, height: 46, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#BFDBFE" },
  eyebrow: { color: "#0A46E4", fontSize: 10, fontWeight: "900", letterSpacing: 1.5 },
  title: { color: "#0F172A", fontSize: 27, fontWeight: "900", marginTop: 2 },
  content: { width: "100%", minWidth: 0, padding: 20, paddingBottom: 50 },
  sectionLabel: { color: "#64748B", fontSize: 12, fontWeight: "800", marginBottom: 10 },
  dateRow: { gap: 9, paddingBottom: 20 },
  dateChip: { width: 62, height: 70, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0" },
  dateChipActive: { backgroundColor: "#0A46E4", borderColor: "#0A46E4" },
  dateDay: { color: "#0F172A", fontSize: 21, fontWeight: "900" },
  dateMonth: { color: "#64748B", fontSize: 11, fontWeight: "800", marginTop: 2, textTransform: "uppercase" },
  dateTextActive: { color: "#FFFFFF" },
  hero: { width: "100%", maxWidth: "100%", minWidth: 0, overflow: "hidden", borderRadius: 26, padding: 22, backgroundColor: "#0F172A", flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  heroCopy: { flex: 1, minWidth: 0, paddingRight: 10 },
  heroLabel: { color: "#94A3B8", fontSize: 12, fontWeight: "700" },
  heroValue: { color: "#FFFFFF", fontSize: 32, fontWeight: "900", marginTop: 8 },
  heroCaption: { color: "#CBD5E1", fontSize: 12, marginTop: 4 },
  heroIcon: { flexShrink: 0, width: 56, height: 56, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "#0A46E4" },
  metrics: { width: "100%", minWidth: 0, flexDirection: "row", gap: 10, marginTop: 12 },
  metric: { flex: 1, minWidth: 0, minHeight: 126, padding: 12, borderRadius: 21, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0" },
  metricIcon: { width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  metricValue: { flexShrink: 1, color: "#0F172A", fontSize: 15, fontWeight: "900", marginTop: 13 },
  metricLabel: { color: "#64748B", fontSize: 10, fontWeight: "700", marginTop: 3 },
  heading: { color: "#0F172A", fontSize: 19, fontWeight: "900", marginTop: 26, marginBottom: 12 },
  topProduct: { width: "100%", minWidth: 0, minHeight: 86, padding: 15, borderRadius: 22, flexDirection: "row", alignItems: "center", backgroundColor: "#FFFBEB", borderWidth: 1, borderColor: "#FDE68A" },
  trophy: { width: 48, height: 48, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "#FEF3C7", marginRight: 12 },
  flex: { flex: 1 },
  topName: { color: "#0F172A", fontSize: 16, fontWeight: "900" },
  topMeta: { color: "#92400E", fontSize: 12, fontWeight: "700", marginTop: 4 },
  topRevenue: { color: "#92400E", fontWeight: "900" },
  empty: { width: "100%", minWidth: 0, alignItems: "center", padding: 30, borderRadius: 22, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0" },
  emptyTitle: { color: "#0F172A", fontSize: 16, fontWeight: "900", marginTop: 10 },
  emptyText: { width: "100%", flexShrink: 1, color: "#64748B", fontSize: 12, marginTop: 4, textAlign: "center" },
  orderList: { borderRadius: 22, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0", overflow: "hidden" },
  orderRow: { minHeight: 72, padding: 14, flexDirection: "row", alignItems: "center", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#E2E8F0" },
  orderIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#EEF4FF", marginRight: 11 },
  orderTitle: { color: "#0F172A", fontSize: 12, fontWeight: "900" },
  orderMeta: { color: "#64748B", fontSize: 10, marginTop: 4 },
  orderAmount: { color: "#0A46E4", fontSize: 13, fontWeight: "900", marginLeft: 8 },
  modalBackdrop: { flex: 1, padding: 22, backgroundColor: "rgba(15,23,42,0.62)", alignItems: "center", justifyContent: "center" },
  calendarCard: { width: "100%", maxWidth: 410, borderRadius: 28, backgroundColor: "#FFFFFF", padding: 18 },
  calendarHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  monthButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },
  monthTitle: { color: "#0F172A", fontSize: 17, fontWeight: "900" },
  weekRow: { flexDirection: "row", marginBottom: 5 },
  weekDay: { width: "14.2857%", textAlign: "center", color: "#64748B", fontSize: 10, fontWeight: "900" },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap" },
  dayCell: { width: "14.2857%", aspectRatio: 1, alignItems: "center", justifyContent: "center", borderRadius: 14 },
  dayCellActive: { backgroundColor: "#0A46E4" },
  dayText: { color: "#0F172A", fontSize: 13, fontWeight: "800" },
  dayTextActive: { color: "#FFFFFF" },
  salesDot: { position: "absolute", bottom: 5, width: 4, height: 4, borderRadius: 2, backgroundColor: "#16A34A" },
  salesDotActive: { backgroundColor: "#BBF7D0" },
  todayButton: { height: 48, borderRadius: 16, backgroundColor: "#EFF6FF", alignItems: "center", justifyContent: "center", marginTop: 14 },
  todayText: { color: "#0A46E4", fontWeight: "900" },
});
