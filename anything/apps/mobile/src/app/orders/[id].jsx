/**
 * Order Detail — full order info + status transition + Steadfast booking button
 */
import { api } from "@/utils/api";
import { useAuth } from "@/utils/auth/useAuth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, ChevronRight } from "lucide-react-native";

const STATUS_COLORS = {
  pending: { bg: "#FEF3C7", text: "#92400E" },
  processing: { bg: "#DBEAFE", text: "#1E40AF" },
  shipped: { bg: "#E0E7FF", text: "#3730A3" },
  delivered: { bg: "#D1FAE5", text: "#065F46" },
  cancelled: { bg: "#FEE2E2", text: "#991B1B" },
  returned: { bg: "#F3F4F6", text: "#374151" },
};

// Valid transitions for each status
const NEXT_STATUSES = {
  pending: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered", "returned"],
  delivered: ["returned"],
  cancelled: [],
  returned: [],
};

function Section({ title, children }) {
  return (
    <View
      style={{
        backgroundColor: "#fff",
        borderRadius: 14,
        marginHorizontal: 16,
        marginBottom: 12,
        padding: 16,
      }}
    >
      {title && (
        <Text
          style={{
            fontSize: 13,
            fontWeight: "700",
            color: "#374151",
            marginBottom: 12,
          }}
        >
          {title}
        </Text>
      )}
      {children}
    </View>
  );
}

function InfoRow({ label, value, mono }) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 8,
      }}
    >
      <Text style={{ fontSize: 13, color: "#6B7280" }}>{label}</Text>
      <Text
        style={{
          fontSize: 13,
          color: "#111827",
          fontWeight: "500",
          fontFamily: mono ? "monospace" : undefined,
        }}
      >
        {value || "—"}
      </Text>
    </View>
  );
}

