/**
 * Settings tab — profile info, sign out
 */
import { useAuth } from "@/utils/auth/useAuth";
import { StatusBar } from "expo-status-bar";
import { Alert, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LogOut, User, Store, Bell, ChevronRight } from "lucide-react-native";

function SettingsRow({ icon: Icon, label, onPress, danger }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        paddingHorizontal: 18,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 9,
          backgroundColor: danger ? "#FEF2F2" : "#EFF6FF",
          alignItems: "center",
          justifyContent: "center",
          marginRight: 14,
        }}
      >
        <Icon size={18} color={danger ? "#DC2626" : "#2563EB"} />
      </View>
      <Text
        style={{
          flex: 1,
          fontSize: 15,
          fontWeight: "500",
          color: danger ? "#DC2626" : "#111827",
        }}
      >
        {label}
      </Text>
      <ChevronRight size={18} color="#D1D5DB" />
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { auth, signOut } = useAuth();
  const user = auth?.user;

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: signOut },
    ]);
  };

  return (
    <View
      style={{ flex: 1, backgroundColor: "#F9FAFB", paddingTop: insets.top }}
    >
      <StatusBar style="dark" />

      {/* Header */}
      <View
        style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 }}
      >
        <Text style={{ fontSize: 22, fontWeight: "700", color: "#111827" }}>
          Settings
        </Text>
      </View>

      {/* Profile card */}
      <View
        style={{
          backgroundColor: "#fff",
          marginHorizontal: 16,
          borderRadius: 16,
          padding: 20,
          marginBottom: 20,
          flexDirection: "row",
          alignItems: "center",
          shadowColor: "#000",
          shadowOpacity: 0.05,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: 2,
        }}
      >
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 26,
            backgroundColor: "#EFF6FF",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 16,
          }}
        >
          <User size={26} color="#2563EB" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: "#111827" }}>
            {user?.full_name || "Merchant"}
          </Text>
          <Text style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>
            {user?.email || ""}
          </Text>
          <View
            style={{
              backgroundColor: "#EFF6FF",
              borderRadius: 20,
              paddingHorizontal: 10,
              paddingVertical: 3,
              marginTop: 6,
              alignSelf: "flex-start",
            }}
          >
            <Text
              style={{
                color: "#2563EB",
                fontSize: 11,
                fontWeight: "600",
                textTransform: "capitalize",
              }}
            >
              {user?.role || "Admin"}
            </Text>
          </View>
        </View>
      </View>

      {/* Settings rows */}
      <View
        style={{
          backgroundColor: "#fff",
          borderRadius: 16,
          marginHorizontal: 16,
          overflow: "hidden",
          marginBottom: 12,
        }}
      >
        <SettingsRow icon={Bell} label="Notifications" onPress={() => {}} />
        <SettingsRow icon={Store} label="Store Settings" onPress={() => {}} />
      </View>

      <View
        style={{
          backgroundColor: "#fff",
          borderRadius: 16,
          marginHorizontal: 16,
          overflow: "hidden",
          marginBottom: 24,
        }}
      >
        <SettingsRow
          icon={LogOut}
          label="Sign Out"
          onPress={handleSignOut}
          danger
        />
      </View>

      {/* Version */}
      <Text style={{ textAlign: "center", color: "#9CA3AF", fontSize: 12 }}>
        Shop Manager v1.0
      </Text>
    </View>
  );
}
