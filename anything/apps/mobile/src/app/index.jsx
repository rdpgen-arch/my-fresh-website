import { useAuth } from "@/utils/auth/useAuth";
import { Redirect } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";

export default function Index() {
  const { isAuthenticated, isReady, signIn } = useAuth();

  useEffect(() => {
    if (isReady && !isAuthenticated) {
      signIn();
    }
  }, [isReady, isAuthenticated]);

  if (!isReady) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#fff",
        }}
      >
        <ActivityIndicator size="large" color="#5B21B6" />
      </View>
    );
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#fff",
        padding: 32,
      }}
    >
      <Text
        style={{
          fontSize: 28,
          fontWeight: "700",
          color: "#111",
          marginBottom: 8,
        }}
      >
        Shop Manager
      </Text>
      <Text
        style={{
          fontSize: 16,
          color: "#6B7280",
          textAlign: "center",
          marginBottom: 40,
        }}
      >
        Sign in to manage your store
      </Text>
      <TouchableOpacity
        onPress={signIn}
        style={{
          backgroundColor: "#5B21B6",
          paddingHorizontal: 40,
          paddingVertical: 14,
          borderRadius: 12,
        }}
      >
        <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
          Sign In
        </Text>
      </TouchableOpacity>
    </View>
  );
}
