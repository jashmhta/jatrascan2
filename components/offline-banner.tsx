import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Animated, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

interface OfflineBannerProps {
  isOnline: boolean;
  pendingScans?: number;
}

export function OfflineBanner({ isOnline, pendingScans = 0 }: OfflineBannerProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [slideAnim] = useState(new Animated.Value(isOnline ? -100 : 0));
  const [showBanner, setShowBanner] = useState(!isOnline);

  useEffect(() => {
    if (!isOnline) {
      setShowBanner(true);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 10,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setShowBanner(false);
      });
    }
  }, [isOnline, slideAnim]);

  if (!showBanner && isOnline) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: colors.warning,
          paddingTop: Platform.OS === "web" ? 8 : insets.top + 4,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.content}>
        <IconSymbol name="wifi.slash" size={18} color="#fff" />
        <View style={styles.textContainer}>
          <Text style={styles.title}>{"You're Offline"}</Text>
          <Text style={styles.subtitle}>
            {pendingScans > 0
              ? `${pendingScans} scan${pendingScans > 1 ? "s" : ""} will sync when online`
              : "Scans will be saved locally"}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingBottom: 8,
    paddingHorizontal: 16,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  subtitle: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
  },
});
