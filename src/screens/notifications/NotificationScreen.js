import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNotificationStore } from "../../store/notificationStore";
import { useTranslation } from "../../i18n";

export default function NotificationScreen({ navigation }) {
  const { language, t } = useTranslation();
  const insets = useSafeAreaInsets();
  const notifications = useNotificationStore((state) => state.notifications);
  const markAllRead = useNotificationStore((state) => state.markAllRead);
  const clearNotifications = useNotificationStore((state) => state.clearNotifications);

  React.useEffect(() => {
    markAllRead();
  }, [markAllRead]);

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.flex}>
          <Text style={styles.title}>{t("Notifications")}</Text>
          <Text style={styles.subtitle}>{t("Stock and account alerts")}</Text>
        </View>
        {notifications.length ? (
          <TouchableOpacity onPress={clearNotifications}>
            <Text style={styles.clear}>{t("Clear")}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {notifications.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.card}
            onPress={() => item.type === "low-stock" && navigation.navigate("Main", {
              screen: "Products",
              params: { stockFilter: "Low stock" },
            })}
          >
            <View style={styles.icon}>
              <Ionicons name={item.type === "low-stock" ? "warning" : "notifications"} size={22} color="#B45309" />
            </View>
            <View style={styles.flex}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.body}>{item.body}</Text>
              <Text style={styles.date}>{dayjs(item.createdAt).locale(language).format("DD MMM, hh:mm A")}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>
        ))}
        {!notifications.length ? (
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={48} color="#94A3B8" />
            <Text style={styles.emptyTitle}>{t("No notifications yet")}</Text>
            <Text style={styles.emptyBody}>{t("Low-stock alerts will appear here after billing.")}</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { paddingHorizontal: 20, paddingBottom: 16, flexDirection: "row", alignItems: "center", gap: 12 },
  back: { width: 44, height: 44, borderRadius: 16, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0", alignItems: "center", justifyContent: "center" },
  flex: { flex: 1 },
  title: { color: "#0F172A", fontSize: 25, fontWeight: "900" },
  subtitle: { color: "#64748B", fontSize: 11, fontWeight: "700", marginTop: 2 },
  clear: { color: "#DC2626", fontWeight: "900" },
  content: { padding: 20, paddingBottom: 50, gap: 10 },
  card: { padding: 15, borderRadius: 20, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0", flexDirection: "row", alignItems: "center", gap: 12 },
  icon: { width: 46, height: 46, borderRadius: 16, backgroundColor: "#FEF3C7", alignItems: "center", justifyContent: "center" },
  cardTitle: { color: "#0F172A", fontSize: 14, fontWeight: "900" },
  body: { color: "#475569", fontSize: 12, lineHeight: 17, marginTop: 3 },
  date: { color: "#94A3B8", fontSize: 10, marginTop: 6 },
  empty: { alignItems: "center", paddingTop: 100 },
  emptyTitle: { color: "#0F172A", fontSize: 18, fontWeight: "900", marginTop: 13 },
  emptyBody: { color: "#64748B", textAlign: "center", marginTop: 6 },
});
