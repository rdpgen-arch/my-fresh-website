/**
 * Orders tab — filterable list of all orders
 */
import { api } from "@/utils/api";
import { useAuth } from "@/utils/auth/useAuth";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const STATUSES = [
  { key: "", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "processing", label: "Processing" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
];

const STATUS_STYLES = {
  pending: { bg: "#FEF3C7", text: "#92400E" },
  processing: { bg: "#DBEAFE", text: "#1E40AF" },
  shipped: { bg: "#E0E7FF", text: "#3730A3" },
  delivered: { bg: "#D1FAE5", text: "#065F46" },
  cancelled: { bg: "#FEE2E2", text: "#991B1B" },
  returned: { bg: "#F3F4F6", text: "#374151" },
};

function OrderRow({ order, onPress }) {
  const s = STATUS_STYLES[order.status] || STATUS_STYLES.pending;
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 14,
        marginBottom: 8,
        marginHorizontal: 16,
        shadowColor: "#000",
        shadowOpacity: 0.04,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 1 },
        elevation: 1,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: "700", color: "#111827" }}>
            #{order.order_number}
          </Text>
          <Text style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>
            {order.customer_name}
          </Text>
          <Text style={{ fontSize: 12, color: "#9CA3AF" }}>
            {order.customer_phone}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: "#059669" }}>
            ৳{Number(order.grand_total).toLocaleString()}
          </Text>
          <View
            style={{
              backgroundColor: s.bg,
              borderRadius: 20,
              paddingHorizontal: 10,
              paddingVertical: 3,
              marginTop: 6,
            }}
          >
            <Text
              style={{
                color: s.text,
                fontSize: 11,
                fontWeight: "600",
                textTransform: "capitalize",
              }}
            >
              {order.status}
            </Text>
          </View>
        </View>
      </View>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginTop: 8,
          paddingTop: 8,
          borderTopWidth: 1,
          borderTopColor: "#F3F4F6",
        }}
      >
        <Text style={{ fontSize: 11, color: "#9CA3AF" }}>
          {order.payment_method?.toUpperCase()} · {order.item_count} item
          {order.item_count !== 1 ? "s" : ""}
        </Text>
        <Text style={{ fontSize: 11, color: "#9CA3AF" }}>
          {new Date(order.created_at).toLocaleDateString("en-BD", {
            day: "2-digit",
            month: "short",
          })}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const { auth } = useAuth();
  const [activeStatus, setActiveStatus] = useState("");
  const [search, setSearch] = useState("");

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["orders", activeStatus, search],
    queryFn: () =>
      api.get("/api/orders", {
        ...(activeStatus ? { status: activeStatus } : {}),
        ...(search ? { search } : {}),
        limit: 100,
      }),
    enabled: !!auth?.jwt,
  });

  const orders = Array.isArray(data) ? data : data?.orders || [];

  return (
    <View
      style={{ flex: 1, backgroundColor: "#F9FAFB", paddingTop: insets.top }}
    >
      <StatusBar style="dark" />

      {/* Header */}
      <View
        style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 }}
      >
        <Text style={{ fontSize: 22, fontWeight: "700", color: "#111827" }}>
          Orders
        </Text>
      </View>

      {/* Search */}
      <View style={{ paddingHorizontal: 16, marginBottom: 10 }}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name, phone, order #..."
          placeholderTextColor="#9CA3AF"
          style={{
            backgroundColor: "#fff",
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 10,
            fontSize: 14,
            color: "#111827",
            borderWidth: 1,
            borderColor: "#E5E7EB",
          }}
        />
      </View>

      {/* Status filter */}
      <View style={{ marginBottom: 12 }}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={STATUSES}
          keyExtractor={(item) => item.key}
          contentContainerStyle={{ paddingHorizontal: 12 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setActiveStatus(item.key)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 7,
                borderRadius: 20,
                marginHorizontal: 4,
                backgroundColor: activeStatus === item.key ? "#2563EB" : "#fff",
                borderWidth: 1.5,
                borderColor: activeStatus === item.key ? "#2563EB" : "#E5E7EB",
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: activeStatus === item.key ? "#fff" : "#6B7280",
                }}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Orders list */}
      {isLoading ? (
        <ActivityIndicator color="#2563EB" style={{ paddingTop: 40 }} />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <OrderRow
              order={item}
              onPress={() => router.push(`/orders/${item.id}`)}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#2563EB"
            />
          }
          ListEmptyComponent={
            <View style={{ paddingTop: 60, alignItems: "center" }}>
              <Text style={{ color: "#9CA3AF", fontSize: 15 }}>
                No orders found
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: insets.bottom + 20,
            paddingTop: 4,
          }}
        />
      )}
    </View>
  );
}
