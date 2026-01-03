import { useState, useMemo } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useOfflineSync } from "@/hooks/use-offline-sync";
import { CHECKPOINTS, JATRA_COMPLETION_CHECKPOINT, TOTAL_PARTICIPANTS } from "@/constants/checkpoints";
import { AIChat } from "@/components/ai-chat";
import { exportPDFReport } from "@/services/pdf-export";


type DayFilter = "all" | "day1" | "day2";

export default function ReportsScreen() {
  const colors = useColors();
  const { participants, scanLogs, isLoading, syncStatus } = useOfflineSync();
  const [isExporting, setIsExporting] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [isPDFExporting, setIsPDFExporting] = useState(false);
  const [dayFilter, setDayFilter] = useState<DayFilter>("all");

  // Filter scan logs by day
  const filteredScanLogs = useMemo(() => {
    if (dayFilter === "all") return scanLogs;
    
    // Determine Day 1 and Day 2 dates based on earliest scan
    const sortedScans = [...scanLogs].sort((a, b) => 
      new Date(a.scannedAt).getTime() - new Date(b.scannedAt).getTime()
    );
    
    if (sortedScans.length === 0) return scanLogs;
    
    const firstScanDate = new Date(sortedScans[0].scannedAt);
    firstScanDate.setHours(0, 0, 0, 0);
    
    const day1Start = new Date(firstScanDate);
    const day1End = new Date(firstScanDate);
    day1End.setHours(23, 59, 59, 999);
    
    const day2Start = new Date(firstScanDate);
    day2Start.setDate(day2Start.getDate() + 1);
    day2Start.setHours(0, 0, 0, 0);
    
    const day2End = new Date(day2Start);
    day2End.setHours(23, 59, 59, 999);
    
    if (dayFilter === "day1") {
      return scanLogs.filter(log => {
        const scanDate = new Date(log.scannedAt);
        return scanDate >= day1Start && scanDate <= day1End;
      });
    } else {
      return scanLogs.filter(log => {
        const scanDate = new Date(log.scannedAt);
        return scanDate >= day2Start && scanDate <= day2End;
      });
    }
  }, [scanLogs, dayFilter]);

  // Calculate statistics based on filtered scans
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayScans = filteredScanLogs.filter(log => new Date(log.scannedAt) >= today);
    const totalJatras = filteredScanLogs.filter(log => log.checkpointId === JATRA_COMPLETION_CHECKPOINT).length;
    const todayJatras = todayScans.filter(log => log.checkpointId === JATRA_COMPLETION_CHECKPOINT).length;

    // Calculate unique pilgrims scanned
    const uniquePilgrimsScanned = new Set(filteredScanLogs.map(log => log.participantUuid)).size;

    // Calculate pilgrims currently descending (Aamli scans > Gheti scans)
    const descendingCount = participants.filter(p => {
      const pScans = filteredScanLogs.filter(log => log.participantUuid === p.uuid);
      const aamliScans = pScans.filter(log => log.checkpointId === 1).length;
      const ghetiScans = pScans.filter(log => log.checkpointId === JATRA_COMPLETION_CHECKPOINT).length;
      return aamliScans > ghetiScans;
    }).length;

    // Checkpoint breakdown
    const checkpointStats = CHECKPOINTS.map(cp => ({
      ...cp,
      total: filteredScanLogs.filter(log => log.checkpointId === cp.id).length,
      today: todayScans.filter(log => log.checkpointId === cp.id).length,
    }));

    // Top pilgrims by Jatras
    const pilgrimJatras = participants.map(p => ({
      ...p,
      jatraCount: filteredScanLogs.filter(log => 
        log.participantUuid === p.uuid && 
        log.checkpointId === JATRA_COMPLETION_CHECKPOINT
      ).length,
    })).filter(p => p.jatraCount > 0).sort((a, b) => b.jatraCount - a.jatraCount).slice(0, 5);

    return {
      totalScans: filteredScanLogs.length,
      todayScans: todayScans.length,
      totalJatras,
      todayJatras,
      uniquePilgrimsScanned,
      descendingCount,
      checkpointStats,
      pilgrimJatras,
    };
  }, [participants, filteredScanLogs]);

  // Generate CSV content
  const generateCSV = (type: "scans" | "pilgrims" | "summary"): string => {
    const checkpointNames: Record<number, string> = {
      1: "Aamli",
      2: "Gheti",
      3: "X",
    };

    if (type === "scans") {
      // Scan logs CSV
      const headers = ["Timestamp", "Badge Number", "Pilgrim Name", "Checkpoint", "Synced"];
      const rows = filteredScanLogs.map(log => {
        const participant = participants.find(p => p.uuid === log.participantUuid);
        return [
          new Date(log.scannedAt).toLocaleString(),
          participant?.badgeNumber || "Unknown",
          participant?.name || "Unknown",
          checkpointNames[log.checkpointId] || `Checkpoint ${log.checkpointId}`,
          log.synced ? "Yes" : "No",
        ].join(",");
      });
      return [headers.join(","), ...rows].join("\n");
    } else if (type === "pilgrims") {
      // Pilgrim summary CSV
      const headers = ["Badge Number", "Name", "Age", "Blood Group", "Emergency Contact", "Total Jatras", "Total Scans"];
      const rows = participants.map(p => {
        const pScans = filteredScanLogs.filter(log => log.participantUuid === p.uuid);
        const jatraCount = pScans.filter(log => log.checkpointId === JATRA_COMPLETION_CHECKPOINT).length;
        return [
          p.badgeNumber,
          `"${p.name}"`,
          p.age || "",
          p.bloodGroup || "",
          p.emergencyContact || "",
          jatraCount,
          pScans.length,
        ].join(",");
      });
      return [headers.join(","), ...rows].join("\n");
    } else {
      // Summary CSV
      const dayLabel = dayFilter === "all" ? "All Days" : dayFilter === "day1" ? "Day 1" : "Day 2";
      const lines = [
        `Palitana Yatra Summary Report (${dayLabel})`,
        `Generated: ${new Date().toLocaleString()}`,
        "",
        "Overall Statistics",
        `Total Participants,${TOTAL_PARTICIPANTS}`,
        `Unique Pilgrims Scanned,${stats.uniquePilgrimsScanned}`,
        `Total Scans,${stats.totalScans}`,
        `Total Jatras Completed,${stats.totalJatras}`,
        `Currently Descending,${stats.descendingCount}`,
        "",
        "Checkpoint Breakdown",
        ...stats.checkpointStats.map(cp => `${cp.name},${cp.total}`),
        "",
        "Top Pilgrims by Jatras",
        ...stats.pilgrimJatras.map((p, i) => `${i + 1}. ${p.name} (Badge #${p.badgeNumber}),${p.jatraCount} Jatras`),
      ];
      return lines.join("\n");
    }
  };

  const handleExportCSV = async (type: "scans" | "pilgrims" | "summary") => {
    setIsExporting(true);
    try {
      const csv = generateCSV(type);
      const dayLabel = dayFilter === "all" ? "all" : dayFilter;
      const filename = `palitana_${type}_${dayLabel}_${Date.now()}.csv`;
      const fileUri = `${FileSystem.documentDirectory}${filename}`;
      
      await FileSystem.writeAsStringAsync(fileUri, csv, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "text/csv",
          dialogTitle: `Export ${type} report`,
        });
      } else {
        Alert.alert("Export Complete", `File saved to: ${filename}`);
      }
    } catch (error) {
      console.error("Export error:", error);
      Alert.alert("Export Failed", "Could not export the report. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    setIsPDFExporting(true);
    try {
      const dayLabel = dayFilter === "all" ? "All Days" : dayFilter === "day1" ? "Day 1" : "Day 2";
      await exportPDFReport({
        participants,
        scanLogs: filteredScanLogs,
        reportType: "full",
        title: `Palitana Yatra Report - ${dayLabel}`,
      });
    } catch (error) {
      console.error("PDF export error:", error);
      Alert.alert("Export Failed", "Could not generate PDF report. Please try again.");
    } finally {
      setIsPDFExporting(false);
    }
  };

  const StatCard = ({ title, value, subtitle, icon, color }: {
    title: string;
    value: number | string;
    subtitle?: string;
    icon: any;
    color: string;
  }) => (
    <View style={{
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    }}>
      <View style={{
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: color + "20",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 12,
      }}>
        <IconSymbol name={icon} size={22} color={color} />
      </View>
      <Text style={{ fontSize: 28, fontWeight: "bold", color: colors.foreground }}>
        {value}
      </Text>
      <Text style={{ fontSize: 13, color: colors.muted, marginTop: 2 }}>
        {title}
      </Text>
      {subtitle && (
        <Text style={{ fontSize: 12, color: color, marginTop: 4 }}>
          {subtitle}
        </Text>
      )}
    </View>
  );

  if (isLoading) {
    return (
      <ScreenContainer className="p-4">
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ color: colors.muted, marginTop: 16 }}>Loading statistics...</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
        <Text style={{ fontSize: 28, fontWeight: "bold", color: colors.foreground, marginBottom: 4 }}>
          Reports
        </Text>
        <Text style={{ fontSize: 15, color: colors.muted, marginBottom: 16 }}>
          Pilgrimage statistics and insights
        </Text>

        {/* Day Filter - Prominent */}
        <View style={{
          backgroundColor: colors.primary + "10",
          borderRadius: 16,
          padding: 16,
          marginBottom: 20,
          borderWidth: 2,
          borderColor: colors.primary,
        }}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
            <IconSymbol name="calendar" size={20} color={colors.primary} />
            <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground, marginLeft: 8 }}>
              Filter by Day
            </Text>
          </View>
          <View style={{ flexDirection: "row", gap: 10 }}>
            {([
              { key: "all", label: "All Days" },
              { key: "day1", label: "Day 1" },
              { key: "day2", label: "Day 2" },
            ] as { key: DayFilter; label: string }[]).map(option => (
              <TouchableOpacity
                key={option.key}
                onPress={() => setDayFilter(option.key)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: dayFilter === option.key ? colors.primary : colors.surface,
                  borderWidth: 2,
                  borderColor: dayFilter === option.key ? colors.primary : colors.border,
                  alignItems: "center",
                }}
              >
                <Text style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: dayFilter === option.key ? "#fff" : colors.foreground,
                }}>
                  {option.label}
                </Text>
                {dayFilter === option.key && (
                  <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", marginTop: 2 }}>
                    {stats.totalScans} scans
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Export Buttons */}
        <View style={{
          backgroundColor: colors.surface,
          borderRadius: 16,
          padding: 16,
          marginBottom: 20,
          borderWidth: 1,
          borderColor: colors.border,
        }}>
          <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground, marginBottom: 12 }}>
            Export Reports {dayFilter !== "all" && `(${dayFilter === "day1" ? "Day 1" : "Day 2"})`}
          </Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <TouchableOpacity
              onPress={() => handleExportCSV("scans")}
              disabled={isExporting}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                backgroundColor: colors.primary,
                paddingVertical: 12,
                borderRadius: 12,
                opacity: isExporting ? 0.6 : 1,
              }}
            >
              <IconSymbol name="arrow.down.doc.fill" size={18} color="#fff" />
              <Text style={{ color: "#fff", fontWeight: "600", fontSize: 13 }}>Scans</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => handleExportCSV("pilgrims")}
              disabled={isExporting}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                backgroundColor: colors.success,
                paddingVertical: 12,
                borderRadius: 12,
                opacity: isExporting ? 0.6 : 1,
              }}
            >
              <IconSymbol name="person.2.fill" size={18} color="#fff" />
              <Text style={{ color: "#fff", fontWeight: "600", fontSize: 13 }}>Pilgrims</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => handleExportCSV("summary")}
              disabled={isExporting}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                backgroundColor: colors.warning,
                paddingVertical: 12,
                borderRadius: 12,
                opacity: isExporting ? 0.6 : 1,
              }}
            >
              <IconSymbol name="chart.bar.fill" size={18} color="#fff" />
              <Text style={{ color: "#fff", fontWeight: "600", fontSize: 13 }}>Summary</Text>
            </TouchableOpacity>
          </View>
          
          {/* PDF Export Button */}
          <TouchableOpacity
            onPress={handleExportPDF}
            disabled={isPDFExporting}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              backgroundColor: colors.error,
              paddingVertical: 14,
              borderRadius: 12,
              marginTop: 12,
              opacity: isPDFExporting ? 0.6 : 1,
            }}
          >
            {isPDFExporting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <IconSymbol name="doc.fill" size={20} color="#fff" />
            )}
            <Text style={{ color: "#fff", fontWeight: "600", fontSize: 14 }}>
              {isPDFExporting ? "Generating PDF..." : "Generate Full PDF Report"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* AI Chat Button */}
        <TouchableOpacity
          onPress={() => setShowAIChat(true)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            backgroundColor: "#8B5CF6",
            paddingVertical: 16,
            borderRadius: 16,
            marginBottom: 20,
          }}
        >
          <IconSymbol name="sparkles" size={22} color="#fff" />
          <Text style={{ color: "#fff", fontWeight: "600", fontSize: 16 }}>
            Ask AI About Data
          </Text>
        </TouchableOpacity>

        {/* Quick Stats */}
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 20 }}>
          <StatCard
            title="Total Scans"
            value={stats.totalScans}
            subtitle={`${stats.todayScans} today`}
            icon="qrcode.viewfinder"
            color={colors.primary}
          />
          <StatCard
            title="Jatras"
            value={stats.totalJatras}
            subtitle={`${stats.todayJatras} today`}
            icon="star.fill"
            color={colors.success}
          />
        </View>

        <View style={{ flexDirection: "row", gap: 12, marginBottom: 20 }}>
          <StatCard
            title="Pilgrims Scanned"
            value={stats.uniquePilgrimsScanned}
            subtitle={`of ${TOTAL_PARTICIPANTS} total`}
            icon="person.2.fill"
            color="#8B5CF6"
          />
          <StatCard
            title="Descending"
            value={stats.descendingCount}
            subtitle="on the hill"
            icon="arrow.down"
            color={colors.warning}
          />
        </View>

        {/* Checkpoint Breakdown */}
        <View style={{
          backgroundColor: colors.surface,
          borderRadius: 16,
          padding: 16,
          marginBottom: 20,
          borderWidth: 1,
          borderColor: colors.border,
        }}>
          <Text style={{ fontSize: 18, fontWeight: "600", color: colors.foreground, marginBottom: 16 }}>
            Checkpoint Breakdown
          </Text>
          {stats.checkpointStats.map(cp => (
            <View key={cp.id} style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 12,
              borderBottomWidth: cp.id < 3 ? 1 : 0,
              borderBottomColor: colors.border,
            }}>
              <View style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: cp.color,
                marginRight: 12,
              }} />
              <Text style={{ flex: 1, fontSize: 15, color: colors.foreground }}>
                {cp.name}
              </Text>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.foreground }}>
                  {cp.total}
                </Text>
                <Text style={{ fontSize: 12, color: colors.muted }}>
                  {cp.today} today
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Top Pilgrims */}
        {stats.pilgrimJatras.length > 0 && (
          <View style={{
            backgroundColor: colors.surface,
            borderRadius: 16,
            padding: 16,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: colors.border,
          }}>
            <Text style={{ fontSize: 18, fontWeight: "600", color: colors.foreground, marginBottom: 16 }}>
              Top Pilgrims by Jatras
            </Text>
            {stats.pilgrimJatras.map((pilgrim, index) => (
              <View key={pilgrim.uuid} style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 10,
                borderBottomWidth: index < stats.pilgrimJatras.length - 1 ? 1 : 0,
                borderBottomColor: colors.border,
              }}>
                <View style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: index === 0 ? "#FFD700" : index === 1 ? "#C0C0C0" : index === 2 ? "#CD7F32" : colors.muted + "30",
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 12,
                }}>
                  <Text style={{ fontSize: 12, fontWeight: "bold", color: index < 3 ? "#000" : colors.muted }}>
                    {index + 1}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: "500", color: colors.foreground }}>
                    {pilgrim.name}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.muted }}>
                    Badge #{pilgrim.badgeNumber}
                  </Text>
                </View>
                <View style={{
                  backgroundColor: colors.success + "20",
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 12,
                }}>
                  <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.success }}>
                    {pilgrim.jatraCount} {pilgrim.jatraCount === 1 ? "Jatra" : "Jatras"}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Sync Status */}
        <View style={{
          backgroundColor: syncStatus.isOnline ? colors.success + "10" : colors.warning + "10",
          borderRadius: 12,
          padding: 12,
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 40,
        }}>
          <IconSymbol 
            name={syncStatus.isOnline ? "wifi" : "wifi.slash"} 
            size={18} 
            color={syncStatus.isOnline ? colors.success : colors.warning} 
          />
          <Text style={{ 
            marginLeft: 8, 
            fontSize: 13, 
            color: syncStatus.isOnline ? colors.success : colors.warning,
            flex: 1,
          }}>
            {syncStatus.isOnline ? "Online - Data synced" : `Offline - ${syncStatus.pendingScans} pending`}
          </Text>
          {syncStatus.lastSyncTime && (
            <Text style={{ fontSize: 11, color: colors.muted }}>
              Last sync: {new Date(syncStatus.lastSyncTime).toLocaleTimeString()}
            </Text>
          )}
        </View>
      </ScrollView>

      {/* AI Chat Modal */}
      <AIChat visible={showAIChat} onClose={() => setShowAIChat(false)} />
    </ScreenContainer>
  );
}
