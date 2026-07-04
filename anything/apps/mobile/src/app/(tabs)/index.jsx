/**
 * Dashboard — today's stats, recent orders, quick actions
 */
import { api } from "@/utils/api";
import { useAuth } from "@/utils/auth/useAuth";
import { useOrderNotifications } from "@/utils/useOrderNotifications";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function StatCard({ label, value, color = "#2563EB", sub }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#fff",
        borderRadius: 14,
        padding: 16,
        marginHorizontal: 4,
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
      }}
    >
      <Text
        style={{
          fontSize: 12,
          color: "#6B7280",
          fontWeight: "500",
          marginBottom: 6,
        }}
      >
        {label}
      </Text>
      <Text style={{ fontSize: 22, fontWeight: "700", color }}>{value}</Text>
      {sub ? (
        <Text style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

function OrderStatusPill({ status }) {
  const map = {
    pending: { bg: "#FEF3C7", text: "#92400E", label: "Pending" },
    processing: { bg: "#DBEAFE", text: "#1E40AF", label: "Processing" },
    shipped: { bg: "#E0E7FF", text: "#3730A3", label: "Shipped" },
    delivered: { bg: "#D1FAE5", text: "#065F46", label: "Delivered" },
    cancelled: { bg: "#FEE2E2", text: "#991B1B", label: "Cancelled" },
    returned: { bg: "#F3F4F6", text: "#374151", label: "Returned" },
  };
  const s = map[status] || map.pending;
  return (
    <View
      style={{
        backgroundColor: s.bg,
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 3,
      }}
    >
      <Text style={{ color: s.text, fontSize: 11, fontWeight: "600" }}>
        {s.label}
      </Text>
    </View>
  );
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { auth } = useAuth();
  const userName = auth?.user?.full_name || auth?.user?.email || "Merchant";

  // Enable local push notifications for new orders
  useOrderNotifications();

  const {
    data: stats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ["stats"],
    queryFn: () => api.get("/api/admin/stats"),
    enabled: !!auth?.jwt,
  });

  const { data: analytics, refetch: refetchAnalytics } = useQuery({
    queryKey: ["analytics", 7],
    queryFn: () => api.get("/api/admin/analytics", { period: 7 }),
    enabled: !!auth?.jwt,
  });

  const {
    data: ordersData,
    isLoading: ordersLoading,
    refetch: refetchOrders,
  } = useQuery({
    queryKey: ["orders", "recent"],
    queryFn: () => api.get("/api/orders", { limit: 5, sortDir: "desc" }),
    enabled: !!auth?.jwt,
  });

  const isRefreshing = false;
  const onRefresh = () => {
    refetchStats();
    refetchAnalytics();
    refetchOrders();
  };

  const recentOrders = Array.isArray(ordersData)
    ? ordersData
    : ordersData?.orders || [];
  const weekRevenue = analytics?.revenue_by_day
    ? analytics.revenue_by_day.reduce((s, d) => s + Number(d.revenue || 0), 0)
    : null;

  return (
    <View
      style={{ flex: 1, backgroundColor: "#F9FAFB", paddingTop: insets.top }}
    >
      <StatusBar style="dark" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="#2563EB"
          />
        }
      >
        {/* Header */}
        <View
          style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 }}
        >
          <Text style={{ fontSize: 12, color: "#9CA3AF", fontWeight: "500" }}>
            Good day,
          </Text>
          <Text style={{ fontSize: 22, fontWeight: "700", color: "#111827" }}>
            {userName}
          </Text>
        </View>

        {/* Today's Stats */}
        <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: "#374151",
              marginBottom: 10,
              paddingHorizontal: 4,
            }}
          >
            Today
          </Text>
          {statsLoading ? (
            <ActivityIndicator
              color="#2563EB"
              style={{ paddingVertical: 20 }}
            />
          ) : (
            <View style={{ flexDirection: "row" }}>
              <StatCard
                label="Revenue"
                value={`৳${Number(stats?.today_revenue || 0).toLocaleString()}`}
                color="#059669"
              />
              <StatCard
                label="Orders"
                value={String(stats?.today_orders || 0)}
                color="#2563EB"
              />
              <StatCard
                label="Pending"
                value={String(stats?.pending_orders || 0)}
                color="#D97706"
              />
            </View>
          )}
        </View>

        {/* 7-day summary */}
        {weekRevenue !== null && (
          <View
            style={{
              marginHorizontal: 20,
              marginBottom: 20,
              backgroundColor: "#EFF6FF",
              borderRadius: 14,
              padding: 16,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                color: "#3B82F6",
                fontWeight: "600",
                marginBottom: 4,
              }}
            >
              Last 7 Days
            </Text>
            <Text style={{ fontSize: 20, fontWeight: "700", color: "#1E40AF" }}>
              ৳
              {weekRevenue.toLocaleString("en-BD", {
                minimumFractionDigits: 0,
              })}
            </Text>
            <Text style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>
              {analytics?.revenue_by_day?.reduce(
                (s, d) => s + Number(d.orders || 0),
                0,
              ) || 0}{" "}
              orders
            </Text>
          </View>
        )}

        {/* Quick actions */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: "#374151",
              marginBottom: 10,
            }}
          >
            Quick Actions
          </Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <TouchableOpacity
              onPress={() => router.push("/orders")}
              style={{
                flex: 1,
                backgroundColor: "#2563EB",
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "600", fontSize: 14 }}>
                View Orders
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("/products/new")}
              style={{
                flex: 1,
                backgroundColor: "#fff",
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: "center",
                borderWidth: 1.5,
                borderColor: "#E5E7EB",
              }}
            >
              <Text
                style={{ color: "#374151", fontWeight: "600", fontSize: 14 }}
              >
                Add Product
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Orders */}
        <View style={{ paddingHorizontal: 20 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#374151" }}>
              Recent Orders
            </Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/orders")}>
              <Text
                style={{ fontSize: 12, color: "#2563EB", fontWeight: "600" }}
              >
                See All
              </Text>
            </TouchableOpacity>
          </View>

          {ordersLoading ? (
            <ActivityIndicator
              color="#2563EB"
              style={{ paddingVertical: 20 }}
            />
          ) : recentOrders.length === 0 ? (
            <View
              style={{
                backgroundColor: "#fff",
                borderRadius: 14,
                padding: 24,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#9CA3AF", fontSize: 14 }}>
                No orders yet
              </Text>
            </View>
          ) : (
            recentOrders.map((order) => (
              <TouchableOpacity
                key={order.id}
                onPress={() => router.push(`/orders/${order.id}`)}
                style={{
                  backgroundColor: "#fff",
                  borderRadius: 12,
                  padding: 14,
                  marginBottom: 8,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color: "#111827",
                    }}
                  >
                    #{order.order_number}
                  </Text>
                  <Text
                    style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}
                  >
                    {order.customer_name}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 6 }}>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "700",
                      color: "#059669",
                    }}
                  >
                    ৳{Number(order.grand_total).toLocaleString()}
                  </Text>
                  <OrderStatusPill status={order.status} />
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}
