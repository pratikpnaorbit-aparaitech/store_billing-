import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";
import UserAvatar from "../avatar/UserAvatar";
import { useTranslation } from "../../i18n";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

export default function AppHeader({ name = "User", avatarUrl, notificationCount = 0, onNotifications }) {
  const { language, t } = useTranslation();
  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.greeting}>{t(getGreeting())} 👋</Text>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.date}>{dayjs().locale(language).format("dddd, DD MMMM")}</Text>
      </View>

      <View style={styles.right}>
        <TouchableOpacity activeOpacity={0.8} style={styles.iconButton} onPress={onNotifications}>
          <Ionicons name="notifications-outline" size={21} color="#0F172A" />
          {notificationCount > 0 ? (
            <View style={styles.badge}><Text style={styles.badgeText}>{notificationCount > 9 ? "9+" : notificationCount}</Text></View>
          ) : null}
        </TouchableOpacity>
        <UserAvatar name={name} uri={avatarUrl} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    marginTop: 32,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greeting: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "700",
  },
  name: {
    color: "#0F172A",
    fontSize: 28,
    fontWeight: "900",
    marginTop: 3,
  },
  date: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 4,
  },
  right: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  iconButton: {
    width: 46,
    height: 46,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  badge: { position: "absolute", right: -4, top: -5, minWidth: 19, height: 19, paddingHorizontal: 4, borderRadius: 10, backgroundColor: "#DC2626", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#F8FAFC" },
  badgeText: { color: "#FFFFFF", fontSize: 9, fontWeight: "900" },
});
