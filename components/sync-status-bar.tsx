import { View, Text } from "react-native";
import { IconSymbol } from "./ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import type { SyncStatus } from "@/types";

interface SyncStatusBarProps {
  syncStatus: SyncStatus;
}

export function SyncStatusBar({ syncStatus }: SyncStatusBarProps) {
  const colors = useColors();

  const formatLastSync = (date: Date | null) => {
    if (!date) return "Never";
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  return (
    <View style={{
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 10,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <IconSymbol 
          name={syncStatus.isOnline ? "wifi" : "wifi.slash"} 
          size={18} 
          color={syncStatus.isOnline ? colors.success : colors.error} 
        />
        <Text style={{ fontSize: 13, color: syncStatus.isOnline ? colors.success : colors.error, fontWeight: "500" }}>
          {syncStatus.isOnline ? "Online" : "Offline"}
        </Text>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
        {syncStatus.pendingScans > 0 && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <View style={{
              backgroundColor: colors.warning,
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 10,
            }}>
              <Text style={{ fontSize: 12, color: "#fff", fontWeight: "600" }}>
                {syncStatus.pendingScans} pending
              </Text>
            </View>
          </View>
        )}

        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <IconSymbol name="clock.fill" size={14} color={colors.muted} />
          <Text style={{ fontSize: 12, color: colors.muted }}>
            {syncStatus.isSyncing ? "Syncing..." : `Last sync: ${formatLastSync(syncStatus.lastSyncTime)}`}
          </Text>
        </View>
      </View>
    </View>
  );
}