export default function OrderDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();
  const { auth } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: order,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["order", id],
    queryFn: () => api.get(`/api/orders/${id}`),
    enabled: !!auth?.jwt && !!id,
  });

  const statusMutation = useMutation({
    mutationFn: ({ status, note }) =>
      api.post(`/api/orders/${id}/status`, { status, note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", id] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
    onError: (err) => Alert.alert("Error", err.message),
  });

  const handleStatusChange = (newStatus) => {
    Alert.alert("Update Status", `Change order status to "${newStatus}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Confirm",
        onPress: () => statusMutation.mutate({ status: newStatus }),
      },
    ]);
  };

  if (isLoading || !order) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#F9FAFB",
          justifyContent: "center",
          alignItems: "center",
          paddingTop: insets.top,
        }}
      >
        <ActivityIndicator color="#2563EB" />
      </View>
    );
  }

  const sc = STATUS_COLORS[order.status] || STATUS_COLORS.pending;
  const nextStatuses = NEXT_STATUSES[order.status] || [];
  const address = order.customer_address || {};
  const addressStr =
    [address.line1, address.line2, address.district, address.city]
      .filter(Boolean)
      .join(", ") || "Not provided";

  return (
    <View
      style={{ flex: 1, backgroundColor: "#F9FAFB", paddingTop: insets.top }}
    >
      <StatusBar style="dark" />

      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 14,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginRight: 12 }}
        >
          <ArrowLeft size={22} color="#374151" />
        </TouchableOpacity>
        <Text
          style={{ fontSize: 18, fontWeight: "700", color: "#111827", flex: 1 }}
        >
          #{order.order_number}
        </Text>
        <View
          style={{
            backgroundColor: sc.bg,
            borderRadius: 20,
            paddingHorizontal: 12,
            paddingVertical: 5,
          }}
        >
          <Text
            style={{
              color: sc.text,
              fontSize: 12,
              fontWeight: "700",
              textTransform: "capitalize",
            }}
          >
            {order.status}
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 30 }}
      >
        {/* Summary */}
        <Section title="Order Summary">
          <InfoRow label="Order Number" value={`#${order.order_number}`} />
          <InfoRow
            label="Date"
            value={new Date(order.created_at).toLocaleString("en-BD")}
          />
          <InfoRow
            label="Payment"
            value={order.payment_method?.toUpperCase()}
          />
          <InfoRow
            label="Payment Status"
            value={order.payment_status?.toUpperCase()}
          />
          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: "#F3F4F6",
              marginTop: 8,
              paddingTop: 8,
            }}
          >
            <InfoRow
              label="Subtotal"
              value={`৳${Number(order.subtotal).toLocaleString()}`}
            />
            <InfoRow
              label="Shipping"
              value={`৳${Number(order.shipping_charge || 0).toLocaleString()}`}
            />
            {Number(order.discount_amount) > 0 && (
              <InfoRow
                label="Discount"
                value={`-৳${Number(order.discount_amount).toLocaleString()}`}
              />
            )}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginTop: 4,
              }}
            >
              <Text
                style={{ fontSize: 14, fontWeight: "700", color: "#111827" }}
              >
                Total
              </Text>
              <Text
                style={{ fontSize: 16, fontWeight: "700", color: "#059669" }}
              >
                ৳{Number(order.grand_total).toLocaleString()}
              </Text>
            </View>
          </View>
        </Section>

        {/* Customer */}
        <Section title="Customer">
          <InfoRow label="Name" value={order.customer_name} />
          <InfoRow label="Phone" value={order.customer_phone} />
          {order.customer_email && (
            <InfoRow label="Email" value={order.customer_email} />
          )}
          <InfoRow label="Address" value={addressStr} />
          {order.shipping_zone_name && (
            <InfoRow label="Zone" value={order.shipping_zone_name} />
          )}
        </Section>

        {/* Items */}
        <Section title={`Items (${order.items?.length || 0})`}>
          {(order.items || []).map((item, i) => (
            <View
              key={item.id || i}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                paddingVertical: 8,
                borderBottomWidth: i < order.items.length - 1 ? 1 : 0,
                borderBottomColor: "#F3F4F6",
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{ fontSize: 13, fontWeight: "600", color: "#111827" }}
                >
                  {item.name}
                </Text>
                <Text style={{ fontSize: 12, color: "#6B7280" }}>
                  SKU: {item.sku} · Qty: {item.quantity}
                </Text>
              </View>
              <Text
                style={{ fontSize: 13, fontWeight: "600", color: "#374151" }}
              >
                ৳{Number(item.line_total).toLocaleString()}
              </Text>
            </View>
          ))}
        </Section>

        {/* Status history */}
        {order.history?.length > 0 && (
          <Section title="Status History">
            {order.history.map((h, i) => (
              <View key={h.id || i} style={{ marginBottom: 8 }}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: "#2563EB",
                      marginRight: 10,
                    }}
                  />
                  <Text
                    style={{
                      fontSize: 12,
                      color: "#374151",
                      fontWeight: "600",
                    }}
                  >
                    {h.from_status
                      ? `${h.from_status} → ${h.to_status}`
                      : h.to_status}
                  </Text>
                  <Text
                    style={{
                      fontSize: 11,
                      color: "#9CA3AF",
                      marginLeft: "auto",
                    }}
                  >
                    {new Date(h.created_at).toLocaleDateString("en-BD", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </Text>
                </View>
                {h.note && (
                  <Text
                    style={{
                      fontSize: 12,
                      color: "#6B7280",
                      marginLeft: 18,
                      marginTop: 2,
                    }}
                  >
                    {h.note}
                  </Text>
                )}
              </View>
            ))}
          </Section>
        )}

        {/* Notes */}
        {order.notes && (
          <Section title="Notes">
            <Text style={{ fontSize: 13, color: "#374151" }}>
              {order.notes}
            </Text>
          </Section>
        )}

        {/* Status update actions */}
        {nextStatuses.length > 0 && (
          <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: "#374151",
                marginBottom: 10,
              }}
            >
              Update Status
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {nextStatuses.map((s) => {
                const sc2 = STATUS_COLORS[s] || STATUS_COLORS.pending;
                return (
                  <TouchableOpacity
                    key={s}
                    onPress={() => handleStatusChange(s)}
                    disabled={statusMutation.isPending}
                    style={{
                      backgroundColor: sc2.bg,
                      borderRadius: 10,
                      paddingHorizontal: 18,
                      paddingVertical: 11,
                      flex: 1,
                      alignItems: "center",
                      opacity: statusMutation.isPending ? 0.6 : 1,
                    }}
                  >
                    <Text
                      style={{
                        color: sc2.text,
                        fontWeight: "700",
                        fontSize: 13,
                        textTransform: "capitalize",
                      }}
                    >
                      {s}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {statusMutation.isPending && (
              <ActivityIndicator color="#2563EB" style={{ marginTop: 8 }} />
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
