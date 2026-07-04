/**
 * Add new product with photo upload via Uploadcare
 */
import { api, uploadImageToUploadcare } from "@/utils/api";
import { useAuth } from "@/utils/auth/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Camera, Package } from "lucide-react-native";
import KeyboardAvoidingAnimatedView from "@/components/KeyboardAvoidingAnimatedView";

function Field({ label, required, children }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text
        style={{
          fontSize: 13,
          fontWeight: "600",
          color: "#374151",
          marginBottom: 6,
        }}
      >
        {label}
        {required && <Text style={{ color: "#DC2626" }}> *</Text>}
      </Text>
      {children}
    </View>
  );
}

const inputStyle = {
  backgroundColor: "#fff",
  borderRadius: 10,
  paddingHorizontal: 14,
  paddingVertical: 12,
  fontSize: 14,
  color: "#111827",
  borderWidth: 1,
  borderColor: "#E5E7EB",
};

export default function NewProductScreen() {
  const insets = useSafeAreaInsets();
  const { auth } = useAuth();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    name: "",
    sku: "",
    price: "",
    stock_quantity: "",
    description: "",
    status: "published",
    image_url: "",
  });
  const [uploading, setUploading] = useState(false);

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  const mutation = useMutation({
    mutationFn: (data) => api.post("/api/products", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      Alert.alert("Success", "Product created!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    },
    onError: (err) => Alert.alert("Error", err.message),
  });

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Please allow photo library access to upload images.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setUploading(true);
      try {
        const url = await uploadImageToUploadcare(result.assets[0].uri);
        set("image_url")(url);
      } catch (e) {
        Alert.alert("Upload failed", e.message);
      } finally {
        setUploading(false);
      }
    }
  };

  const handleSubmit = () => {
    if (!form.name.trim())
      return Alert.alert("Required", "Product name is required.");
    if (!form.sku.trim()) return Alert.alert("Required", "SKU is required.");
    if (!form.price) return Alert.alert("Required", "Price is required.");

    mutation.mutate({
      name: form.name.trim(),
      sku: form.sku.trim().toUpperCase(),
      price: parseFloat(form.price),
      stock_quantity: parseInt(form.stock_quantity || "0", 10),
      description: form.description.trim(),
      status: form.status,
      image_url: form.image_url || null,
      currency: "BDT",
    });
  };

  const STATUS_OPTS = ["published", "draft", "archived"];

  return (
    <KeyboardAvoidingAnimatedView style={{ flex: 1 }} behavior="padding">
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
            style={{
              fontSize: 18,
              fontWeight: "700",
              color: "#111827",
              flex: 1,
            }}
          >
            Add Product
          </Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            padding: 16,
            paddingBottom: insets.bottom + 40,
          }}
        >
          {/* Image picker */}
          <TouchableOpacity
            onPress={pickImage}
            disabled={uploading}
            style={{
              alignSelf: "center",
              width: 120,
              height: 120,
              borderRadius: 16,
              backgroundColor: "#F3F4F6",
              borderWidth: 2,
              borderColor: "#E5E7EB",
              borderStyle: "dashed",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 24,
              overflow: "hidden",
            }}
          >
            {uploading ? (
              <ActivityIndicator color="#2563EB" />
            ) : form.image_url ? (
              <Image
                source={{ uri: form.image_url }}
                style={{ width: 120, height: 120 }}
                contentFit="cover"
              />
            ) : (
              <>
                <Camera size={28} color="#9CA3AF" />
                <Text style={{ fontSize: 11, color: "#9CA3AF", marginTop: 6 }}>
                  Add Photo
                </Text>
              </>
            )}
          </TouchableOpacity>

          <Field label="Product Name" required>
            <TextInput
              value={form.name}
              onChangeText={set("name")}
              placeholder="e.g. Cotton T-Shirt"
              placeholderTextColor="#9CA3AF"
              style={inputStyle}
            />
          </Field>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Field label="SKU" required>
                <TextInput
                  value={form.sku}
                  onChangeText={set("sku")}
                  placeholder="TSH-001"
                  placeholderTextColor="#9CA3AF"
                  style={inputStyle}
                  autoCapitalize="characters"
                />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Price (BDT)" required>
                <TextInput
                  value={form.price}
                  onChangeText={set("price")}
                  placeholder="450"
                  placeholderTextColor="#9CA3AF"
                  style={inputStyle}
                  keyboardType="decimal-pad"
                />
              </Field>
            </View>
          </View>

          <Field label="Stock Quantity">
            <TextInput
              value={form.stock_quantity}
              onChangeText={set("stock_quantity")}
              placeholder="100"
              placeholderTextColor="#9CA3AF"
              style={inputStyle}
              keyboardType="number-pad"
            />
          </Field>

          <Field label="Description">
            <TextInput
              value={form.description}
              onChangeText={set("description")}
              placeholder="Product description..."
              placeholderTextColor="#9CA3AF"
              style={[
                inputStyle,
                { height: 90, textAlignVertical: "top", paddingTop: 12 },
              ]}
              multiline
            />
          </Field>

          <Field label="Status">
            <View style={{ flexDirection: "row", gap: 8 }}>
              {STATUS_OPTS.map((s) => (
                <TouchableOpacity
                  key={s}
                  onPress={() => set("status")(s)}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 10,
                    backgroundColor: form.status === s ? "#2563EB" : "#fff",
                    borderWidth: 1.5,
                    borderColor: form.status === s ? "#2563EB" : "#E5E7EB",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "600",
                      color: form.status === s ? "#fff" : "#6B7280",
                      textTransform: "capitalize",
                    }}
                  >
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Field>

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={mutation.isPending || uploading}
            style={{
              backgroundColor: "#2563EB",
              borderRadius: 12,
              paddingVertical: 15,
              alignItems: "center",
              marginTop: 8,
              opacity: mutation.isPending || uploading ? 0.7 : 1,
            }}
          >
            {mutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>
                Create Product
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingAnimatedView>
  );
}
