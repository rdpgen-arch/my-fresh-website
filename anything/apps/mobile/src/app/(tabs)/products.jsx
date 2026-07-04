/**
 * Products tab — searchable product list with add button
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
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Plus, Package } from "lucide-react-native";

const STATUS_STYLES = {
  published: { bg: "#D1FAE5", text: "#065F46" },
  draft: { bg: "#F3F4F6", text: "#374151" },
  archived: { bg: "#FEE2E2", text: "#991B1B" },
};

function ProductRow({ product, onPress }) {
  const s = STATUS_STYLES[product.status] || STATUS_STYLES.draft;
  const isLowStock =
    product.stock_quantity !== null && product.stock_quantity <= 5;
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
        marginHorizontal: 16,
        flexDirection: "row",
        alignItems: "center",
        shadowColor: "#000",
        shadowOpacity: 0.04,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 1 },
        elevation: 1,
      }}
    >
      {/* Image */}
      <View
        style={{
          width: 60,
          height: 60,
          borderRadius: 10,
          backgroundColor: "#F3F4F6",
          overflow: "hidden",
          marginRight: 12,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {product.image_url ? (
          <Image
            source={{ uri: product.image_url }}
            style={{ width: 60, height: 60 }}
            contentFit="cover"
          />
        ) : (
          <Package size={24} color="#D1D5DB" />
        )}
      </View>

      {/* Info */}
      <View style={{ flex: 1 }}>
        <Text
          style={{ fontSize: 14, fontWeight: "600", color: "#111827" }}
          numberOfLines={1}
        >
          {product.name}
        </Text>
        <Text style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>
          SKU: {product.sku}
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginTop: 6,
            gap: 8,
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: "700", color: "#059669" }}>
            ৳{Number(product.price).toLocaleString()}
          </Text>
          <View
            style={{
              backgroundColor: s.bg,
              borderRadius: 20,
              paddingHorizontal: 8,
              paddingVertical: 2,
            }}
          >
            <Text
              style={{
                color: s.text,
                fontSize: 10,
                fontWeight: "600",
                textTransform: "capitalize",
              }}
            >
              {product.status}
            </Text>
          </View>
        </View>
      </View>

      {/* Stock */}
      <View style={{ alignItems: "flex-end", minWidth: 50 }}>
        <Text
          style={{
            fontSize: 12,
            fontWeight: "700",
            color: isLowStock ? "#DC2626" : "#374151",
          }}
        >
          {product.stock_quantity}
        </Text>
        <Text style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2 }}>
          in stock
        </Text>
        {isLowStock && (
          <Text
            style={{
              fontSize: 10,
              color: "#DC2626",
              marginTop: 2,
              fontWeight: "600",
            }}
          >
            Low!
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function ProductsScreen() {
  const insets = useSafeAreaInsets();
  const { auth } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["products", search, statusFilter],
    queryFn: () =>
      api.get("/api/products", {
        ...(search ? { search } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
        limit: 200,
      }),
    enabled: !!auth?.jwt,
  });

  const products = Array.isArray(data) ? data : data?.products || [];

  const FILTERS = [
    { key: "", label: "All" },
    { key: "published", label: "Published" },
    { key: "draft", label: "Draft" },
    { key: "archived", label: "Archived" },
  ];

  return (
    <View
      style={{ flex: 1, backgroundColor: "#F9FAFB", paddingTop: insets.top }}
    >
      <StatusBar style="dark" />

      {/* Header */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 12,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Text style={{ fontSize: 22, fontWeight: "700", color: "#111827" }}>
          Products
        </Text>
        <TouchableOpacity
          onPress={() => router.push("/products/new")}
          style={{
            backgroundColor: "#2563EB",
            borderRadius: 10,
            width: 36,
            height: 36,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={{ paddingHorizontal: 16, marginBottom: 10 }}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search products..."
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
          data={FILTERS}
          keyExtractor={(item) => item.key}
          contentContainerStyle={{ paddingHorizontal: 12 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setStatusFilter(item.key)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 7,
                borderRadius: 20,
                marginHorizontal: 4,
                backgroundColor: statusFilter === item.key ? "#2563EB" : "#fff",
                borderWidth: 1.5,
                borderColor: statusFilter === item.key ? "#2563EB" : "#E5E7EB",
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: statusFilter === item.key ? "#fff" : "#6B7280",
                }}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Count */}
      <Text
        style={{
          fontSize: 12,
          color: "#9CA3AF",
          paddingHorizontal: 20,
          marginBottom: 8,
        }}
      >
        {products.length} product{products.length !== 1 ? "s" : ""}
      </Text>

      {isLoading ? (
        <ActivityIndicator color="#2563EB" style={{ paddingTop: 40 }} />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ProductRow
              product={item}
              onPress={() => router.push(`/products/${item.id}`)}
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
              <Package size={40} color="#D1D5DB" />
              <Text style={{ color: "#9CA3AF", fontSize: 15, marginTop: 12 }}>
                No products yet
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/products/new")}
                style={{
                  backgroundColor: "#2563EB",
                  borderRadius: 10,
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  marginTop: 16,
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "600" }}>
                  Add First Product
                </Text>
              </TouchableOpacity>
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
