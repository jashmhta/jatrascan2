import { Tabs, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Platform, View, StyleSheet, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useScanner } from "@/lib/scanner-context";

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  const tabBarHeight = 64 + bottomPadding;
  const { openScanner } = useScanner();
  const router = useRouter();

  const handleScannerPress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    openScanner();
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          paddingTop: 8,
          paddingBottom: bottomPadding,
          height: tabBarHeight,
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 0.5,
          elevation: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "500",
          marginTop: 2,
        },
      }}
    >
      {/* Left side tabs */}
      <Tabs.Screen
        name="checkpoints"
        options={{
          title: "Checkpoints",
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="location.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="participants"
        options={{
          title: "Pilgrims",
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="person.2.fill" color={color} />,
        }}
      />
      
      {/* Center floating scanner button - directly opens QR scanner */}
      <Tabs.Screen
        name="index"
        options={{
          title: "",
          tabBarButton: () => (
            <TouchableOpacity
              onPress={handleScannerPress}
              activeOpacity={0.8}
              style={styles.centerButtonContainer}
            >
              <View style={styles.centerButtonWrapper}>
                <LinearGradient
                  colors={["#FF7F3F", "#F7931E"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.floatingButton}
                >
                  <View style={styles.innerCircle}>
                    <IconSymbol 
                      size={30} 
                      name="qrcode.viewfinder" 
                      color="#FF7F3F"
                    />
                  </View>
                </LinearGradient>
              </View>
            </TouchableOpacity>
          ),
          tabBarLabel: () => null,
        }}
      />
      
      {/* Right side tabs */}
      <Tabs.Screen
        name="reports"
        options={{
          title: "Reports",
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="chart.bar.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="gearshape.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  centerButtonContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  centerButtonWrapper: {
    position: "relative",
    top: -20,
    alignItems: "center",
    justifyContent: "center",
  },
  floatingButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FF7F3F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  innerCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
});
