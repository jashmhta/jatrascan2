import { useLocalSearchParams, useRouter } from "expo-router";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/use-colors";
import { useOfflineSync } from "@/hooks/use-offline-sync";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useMemo } from "react";
import { CHECKPOINTS, JATRA_COMPLETION_CHECKPOINT } from "@/constants/checkpoints";

export default function QRCardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { participants, scanLogs, isLoading } = useOfflineSync();

  const participant = useMemo(() => {
    return participants.find(p => p.uuid === id);
  }, [participants, id]);

  const pilgrimStats = useMemo(() => {
    if (!participant) return null;

    const pScans = scanLogs.filter(log => log.participantUuid === participant.uuid);
    const aamliScans = pScans.filter(log => log.checkpointId === 1).length;
    const ghetiScans = pScans.filter(log => log.checkpointId === JATRA_COMPLETION_CHECKPOINT).length;
    const xScans = pScans.filter(log => log.checkpointId === 3).length;
    const isDescending = aamliScans > ghetiScans;
    const lastScan = pScans.length > 0 
      ? pScans.sort((a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime())[0]
      : null;

    return {
      totalScans: pScans.length,
      jatras: ghetiScans,
      aamliScans,
      ghetiScans,
      xScans,
      isDescending,
      lastScan,
    };
  }, [participant, scanLogs]);

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!participant) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={styles.errorContainer}>
          <IconSymbol name="exclamationmark.triangle.fill" size={48} color={colors.error} />
          <Text style={[styles.errorTitle, { color: colors.foreground }]}>Pilgrim Not Found</Text>
          <Text style={[styles.errorSubtitle, { color: colors.muted }]}>
            The pilgrim with this ID could not be found.
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backButton, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <IconSymbol name="chevron.left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ID Card</Text>
        <View style={styles.headerButton} />
      </View>

      {/* Card */}
      <View style={styles.cardContainer}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Badge Number */}
          <View style={[styles.badgeCircle, { backgroundColor: colors.primary }]}>
            <Text style={styles.badgeNumber}>{participant.badgeNumber}</Text>
          </View>

          {/* Name */}
          <Text style={[styles.name, { color: colors.foreground }]}>{participant.name}</Text>

          {/* QR Token */}
          <View style={[styles.qrTokenContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <IconSymbol name="qrcode.viewfinder" size={24} color={colors.primary} />
            <Text style={[styles.qrToken, { color: colors.muted }]}>
              {participant.qrToken}
            </Text>
          </View>

          {/* Info Grid */}
          <View style={styles.infoGrid}>
            {participant.age && (
              <View style={[styles.infoItem, { backgroundColor: colors.background }]}>
                <Text style={[styles.infoLabel, { color: colors.muted }]}>Age</Text>
                <Text style={[styles.infoValue, { color: colors.foreground }]}>{participant.age}</Text>
              </View>
            )}
            {participant.bloodGroup && (
              <View style={[styles.infoItem, { backgroundColor: colors.background }]}>
                <Text style={[styles.infoLabel, { color: colors.muted }]}>Blood</Text>
                <Text style={[styles.infoValue, { color: colors.error }]}>{participant.bloodGroup}</Text>
              </View>
            )}
          </View>

          {/* Stats */}
          {pilgrimStats && (
            <View style={[styles.statsContainer, { borderTopColor: colors.border }]}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.success }]}>{pilgrimStats.jatras}</Text>
                <Text style={[styles.statLabel, { color: colors.muted }]}>Jatras</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.aamli }]}>{pilgrimStats.aamliScans}</Text>
                <Text style={[styles.statLabel, { color: colors.muted }]}>Aamli</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.gheti }]}>{pilgrimStats.ghetiScans}</Text>
                <Text style={[styles.statLabel, { color: colors.muted }]}>Gheti</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.checkpointX }]}>{pilgrimStats.xScans}</Text>
                <Text style={[styles.statLabel, { color: colors.muted }]}>X</Text>
              </View>
            </View>
          )}

          {/* Status Badge */}
          {pilgrimStats?.isDescending && (
            <View style={[styles.statusBadge, { backgroundColor: colors.warning + "20" }]}>
              <IconSymbol name="location.fill" size={16} color={colors.warning} />
              <Text style={[styles.statusText, { color: colors.warning }]}>Currently Descending</Text>
            </View>
          )}

          {/* Last Scan */}
          {pilgrimStats?.lastScan && (
            <View style={[styles.lastScanContainer, { backgroundColor: colors.background }]}>
              <Text style={[styles.lastScanLabel, { color: colors.muted }]}>Last Scan</Text>
              <Text style={[styles.lastScanValue, { color: colors.foreground }]}>
                {CHECKPOINTS.find(c => c.id === pilgrimStats.lastScan?.checkpointId)?.name || "Unknown"} •{" "}
                {new Date(pilgrimStats.lastScan.scannedAt).toLocaleString()}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Emergency Contact */}
      {participant.emergencyContact && (
        <View style={[styles.emergencyContainer, { backgroundColor: colors.error + "10", borderColor: colors.error + "30" }]}>
          <IconSymbol name="phone.fill" size={18} color={colors.error} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.emergencyLabel, { color: colors.muted }]}>Emergency Contact</Text>
            <Text style={[styles.emergencyValue, { color: colors.foreground }]}>{participant.emergencyContact}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
  cardContainer: {
    padding: 20,
    flex: 1,
  },
  card: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    alignItems: "center",
  },
  badgeCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  badgeNumber: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
  },
  name: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 12,
  },
  qrTokenContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  qrToken: {
    fontSize: 13,
    fontFamily: "monospace",
  },
  infoGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  infoItem: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
  },
  infoLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 18,
    fontWeight: "600",
  },
  statsContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    paddingTop: 20,
    width: "100%",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 40,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 16,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "500",
  },
  lastScanContainer: {
    width: "100%",
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  lastScanLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  lastScanValue: {
    fontSize: 14,
    fontWeight: "500",
  },
  emergencyContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  emergencyLabel: {
    fontSize: 12,
  },
  emergencyValue: {
    fontSize: 15,
    fontWeight: "500",
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 16,
  },
  errorSubtitle: {
    fontSize: 15,
    textAlign: "center",
    marginTop: 8,
  },
  backButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
