import { View, Text, FlatList, TouchableOpacity, ScrollView, Modal, TextInput, Alert, Share, Platform } from "react-native";
import { useState } from "react";
import { useLocalSearchParams, router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { 
  CHECKPOINTS, 
  CHECKPOINT_IDS,
  getCheckpointColorById,
  getCheckpointById,
} from "@/constants/checkpoints";
import { useOfflineSync } from "@/hooks/use-offline-sync";
import { formatToIST } from "@/types";

type DateFilter = 'today' | 'yesterday' | 'last7days' | 'all' | 'custom';

export default function CheckpointDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const checkpointId = parseInt(id || "1");
  const colors = useColors();
  const { scanLogs, participants } = useOfflineSync();
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const checkpoint = getCheckpointById(checkpointId);
  const checkpointColor = getCheckpointColorById(checkpointId);

  // Get date range based on filter
  const getDateRange = () => {
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    switch (dateFilter) {
      case 'today':
        return { start: today, end: now };
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return { start: yesterday, end: today };
      case 'last7days':
        const last7days = new Date(today);
        last7days.setDate(last7days.getDate() - 7);
        return { start: last7days, end: now };
      case 'all':
        return { start: new Date(0), end: now };
      case 'custom':
        if (customStartDate && customEndDate) {
          const start = new Date(customStartDate);
          start.setHours(0, 0, 0, 0);
          const end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999);
          return { start, end };
        }
        return { start: today, end: now };
    }
  };

  const dateRange = getDateRange();

  // Filter scan logs for this checkpoint and date range
  const checkpointScans = scanLogs
    .filter(log => {
      const logDate = new Date(log.scannedAt);
      return log.checkpointId === checkpointId && 
             logDate >= dateRange.start && 
             logDate <= dateRange.end;
    })
    .sort((a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime());

  // Get today's scans for the stats card
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayScans = scanLogs.filter(log => 
    log.checkpointId === checkpointId && 
    new Date(log.scannedAt) >= today
  );

  // Get total scans for the stats card
  const totalScans = scanLogs.filter(log => log.checkpointId === checkpointId);

  const getCheckpointIcon = (checkpointId: number) => {
    switch (checkpointId) {
      case CHECKPOINT_IDS.MOTISHA_TUK:
        return "flag.fill";
      case CHECKPOINT_IDS.GHETI:
        return "checkmark.circle.fill";
      case CHECKPOINT_IDS.SAGAAL_POL:
        return "flag.checkered";
      default:
        return "location.fill";
    }
  };

  const getParticipantName = (participantUuid: string) => {
    const participant = participants.find(p => p.uuid === participantUuid);
    return participant ? participant.name : "Unknown";
  };

  const getParticipantBadge = (participantUuid: string) => {
    const participant = participants.find(p => p.uuid === participantUuid);
    return participant ? participant.badgeNumber : "?";
  };

  const exportToCSV = async () => {
    if (!checkpoint) return;
    setIsExporting(true);
    try {
      const headers = ["Badge Number", "Pilgrim Name", "Checkpoint", "Scan Time"];
      const rows = checkpointScans.map(log => {
        const participant = participants.find(p => p.uuid === log.participantUuid);
        return [
          participant?.badgeNumber || "Unknown",
          participant?.name || "Unknown",
          checkpoint?.name || "Unknown",
          formatToIST(new Date(log.scannedAt))
        ];
      });
      const csvContent = [headers.join(","), ...rows.map(row => row.join(","))].join("\n");
      const filterLabel = dateFilter === "custom" && customStartDate && customEndDate ? `${customStartDate.toLocaleDateString()}_to_${customEndDate.toLocaleDateString()}` : dateFilter;
      const filename = `${checkpoint?.name.replace(/\s+/g, "_")}_${filterLabel}_scans.csv`;
      if (Platform.OS === "web") {
        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        link.click();
        window.URL.revokeObjectURL(url);
        Alert.alert("Success", "CSV file downloaded successfully");
      } else {
        await Share.share({ message: csvContent, title: filename });
      }
    } catch (error) {
      console.error("Export error:", error);
      Alert.alert("Export Failed", "Could not export scan data");
    } finally {
      setIsExporting(false);
    }
  };

  if (!checkpoint) {
    return (
      <ScreenContainer className="p-4">
        <Text style={{ color: colors.foreground }}>Checkpoint not found</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="p-4">
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 24 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.surface,
            justifyContent: "center",
            alignItems: "center",
            marginRight: 16,
          }}
        >
          <IconSymbol name="chevron.left" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.foreground }}>
            {checkpoint.name}
          </Text>
          <Text style={{ fontSize: 14, color: colors.muted, marginTop: 2 }}>
            {checkpoint.description}
          </Text>
        </View>
        <TouchableOpacity
          onPress={exportToCSV}
          disabled={isExporting || checkpointScans.length === 0}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: checkpointScans.length > 0 ? checkpointColor : colors.surface,
            justifyContent: "center",
            alignItems: "center",
            opacity: isExporting ? 0.5 : 1,
          }}
        >
          <IconSymbol 
            name="square.and.arrow.up" 
            size={20} 
            color={checkpointScans.length > 0 ? "#fff" : colors.muted} 
          />
        </TouchableOpacity>
      </View>

      {/* Stats Cards */}
      <View style={{ flexDirection: "row", gap: 12, marginBottom: 24 }}>
        <View style={{
          flex: 1,
          backgroundColor: checkpointColor + "20",
          borderRadius: 16,
          padding: 16,
          borderWidth: 1,
          borderColor: checkpointColor + "40",
        }}>
          <Text style={{ fontSize: 32, fontWeight: "bold", color: checkpointColor }}>
            {todayScans.length}
          </Text>
          <Text style={{ fontSize: 13, color: colors.muted, marginTop: 4 }}>
            Scans Today
          </Text>
        </View>
        <View style={{
          flex: 1,
          backgroundColor: colors.surface,
          borderRadius: 16,
          padding: 16,
          borderWidth: 1,
          borderColor: colors.border,
        }}>
          <Text style={{ fontSize: 32, fontWeight: "bold", color: colors.foreground }}>
            {totalScans.length}
          </Text>
          <Text style={{ fontSize: 13, color: colors.muted, marginTop: 4 }}>
            Total Scans
          </Text>
        </View>
      </View>

      {/* Date Filter */}
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {(['today', 'yesterday', 'last7days', 'all', 'custom'] as DateFilter[]).map((filter) => {
          const labels: Record<DateFilter, string> = {
            today: 'Today',
            yesterday: 'Yesterday',
            last7days: 'Last 7 Days',
            all: 'All Time',
            custom: 'Custom'
          };
          
          return (
            <TouchableOpacity
              key={filter}
              onPress={() => {
                if (filter === 'custom') {
                  setShowDatePicker(true);
                } else {
                  setDateFilter(filter);
                }
              }}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 8,
                backgroundColor: dateFilter === filter ? checkpointColor : colors.surface,
                borderWidth: 1,
                borderColor: dateFilter === filter ? checkpointColor : colors.border,
              }}
            >
              <Text style={{
                fontSize: 13,
                fontWeight: "500",
                color: dateFilter === filter ? "#fff" : colors.foreground,
              }}>
                {labels[filter]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Scan Logs List */}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 18, fontWeight: "600", color: colors.foreground, marginBottom: 16 }}>
          Scan History ({checkpointScans.length})
        </Text>

        {checkpointScans.length === 0 ? (
          <View style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingVertical: 60,
          }}>
            <View style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: colors.surface,
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 16,
            }}>
              <IconSymbol 
                name={getCheckpointIcon(checkpointId) as any} 
                size={36} 
                color={colors.muted} 
              />
            </View>
            <Text style={{ fontSize: 16, color: colors.muted, textAlign: "center" }}>
              No scans recorded yet
            </Text>
            <Text style={{ fontSize: 14, color: colors.muted, textAlign: "center", marginTop: 8 }}>
              Scans at this checkpoint will appear here
            </Text>
          </View>
        ) : (
          <FlatList
            data={checkpointScans}
            keyExtractor={(item) => item.uuid}
            contentContainerStyle={{ gap: 12 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const isToday = new Date(item.scannedAt) >= today;
              
              return (
                <TouchableOpacity
                  onPress={() => {
                    const participant = participants.find(p => p.uuid === item.participantUuid);
                    if (participant) {
                      router.push(`/participant/${participant.id}`);
                    }
                  }}
                  style={{
                    backgroundColor: colors.surface,
                    borderRadius: 12,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: isToday ? checkpointColor + "40" : colors.border,
                    borderLeftWidth: 4,
                    borderLeftColor: isToday ? checkpointColor : colors.border,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <View style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: checkpointColor + "20",
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: 12,
                    }}>
                      <Text style={{ fontSize: 14, fontWeight: "bold", color: checkpointColor }}>
                        #{getParticipantBadge(item.participantUuid)}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground }}>
                        {getParticipantName(item.participantUuid)}
                      </Text>
                      <Text style={{ fontSize: 13, color: colors.muted, marginTop: 2 }}>
                        {formatToIST(new Date(item.scannedAt))}
                      </Text>
                    </View>
                    <IconSymbol 
                      name="chevron.right" 
                      size={20} 
                      color={colors.muted} 
                    />
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>

      {/* Custom Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
        }}>
          <View style={{
            backgroundColor: colors.background,
            borderRadius: 16,
            padding: 24,
            width: "100%",
            maxWidth: 400,
          }}>
            <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.foreground, marginBottom: 20 }}>
              Select Date Range
            </Text>

            <Text style={{ fontSize: 14, color: colors.muted, marginBottom: 8 }}>
              Start Date (DD/MM/YYYY)
            </Text>
            <TextInput
              placeholder="01/01/2026"
              placeholderTextColor={colors.muted}
              style={{
                backgroundColor: colors.surface,
                borderRadius: 8,
                padding: 12,
                fontSize: 16,
                color: colors.foreground,
                borderWidth: 1,
                borderColor: colors.border,
                marginBottom: 16,
              }}
              onChangeText={(text) => {
                const parts = text.split('/');
                if (parts.length === 3) {
                  const day = parseInt(parts[0]);
                  const month = parseInt(parts[1]) - 1;
                  const year = parseInt(parts[2]);
                  if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                    setCustomStartDate(new Date(year, month, day));
                  }
                }
              }}
            />

            <Text style={{ fontSize: 14, color: colors.muted, marginBottom: 8 }}>
              End Date (DD/MM/YYYY)
            </Text>
            <TextInput
              placeholder="03/01/2026"
              placeholderTextColor={colors.muted}
              style={{
                backgroundColor: colors.surface,
                borderRadius: 8,
                padding: 12,
                fontSize: 16,
                color: colors.foreground,
                borderWidth: 1,
                borderColor: colors.border,
                marginBottom: 24,
              }}
              onChangeText={(text) => {
                const parts = text.split('/');
                if (parts.length === 3) {
                  const day = parseInt(parts[0]);
                  const month = parseInt(parts[1]) - 1;
                  const year = parseInt(parts[2]);
                  if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                    setCustomEndDate(new Date(year, month, day));
                  }
                }
              }}
            />

            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                onPress={() => setShowDatePicker(false)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 8,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  if (customStartDate && customEndDate) {
                    if (customStartDate > customEndDate) {
                      Alert.alert("Invalid Date Range", "Start date must be before end date");
                      return;
                    }
                    setDateFilter('custom');
                    setShowDatePicker(false);
                  } else {
                    Alert.alert("Missing Dates", "Please enter both start and end dates");
                  }
                }}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 8,
                  backgroundColor: checkpointColor,
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: "600", color: "#fff" }}>
                  Apply
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}
