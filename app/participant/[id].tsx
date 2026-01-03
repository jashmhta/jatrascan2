import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useOfflineSync } from "@/hooks/use-offline-sync";
import { CHECKPOINTS, JATRA_COMPLETION_CHECKPOINT } from "@/constants/checkpoints";

export default function ParticipantDetailScreen() {
  const colors = useColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { participants, scanLogs, getJatraCount } = useOfflineSync();

  const participant = participants.find(p => p.uuid === id);
  const participantScans = scanLogs.filter(log => log.participantUuid === id);
  const jatraCount = participant ? getJatraCount(participant.uuid) : 0;

  const getCheckpointColor = (checkpointId: number) => {
    switch (checkpointId) {
      case 1: return colors.aamli;
      case 2: return colors.gheti;
      case 3: return colors.checkpointX;
      default: return colors.primary;
    }
  };

  const formatDateTime = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!participant) {
    return (
      <ScreenContainer className="p-4">
        <Stack.Screen options={{ headerShown: true, title: "Pilgrim Details" }} />
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <IconSymbol name="person.fill" size={64} color={colors.muted} />
          <Text style={{ color: colors.muted, marginTop: 16, fontSize: 18 }}>
            Pilgrim not found
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              marginTop: 24,
              paddingHorizontal: 24,
              paddingVertical: 12,
              backgroundColor: colors.primary,
              borderRadius: 12,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "600" }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Stack.Screen 
        options={{ 
          headerShown: true, 
          title: `#${participant.badgeNumber}`,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.foreground,
        }} 
      />
      
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
        {/* Profile Header */}
        <View style={{ alignItems: "center", marginBottom: 24 }}>
          <View style={{
            width: 100,
            height: 100,
            borderRadius: 50,
            backgroundColor: colors.primary,
            justifyContent: "center",
            alignItems: "center",
            marginBottom: 16,
          }}>
            <Text style={{ color: "#fff", fontSize: 32, fontWeight: "bold" }}>
              #{participant.badgeNumber}
            </Text>
          </View>
          <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.foreground, textAlign: "center" }}>
            {participant.name}
          </Text>
          
          {jatraCount > 0 && (
            <View style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              marginTop: 8,
              backgroundColor: colors.success + "20",
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 20,
            }}>
              <IconSymbol name="star.fill" size={18} color={colors.success} />
              <Text style={{ fontSize: 16, fontWeight: "600", color: colors.success }}>
                {jatraCount} Jatra{jatraCount > 1 ? "s" : ""} Completed
              </Text>
            </View>
          )}
        </View>

        {/* Info Cards */}
        <View style={{
          backgroundColor: colors.surface,
          borderRadius: 16,
          padding: 20,
          marginBottom: 20,
          borderWidth: 1,
          borderColor: colors.border,
        }}>
          <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground, marginBottom: 16 }}>
            Personal Information
          </Text>
          
          <View style={{ gap: 12 }}>
            {participant.age && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <IconSymbol name="calendar" size={20} color={colors.muted} />
                <Text style={{ fontSize: 15, color: colors.foreground }}>
                  Age: {participant.age} years
                </Text>
              </View>
            )}
            
            {participant.bloodGroup && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <IconSymbol name="drop.fill" size={20} color={colors.error} />
                <Text style={{ fontSize: 15, color: colors.foreground }}>
                  Blood Group: {participant.bloodGroup}
                </Text>
              </View>
            )}
            
            {participant.emergencyContact && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <IconSymbol name="phone.fill" size={20} color={colors.success} />
                <Text style={{ fontSize: 15, color: colors.foreground }}>
                  Emergency: {participant.emergencyContact}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Scan History */}
        <View style={{
          backgroundColor: colors.surface,
          borderRadius: 16,
          padding: 20,
          borderWidth: 1,
          borderColor: colors.border,
        }}>
          <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground, marginBottom: 16 }}>
            Scan History ({participantScans.length} scans)
          </Text>
          
          {participantScans.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 24 }}>
              <IconSymbol name="clock.fill" size={32} color={colors.muted} />
              <Text style={{ color: colors.muted, marginTop: 8 }}>
                No scans recorded yet
              </Text>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {participantScans.map((scan, index) => {
                const checkpoint = CHECKPOINTS.find(c => c.id === scan.checkpointId);
                const isJatraComplete = scan.checkpointId === JATRA_COMPLETION_CHECKPOINT;
                
                return (
                  <View 
                    key={scan.uuid}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: 12,
                      paddingHorizontal: 12,
                      backgroundColor: colors.background,
                      borderRadius: 12,
                      borderLeftWidth: 3,
                      borderLeftColor: getCheckpointColor(scan.checkpointId),
                    }}
                  >
                    <View style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: getCheckpointColor(scan.checkpointId),
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: 12,
                    }}>
                      {isJatraComplete ? (
                        <IconSymbol name="star.fill" size={18} color="#fff" />
                      ) : (
                        <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 14 }}>
                          {checkpoint?.number}
                        </Text>
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: "500", color: colors.foreground }}>
                        {checkpoint?.name}
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.muted }}>
                        {formatDateTime(scan.scannedAt)}
                      </Text>
                    </View>
                    {isJatraComplete && (
                      <View style={{
                        backgroundColor: colors.success,
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 8,
                      }}>
                        <Text style={{ fontSize: 11, color: "#fff", fontWeight: "600" }}>
                          JATRA
                        </Text>
                      </View>
                    )}
                    {!scan.synced && (
                      <View style={{
                        backgroundColor: colors.warning,
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 6,
                        marginLeft: 8,
                      }}>
                        <Text style={{ fontSize: 10, color: "#fff", fontWeight: "500" }}>
                          Pending
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
