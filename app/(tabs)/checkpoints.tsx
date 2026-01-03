import { View, Text, FlatList, TouchableOpacity } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { router } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { 
  CHECKPOINTS, 
  CHECKPOINT_IDS,
  getCheckpointColorById,
} from "@/constants/checkpoints";
import { useOfflineSync } from "@/hooks/use-offline-sync";

export default function CheckpointsScreen() {
  const colors = useColors();
  const { scanLogs } = useOfflineSync();

  const getCheckpointScans = (checkpointId: number) => {
    return scanLogs.filter(log => log.checkpointId === checkpointId).length;
  };

  const getTodayScans = (checkpointId: number) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return scanLogs.filter(log => 
      log.checkpointId === checkpointId && 
      new Date(log.scannedAt) >= today
    ).length;
  };

  const getCheckpointIcon = (checkpointId: number) => {
    switch (checkpointId) {
      case CHECKPOINT_IDS.MOTISHA_TUK:
        return "flag.fill";  // Top of hill
      case CHECKPOINT_IDS.GHETI:
        return "checkmark.circle.fill";  // Jatra completion
      case CHECKPOINT_IDS.SAGAAL_POL:
        return "flag.checkered";  // Final descent
      default:
        return "location.fill";
    }
  };

  const getCheckpointBadge = (checkpointId: number) => {
    switch (checkpointId) {
      case CHECKPOINT_IDS.MOTISHA_TUK:
        return { text: "Descent Start", color: "#FF7F3F" };
      case CHECKPOINT_IDS.GHETI:
        return { text: "Jatra Completion", color: "#4CAF50" };
      case CHECKPOINT_IDS.SAGAAL_POL:
        return { text: "Final Descent", color: "#2196F3" };
      default:
        return null;
    }
  };

  return (
    <ScreenContainer className="p-4">
      <Text style={{ fontSize: 28, fontWeight: "bold", color: colors.foreground, marginBottom: 8 }}>
        Checkpoints
      </Text>
      <Text style={{ fontSize: 15, color: colors.muted, marginBottom: 24 }}>
        Shatrunjaya pilgrimage route checkpoints
      </Text>

      <FlatList
        data={CHECKPOINTS}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ gap: 16 }}
        renderItem={({ item }) => {
          const checkpointColor = getCheckpointColorById(item.id);
          const badge = getCheckpointBadge(item.id);
          
          return (
            <TouchableOpacity
              onPress={() => router.push(`/checkpoint/${item.id}`)}
              style={{
                backgroundColor: colors.surface,
                borderRadius: 16,
                padding: 20,
                borderWidth: 1,
                borderColor: colors.border,
                borderLeftWidth: 4,
                borderLeftColor: checkpointColor,
              }}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                <View style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: checkpointColor,
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 16,
                }}>
                  <IconSymbol 
                    name={getCheckpointIcon(item.id) as any} 
                    size={24} 
                    color="#fff" 
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.foreground }}>
                    {item.name}
                  </Text>
                  <Text style={{ fontSize: 14, color: colors.muted, marginTop: 2 }}>
                    {item.description}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: "row", gap: 16 }}>
                <View style={{
                  flex: 1,
                  backgroundColor: colors.background,
                  borderRadius: 12,
                  padding: 12,
                  alignItems: "center",
                }}>
                  <Text style={{ fontSize: 24, fontWeight: "bold", color: checkpointColor }}>
                    {getTodayScans(item.id)}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
                    Today
                  </Text>
                </View>
                <View style={{
                  flex: 1,
                  backgroundColor: colors.background,
                  borderRadius: 12,
                  padding: 12,
                  alignItems: "center",
                }}>
                  <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.foreground }}>
                    {getCheckpointScans(item.id)}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
                    Total
                  </Text>
                </View>
              </View>

              {badge && (
                <View style={{
                  marginTop: 12,
                  backgroundColor: badge.color + "20",
                  borderRadius: 8,
                  padding: 10,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                }}>
                  <IconSymbol 
                    name={getCheckpointIcon(item.id) as any} 
                    size={16} 
                    color={badge.color} 
                  />
                  <Text style={{ fontSize: 13, color: badge.color, fontWeight: "500" }}>
                    {badge.text}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
      />
    </ScreenContainer>
  );
}
