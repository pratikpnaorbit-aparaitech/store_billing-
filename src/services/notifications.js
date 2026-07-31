import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { useNotificationStore } from "../store/notificationStore";

const CHANNEL_ID = "low-stock";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function configureNotifications() {
  if (Platform.OS === "web") return false;
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: "Low stock alerts",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 150, 250],
      sound: "default",
    });
  }
  const current = await Notifications.getPermissionsAsync();
  const permission = current.granted ? current : await Notifications.requestPermissionsAsync();
  return permission.granted;
}

export async function notifyLowStock(products = []) {
  if (!products.length) return;
  const names = products.slice(0, 3).map((product) => `${product.name} (${product.stock})`).join(", ");
  const extra = products.length > 3 ? ` +${products.length - 3} more` : "";
  const notification = {
    title: "Low stock — refill inventory",
    body: `${names}${extra}`,
    type: "low-stock",
    data: { productIds: products.map((product) => String(product.id || product._id)) },
  };
  await useNotificationStore.getState().addNotification(notification);
  if (Platform.OS === "web") return;
  try {
    const granted = await configureNotifications();
    if (!granted) return;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: notification.title,
        body: notification.body,
        data: notification.data,
        sound: "default",
      },
      trigger: Platform.OS === "android" ? { channelId: CHANNEL_ID } : null,
    });
  } catch (error) {
    console.warn("Low-stock device notification failed", error);
  }
}
