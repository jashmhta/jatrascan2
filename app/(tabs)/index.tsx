import { useState, useCallback, useRef, useEffect } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  ActivityIndicator,
  Platform,
  Keyboard,
  KeyboardAvoidingView,
  Alert,
} from "react-native";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { CHECKPOINTS, QR_TOKEN_PREFIX, MIN_BADGE_NUMBER, MAX_BADGE_NUMBER, RECENT_SCANS_LIMIT, getCheckpointColorById } from "@/constants/checkpoints";
import { useOfflineSync } from "@/hooks/use-offline-sync";
import { SyncStatusBar } from "@/components/sync-status-bar";
import { ScanResultModal } from "@/components/scan-result-modal";
import { useScanner } from "@/lib/scanner-context";
import { formatToIST } from "@/types";

import type { Participant, ScanResult } from "@/types";

export default function ScannerScreen() {
  const colors = useColors();
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualBadgeNumber, setManualBadgeNumber] = useState("");
  const [manualEntryError, setManualEntryError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [showQuickSearch, setShowQuickSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [bulkBadgeNumbers, setBulkBadgeNumbers] = useState("");
  const [bulkScanResults, setBulkScanResults] = useState<{ badge: number; success: boolean; message: string }[]>([]);
  const [showBulkScanModal, setShowBulkScanModal] = useState(false);
  const [continuousScanMode, setContinuousScanMode] = useState(false);
  const [continuousScanCount, setContinuousScanCount] = useState(0);
  
  const manualInputRef = useRef<TextInput>(null);
  const searchInputRef = useRef<TextInput>(null);
  const { openScanner } = useScanner();

  const { 
    participants, 
    recentScans, 
    addScan, 
    syncStatus,
    isLoading,
    currentCheckpoint,
    setCurrentCheckpoint,
    getAtRiskPilgrims,
  } = useOfflineSync();

  // Get at-risk pilgrims count
  const atRiskPilgrims = getAtRiskPilgrims();
  const atRiskCount = atRiskPilgrims.length;

  // Filter participants for search
  const filteredParticipants = searchQuery.trim()
    ? participants.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.badgeNumber.toString().includes(searchQuery)
      ).slice(0, 10)
    : [];

  const handleCheckpointChange = useCallback(async (checkpointId: number) => {
    await setCurrentCheckpoint(checkpointId);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [setCurrentCheckpoint]);

  const handleManualBadgeEntry = useCallback(async () => {
    Keyboard.dismiss();
    const badgeNum = parseInt(manualBadgeNumber.trim(), 10);
    
    if (isNaN(badgeNum) || badgeNum < MIN_BADGE_NUMBER || badgeNum > MAX_BADGE_NUMBER) {
      setManualEntryError(`Please enter a valid badge number (${MIN_BADGE_NUMBER}-${MAX_BADGE_NUMBER})`);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      return;
    }

    setIsProcessing(true);
    setManualEntryError("");

    try {
      const qrToken = `${QR_TOKEN_PREFIX}${badgeNum}`;
      const participant = participants.find(p => p.qrToken === qrToken);

      if (!participant) {
        setScanResult({
          success: false,
          message: `Pilgrim with badge #${badgeNum} not found`,
        });
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
        setShowManualEntry(false);
        setManualBadgeNumber("");
        return;
      }

      const result = await addScan(participant, currentCheckpoint);
      setScanResult(result);
      
      // In continuous mode, keep modal open and clear input
      if (continuousScanMode) {
        setManualBadgeNumber("");
        setContinuousScanCount(prev => prev + 1);
        setTimeout(() => manualInputRef.current?.focus(), 100);
      } else {
        setShowManualEntry(false);
        setManualBadgeNumber("");
      }
    } catch (error) {
      console.error("Manual entry error:", error);
      setScanResult({
        success: false,
        message: "Failed to record scan",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [manualBadgeNumber, participants, currentCheckpoint, addScan, continuousScanMode]);

  const handleQuickScan = useCallback(async (participant: Participant) => {
    Keyboard.dismiss();
    setIsProcessing(true);
    setShowQuickSearch(false);
    setSearchQuery("");

    try {
      const result = await addScan(participant, currentCheckpoint);
      setScanResult(result);
    } catch (error) {
      console.error("Quick scan error:", error);
      setScanResult({
        success: false,
        message: "Failed to record scan",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [currentCheckpoint, addScan]);

  const handleBulkScan = useCallback(async () => {
    Keyboard.dismiss();
    const badgeNumbers = bulkBadgeNumbers
      .split(/[,\s\n]+/)
      .map(s => parseInt(s.trim(), 10))
      .filter(n => !isNaN(n) && n >= MIN_BADGE_NUMBER && n <= MAX_BADGE_NUMBER);

    if (badgeNumbers.length === 0) {
      return;
    }

    setIsProcessing(true);
    const results: { badge: number; success: boolean; message: string }[] = [];

    for (const badgeNum of badgeNumbers) {
      const qrToken = `${QR_TOKEN_PREFIX}${badgeNum}`;
      const participant = participants.find(p => p.qrToken === qrToken);

      if (!participant) {
        results.push({ badge: badgeNum, success: false, message: "Not found" });
        continue;
      }

      try {
        const result = await addScan(participant, currentCheckpoint);
        results.push({ 
          badge: badgeNum, 
          success: result.success, 
          message: result.message || (result.success ? "Recorded" : "Failed")
        });
      } catch {
        results.push({ badge: badgeNum, success: false, message: "Error" });
      }
    }

    setBulkScanResults(results);
    setIsProcessing(false);
    setBulkBadgeNumbers("");
    
    if (Platform.OS !== "web") {
      const successCount = results.filter(r => r.success).length;
      if (successCount === results.length) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    }
  }, [bulkBadgeNumbers, participants, currentCheckpoint, addScan]);

  const getCheckpointColor = (checkpointId: number) => {
    return getCheckpointColorById(checkpointId);
  };

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const currentCheckpointData = CHECKPOINTS.find(c => c.id === currentCheckpoint);

  return (
    <ScreenContainer>
      <SyncStatusBar syncStatus={syncStatus} />
      
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 }}>
        <Text style={{ fontSize: 28, fontWeight: "bold", color: colors.foreground }}>
          Scanner
        </Text>
        <Text style={{ fontSize: 15, color: colors.muted, marginTop: 4 }}>
          {participants.length} pilgrims • {recentScans.length} scans today
        </Text>
      </View>

      {/* At-Risk Alert */}
      {atRiskCount > 0 && (
        <TouchableOpacity 
          style={{
            marginHorizontal: 20,
            marginBottom: 12,
            backgroundColor: colors.error + "15",
            borderWidth: 1,
            borderColor: colors.error,
            borderRadius: 12,
            padding: 12,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
          }}
        >
          <View style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: colors.error,
            justifyContent: "center",
            alignItems: "center",
          }}>
            <IconSymbol name="exclamationmark.triangle.fill" size={18} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.error }}>
              {atRiskCount} Pilgrim{atRiskCount > 1 ? 's' : ''} At Risk
            </Text>
            <Text style={{ fontSize: 12, color: colors.error }}>
              Incomplete Jatra for 6+ hours
            </Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Current Checkpoint - Prominent Display */}
      <View style={{ 
        marginHorizontal: 20, 
        marginBottom: 16,
        backgroundColor: getCheckpointColor(currentCheckpoint) + "15",
        borderRadius: 16,
        padding: 16,
        borderWidth: 2,
        borderColor: getCheckpointColor(currentCheckpoint),
      }}>
        <Text style={{ fontSize: 12, fontWeight: "600", color: colors.muted, marginBottom: 8 }}>
          SCANNING AT CHECKPOINT
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: getCheckpointColor(currentCheckpoint),
            justifyContent: "center",
            alignItems: "center",
          }}>
            <IconSymbol name="location.fill" size={24} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 22, fontWeight: "bold", color: colors.foreground }}>
              {currentCheckpointData?.name || "Unknown"}
            </Text>
            <Text style={{ fontSize: 13, color: colors.muted }}>
              {currentCheckpointData?.description || ""}
            </Text>
          </View>
        </View>
        
        {/* Checkpoint Selector */}
        <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
          {CHECKPOINTS.map(checkpoint => (
            <TouchableOpacity
              key={checkpoint.id}
              onPress={() => handleCheckpointChange(checkpoint.id)}
              style={{
                flex: 1,
                paddingVertical: 10,
                paddingHorizontal: 8,
                borderRadius: 10,
                backgroundColor: currentCheckpoint === checkpoint.id ? checkpoint.color : colors.surface,
                borderWidth: 1,
                borderColor: currentCheckpoint === checkpoint.id ? checkpoint.color : colors.border,
                alignItems: "center",
              }}
            >
              <Text style={{
                fontSize: 12,
                fontWeight: "600",
                color: currentCheckpoint === checkpoint.id ? "#fff" : colors.foreground,
              }}>
                {checkpoint.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Action Buttons */}
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 12, paddingHorizontal: 20, marginBottom: 12 }}>
        <TouchableOpacity
          onPress={() => {
            setShowManualEntry(true);
            setContinuousScanCount(0);
            setTimeout(() => manualInputRef.current?.focus(), 100);
          }}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingVertical: 10,
            paddingHorizontal: 14,
            backgroundColor: colors.surface,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <IconSymbol name="keyboard" size={18} color={colors.foreground} />
          <Text style={{ color: colors.foreground, fontWeight: "500", fontSize: 14 }}>Manual</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            setShowQuickSearch(true);
            setTimeout(() => searchInputRef.current?.focus(), 100);
          }}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingVertical: 10,
            paddingHorizontal: 14,
            backgroundColor: colors.surface,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <IconSymbol name="magnifyingglass" size={18} color={colors.foreground} />
          <Text style={{ color: colors.foreground, fontWeight: "500", fontSize: 14 }}>Search</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setShowBulkScanModal(true)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingVertical: 10,
            paddingHorizontal: 14,
            backgroundColor: colors.surface,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <IconSymbol name="list.bullet" size={18} color={colors.foreground} />
          <Text style={{ color: colors.foreground, fontWeight: "500", fontSize: 14 }}>Bulk</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Scans */}
      <View style={{ flex: 1, paddingHorizontal: 20 }}>
        <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground, marginBottom: 10 }}>
          Recent Scans
        </Text>
        
        {isLoading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : recentScans.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: 24 }}>
            <IconSymbol name="clock.fill" size={40} color={colors.muted} />
            <Text style={{ color: colors.muted, marginTop: 10 }}>No scans yet</Text>
          </View>
        ) : (
          <FlatList
            data={recentScans.slice(0, RECENT_SCANS_LIMIT)}
            keyExtractor={(item) => item.uuid}
            renderItem={({ item }) => {
              const participant = participants.find(p => p.uuid === item.participantUuid);
              const scanTime = new Date(item.scannedAt);
              return (
                <View style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                }}>
                  <View style={{
                    width: 38,
                    height: 38,
                    borderRadius: 19,
                    backgroundColor: getCheckpointColor(item.checkpointId),
                    justifyContent: "center",
                    alignItems: "center",
                    marginRight: 10,
                  }}>
                    <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 13 }}>
                      #{participant?.badgeNumber || "?"}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: "500", color: colors.foreground }}>
                      {participant?.name || "Unknown"}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.muted }}>
                      {CHECKPOINTS.find(c => c.id === item.checkpointId)?.name} • {item.scannedAtIST || formatToIST(scanTime)}
                    </Text>
                  </View>
                  {!item.synced && (
                    <View style={{
                      paddingHorizontal: 6,
                      paddingVertical: 3,
                      backgroundColor: colors.warning,
                      borderRadius: 6,
                    }}>
                      <Text style={{ fontSize: 10, color: "#fff", fontWeight: "500" }}>Pending</Text>
                    </View>
                  )}
                </View>
              );
            }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Manual Entry Modal with Continuous Mode */}
      <Modal
        visible={showManualEntry}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setShowManualEntry(false);
          setManualBadgeNumber("");
          setManualEntryError("");
          setContinuousScanMode(false);
        }}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <TouchableOpacity 
            activeOpacity={1}
            onPress={() => {
              Keyboard.dismiss();
              setShowManualEntry(false);
              setManualBadgeNumber("");
              setManualEntryError("");
              setContinuousScanMode(false);
            }}
            style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" }}
          >
            <TouchableOpacity 
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
              style={{
                backgroundColor: colors.background,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                padding: 24,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.foreground }}>
                  Enter Badge Number
                </Text>
                <TouchableOpacity onPress={() => {
                  setShowManualEntry(false);
                  setManualBadgeNumber("");
                  setManualEntryError("");
                  setContinuousScanMode(false);
                }}>
                  <IconSymbol name="xmark" size={24} color={colors.muted} />
                </TouchableOpacity>
              </View>

              {/* Continuous Mode Toggle */}
              <TouchableOpacity
                onPress={() => setContinuousScanMode(!continuousScanMode)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  backgroundColor: continuousScanMode ? colors.success + "20" : colors.surface,
                  padding: 12,
                  borderRadius: 12,
                  marginBottom: 16,
                  borderWidth: 1,
                  borderColor: continuousScanMode ? colors.success : colors.border,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <IconSymbol name="arrow.clockwise" size={20} color={continuousScanMode ? colors.success : colors.muted} />
                  <View>
                    <Text style={{ fontWeight: "600", color: colors.foreground }}>Continuous Mode</Text>
                    <Text style={{ fontSize: 12, color: colors.muted }}>Keep scanning multiple pilgrims</Text>
                  </View>
                </View>
                <View style={{
                  width: 48,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: continuousScanMode ? colors.success : colors.muted,
                  justifyContent: "center",
                  alignItems: continuousScanMode ? "flex-end" : "flex-start",
                  paddingHorizontal: 2,
                }}>
                  <View style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: "#fff",
                  }} />
                </View>
              </TouchableOpacity>

              {continuousScanMode && continuousScanCount > 0 && (
                <View style={{
                  backgroundColor: colors.success + "20",
                  padding: 10,
                  borderRadius: 8,
                  marginBottom: 12,
                }}>
                  <Text style={{ color: colors.success, fontWeight: "600", textAlign: "center" }}>
                    {continuousScanCount} scan{continuousScanCount > 1 ? 's' : ''} recorded in this session
                  </Text>
                </View>
              )}

              <TextInput
                ref={manualInputRef}
                value={manualBadgeNumber}
                onChangeText={(text) => {
                  const numericText = text.replace(/[^0-9]/g, "");
                  setManualBadgeNumber(numericText);
                  setManualEntryError("");
                }}
                placeholder={`Badge number (${MIN_BADGE_NUMBER}-${MAX_BADGE_NUMBER})`}
                placeholderTextColor={colors.muted}
                keyboardType="number-pad"
                returnKeyType="done"
                onSubmitEditing={handleManualBadgeEntry}
                maxLength={3}
                style={{
                  fontSize: 32,
                  fontWeight: "bold",
                  textAlign: "center",
                  paddingVertical: 20,
                  paddingHorizontal: 20,
                  backgroundColor: colors.surface,
                  borderRadius: 16,
                  color: colors.foreground,
                  borderWidth: 2,
                  borderColor: manualEntryError ? colors.error : colors.border,
                }}
              />

              {manualEntryError ? (
                <Text style={{ color: colors.error, textAlign: "center", marginTop: 12, fontSize: 14 }}>
                  {manualEntryError}
                </Text>
              ) : null}

              <Text style={{ color: colors.muted, textAlign: "center", marginTop: 16, marginBottom: 20 }}>
                Recording at: <Text style={{ fontWeight: "600", color: getCheckpointColor(currentCheckpoint) }}>
                  {currentCheckpointData?.name}
                </Text>
              </Text>

              <TouchableOpacity
                onPress={handleManualBadgeEntry}
                disabled={isProcessing || !manualBadgeNumber.trim()}
                style={{
                  backgroundColor: manualBadgeNumber.trim() ? colors.primary : colors.muted,
                  paddingVertical: 18,
                  borderRadius: 14,
                  opacity: isProcessing ? 0.7 : 1,
                }}
              >
                {isProcessing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: "#fff", fontSize: 18, fontWeight: "600", textAlign: "center" }}>
                    {continuousScanMode ? "Record & Continue" : "Record Checkpoint"}
                  </Text>
                )}
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* Quick Search Modal */}
      <Modal
        visible={showQuickSearch}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setShowQuickSearch(false);
          setSearchQuery("");
        }}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <TouchableOpacity 
            activeOpacity={1}
            onPress={() => {
              Keyboard.dismiss();
              setShowQuickSearch(false);
              setSearchQuery("");
            }}
            style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" }}
          >
            <TouchableOpacity 
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
              style={{
                backgroundColor: colors.background,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                padding: 24,
                maxHeight: "70%",
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.foreground }}>
                  Search Pilgrim
                </Text>
                <TouchableOpacity onPress={() => {
                  setShowQuickSearch(false);
                  setSearchQuery("");
                }}>
                  <IconSymbol name="xmark" size={24} color={colors.muted} />
                </TouchableOpacity>
              </View>

              <View style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: colors.surface,
                borderRadius: 12,
                paddingHorizontal: 16,
                borderWidth: 1,
                borderColor: colors.border,
                marginBottom: 16,
              }}>
                <IconSymbol name="magnifyingglass" size={20} color={colors.muted} />
                <TextInput
                  ref={searchInputRef}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search by name or badge number"
                  placeholderTextColor={colors.muted}
                  returnKeyType="search"
                  style={{
                    flex: 1,
                    paddingVertical: 14,
                    paddingHorizontal: 12,
                    fontSize: 16,
                    color: colors.foreground,
                  }}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery("")}>
                    <IconSymbol name="xmark.circle.fill" size={20} color={colors.muted} />
                  </TouchableOpacity>
                )}
              </View>

              {filteredParticipants.length > 0 ? (
                <FlatList
                  data={filteredParticipants}
                  keyExtractor={(item) => item.uuid}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      onPress={() => handleQuickScan(item)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        paddingVertical: 14,
                        borderBottomWidth: 1,
                        borderBottomColor: colors.border,
                      }}
                    >
                      <View style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        backgroundColor: colors.primary,
                        justifyContent: "center",
                        alignItems: "center",
                        marginRight: 14,
                      }}>
                        <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 14 }}>
                          #{item.badgeNumber}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 16, fontWeight: "500", color: colors.foreground }}>
                          {item.name}
                        </Text>
                      </View>
                      <View style={{
                        backgroundColor: getCheckpointColor(currentCheckpoint),
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 8,
                      }}>
                        <Text style={{ color: "#fff", fontWeight: "600", fontSize: 12 }}>SCAN</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                />
              ) : searchQuery.length > 0 ? (
                <View style={{ alignItems: "center", paddingVertical: 32 }}>
                  <IconSymbol name="person.fill.questionmark" size={48} color={colors.muted} />
                  <Text style={{ color: colors.muted, marginTop: 12 }}>No pilgrims found</Text>
                </View>
              ) : (
                <View style={{ alignItems: "center", paddingVertical: 32 }}>
                  <IconSymbol name="magnifyingglass" size={48} color={colors.muted} />
                  <Text style={{ color: colors.muted, marginTop: 12 }}>Type to search pilgrims</Text>
                </View>
              )}
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* Bulk Scan Modal */}
      <Modal
        visible={showBulkScanModal}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setShowBulkScanModal(false);
          setBulkBadgeNumbers("");
          setBulkScanResults([]);
        }}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <TouchableOpacity 
            activeOpacity={1}
            onPress={() => {
              Keyboard.dismiss();
              setShowBulkScanModal(false);
              setBulkBadgeNumbers("");
              setBulkScanResults([]);
            }}
            style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" }}
          >
            <TouchableOpacity 
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
              style={{
                backgroundColor: colors.background,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                padding: 24,
                maxHeight: "80%",
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.foreground }}>
                  Bulk Scan
                </Text>
                <TouchableOpacity onPress={() => {
                  setShowBulkScanModal(false);
                  setBulkBadgeNumbers("");
                  setBulkScanResults([]);
                }}>
                  <IconSymbol name="xmark" size={24} color={colors.muted} />
                </TouchableOpacity>
              </View>

              <Text style={{ color: colors.muted, marginBottom: 12 }}>
                Enter badge numbers separated by commas, spaces, or new lines:
              </Text>

              <TextInput
                value={bulkBadgeNumbers}
                onChangeText={setBulkBadgeNumbers}
                placeholder="e.g., 1, 2, 3 or 1 2 3"
                placeholderTextColor={colors.muted}
                multiline
                numberOfLines={4}
                keyboardType="number-pad"
                style={{
                  fontSize: 16,
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  backgroundColor: colors.surface,
                  borderRadius: 12,
                  color: colors.foreground,
                  borderWidth: 1,
                  borderColor: colors.border,
                  minHeight: 100,
                  textAlignVertical: "top",
                }}
              />

              <Text style={{ color: colors.muted, textAlign: "center", marginTop: 12, marginBottom: 16 }}>
                Recording at: <Text style={{ fontWeight: "600", color: getCheckpointColor(currentCheckpoint) }}>
                  {currentCheckpointData?.name}
                </Text>
              </Text>

              <TouchableOpacity
                onPress={handleBulkScan}
                disabled={isProcessing || !bulkBadgeNumbers.trim()}
                style={{
                  backgroundColor: bulkBadgeNumbers.trim() ? colors.primary : colors.muted,
                  paddingVertical: 16,
                  borderRadius: 12,
                  opacity: isProcessing ? 0.7 : 1,
                }}
              >
                {isProcessing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: "#fff", fontSize: 18, fontWeight: "600", textAlign: "center" }}>
                    Record All
                  </Text>
                )}
              </TouchableOpacity>

              {bulkScanResults.length > 0 && (
                <View style={{ marginTop: 20 }}>
                  <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground, marginBottom: 12 }}>
                    Results: {bulkScanResults.filter(r => r.success).length}/{bulkScanResults.length} successful
                  </Text>
                  <FlatList
                    data={bulkScanResults}
                    keyExtractor={(item, index) => `${item.badge}-${index}`}
                    renderItem={({ item }) => (
                      <View style={{
                        flexDirection: "row",
                        alignItems: "center",
                        paddingVertical: 8,
                        borderBottomWidth: 1,
                        borderBottomColor: colors.border,
                      }}>
                        <View style={{
                          width: 28,
                          height: 28,
                          borderRadius: 14,
                          backgroundColor: item.success ? colors.success : colors.error,
                          justifyContent: "center",
                          alignItems: "center",
                          marginRight: 10,
                        }}>
                          <IconSymbol 
                            name={item.success ? "checkmark" : "xmark"} 
                            size={14} 
                            color="#fff" 
                          />
                        </View>
                        <Text style={{ flex: 1, color: colors.foreground }}>
                          Badge #{item.badge}
                        </Text>
                        <Text style={{ color: item.success ? colors.success : colors.error, fontSize: 12 }}>
                          {item.message}
                        </Text>
                      </View>
                    )}
                    style={{ maxHeight: 180 }}
                    showsVerticalScrollIndicator={false}
                  />
                </View>
              )}
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* Scan Result Modal */}
      <ScanResultModal
        visible={scanResult !== null}
        result={scanResult}
        onClose={() => setScanResult(null)}
        checkpointName={currentCheckpointData?.name || "Unknown"}
      />
    </ScreenContainer>
  );
}
