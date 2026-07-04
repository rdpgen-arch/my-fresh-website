/**
 * Local push notifications for new orders.
 *
 * Since remote push notifications (APNs/FCM) are not available in managed Expo workflow,
 * this hook polls for new orders every 30 seconds while the app is open and
 * triggers a local notification when a new order is detected.
 *
 * For true background push (while app is closed), you'll need a self-hosted
 * server sending FCM/APNs after migrating off the platform.
 */
import * as Notifications from "expo-notifications";
import { useEffect, useRef, useCallback } from "react";
import { AppState } from "react-native";
import { api } from "./api";
import { useAuth } from "./auth/useAuth";

// How often to check for new orders (30 seconds)
const POLL_INTERVAL = 30_000;

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function useOrderNotifications() {
  const { auth } = useAuth();
  const lastOrderCountRef = useRef(null);
  const lastOrderIdRef = useRef(null);
  const intervalRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);

  const requestPermissions = useCallback(async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === "granted";
  }, []);

  const checkForNewOrders = useCallback(async () => {
    if (!auth?.jwt) return;
    try {
      const data = await api.get("/api/orders", {
        status: "pending",
        limit: 1,
        sortDir: "desc",
      });
      const orders = Array.isArray(data) ? data : data?.orders || [];

      if (orders.length === 0) return;

      const latestOrder = orders[0];

      // Skip first check (initialize the baseline)
      if (lastOrderIdRef.current === null) {
        lastOrderIdRef.current = latestOrder.id;
        return;
      }

      // If the latest order ID changed, there's a new order
      if (latestOrder.id !== lastOrderIdRef.current) {
        lastOrderIdRef.current = latestOrder.id;

        // Fire local notification
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "🛍️ New Order!",
            body: `Order #${latestOrder.order_number} from ${latestOrder.customer_name} — ৳${Number(latestOrder.grand_total).toLocaleString()}`,
            sound: true,
            badge: 1,
            data: { orderId: latestOrder.id, screen: "orders" },
          },
          trigger: null, // fire immediately
        });
      }
    } catch (err) {
      // Silently ignore polling errors
    }
  }, [auth?.jwt]);

  useEffect(() => {
    if (!auth?.jwt) return;

    // Request notification permissions
    requestPermissions();

    // Start polling
    intervalRef.current = setInterval(checkForNewOrders, POLL_INTERVAL);

    // Also check immediately
    checkForNewOrders();

    // Pause polling when app goes to background, resume when active
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (appStateRef.current !== "active" && nextState === "active") {
        // App came to foreground — check immediately
        checkForNewOrders();
        intervalRef.current = setInterval(checkForNewOrders, POLL_INTERVAL);
      } else if (nextState === "background") {
        // App went to background — pause polling
        clearInterval(intervalRef.current);
      }
      appStateRef.current = nextState;
    });

    return () => {
      clearInterval(intervalRef.current);
      subscription?.remove();
    };
  }, [auth?.jwt, checkForNewOrders]);

  return { requestPermissions };
}
