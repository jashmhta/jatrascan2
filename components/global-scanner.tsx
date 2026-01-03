import { useState, useCallback, useEffect, useRef } from "react";
import { Platform, Alert, View, Text, TouchableOpacity, Modal } from "react-native";
import * as Haptics from "expo-haptics";

import { QRScanner } from "@/components/qr-scanner";
import { ScanResultModal } from "@/components/scan-result-modal";
import { useScanner } from "@/lib/scanner-context";
import { useOfflineSync } from "@/hooks/use-offline-sync";
import { CHECKPOINTS } from "@/constants/checkpoints";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import type { ScanResult } from "@/types";

export function GlobalScanner() {
  const colors = useColors();
  const { showScanner, closeScanner } = useScanner();
  const { participants, addScan, currentCheckpoint, setCurrentCheckpoint } = useOfflineSync();
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [continuousMode, setContinuousMode] = useState(true); // Default to continuous for efficiency
  const [scanCount, setScanCount] = useState(0);
  const [showCheckpointSelector, setShowCheckpointSelector] = useState(false);
  const [lastScannedInfo, setLastScannedInfo] = useState<{ badgeNumber: number; name: string } | null>(null);
  const lastScanTimeRef = useRef<number>(0);
  const lastScannedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const MIN_SCAN_INTERVAL = 500; // Minimum 500ms between scans to prevent duplicates

  // Reset scan count and last scanned info when scanner opens
  useEffect(() => {
    if (showScanner) {
      setScanCount(0);
      setLastScannedInfo(null);
      if (lastScannedTimeoutRef.current) {
        clearTimeout(lastScannedTimeoutRef.current);
      }
    }
  }, [showScanner]);

  const handleQRScan = useCallback(async (qrToken: string) => {
    // Prevent rapid duplicate scans
    const now = Date.now();
    if (now - lastScanTimeRef.current < MIN_SCAN_INTERVAL) {
      return;
    }
    lastScanTimeRef.current = now;

    try {
      const participant = participants.find(p => p.qrToken === qrToken);

      if (!participant) {
        setScanResult({
          success: false,
          message: "Invalid QR code or pilgrim not found",
        });
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
        return;
      }

      const result = await addScan(participant, currentCheckpoint);
      setScanResult(result);
      
      if (result.success) {
        setScanCount(prev => prev + 1);
        
        // Update last scanned info for continuous mode feedback
        setLastScannedInfo({
          badgeNumber: participant.id,
          name: participant.name,
        });
        
        // Clear last scanned info after 3 seconds
        if (lastScannedTimeoutRef.current) {
          clearTimeout(lastScannedTimeoutRef.current);
        }
        lastScannedTimeoutRef.current = setTimeout(() => {
          setLastScannedInfo(null);
        }, 3000);
      }

      // In continuous mode, auto-dismiss success after 1.5 seconds
      if (continuousMode && result.success) {
        setTimeout(() => {
          setScanResult(null);
        }, 1500);
      }
    } catch (error) {
      console.error("QR scan error:", error);
      setScanResult({
        success: false,
        message: "Failed to record scan",
      });
    }
  }, [participants, currentCheckpoint, addScan, continuousMode]);

  const handleClose = useCallback(() => {
    closeScanner();
    setScanCount(0);
  }, [closeScanner]);

  const handleResultClose = useCallback(() => {
    setScanResult(null);
  }, []);

  const handleCheckpointChange = useCallback(async (checkpointId: number) => {
    await setCurrentCheckpoint(checkpointId);
    setShowCheckpointSelector(false);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [setCurrentCheckpoint]);

  const currentCheckpointData = CHECKPOINTS.find(cp => cp.id === currentCheckpoint);
  const checkpointName = currentCheckpointData?.name || "Unknown";
  const checkpointColor = currentCheckpointData?.color || colors.primary;

  return (
    <>
      <QRScanner
        visible={showScanner}
        onClose={handleClose}
        onScan={handleQRScan}
        continuousMode={continuousMode}
        scanCount={scanCount}
        checkpointName={checkpointName}
        checkpointColor={checkpointColor}
        onToggleContinuous={() => setContinuousMode(!continuousMode)}
        onChangeCheckpoint={() => setShowCheckpointSelector(true)}
        lastScannedInfo={lastScannedInfo}
      />
      
      {/* Checkpoint Selector Modal */}
      <Modal
        visible={showCheckpointSelector}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCheckpointSelector(false)}
      >
        <TouchableOpacity 
          activeOpacity={1}
          onPress={() => setShowCheckpointSelector(false)}
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.7)",
            justifyContent: "center",
            alignItems: "center",
            padding: 24,
          }}
        >
          <TouchableOpacity 
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: colors.background,
              borderRadius: 20,
              padding: 24,
              width: "100%",
              maxWidth: 340,
            }}
          >
            <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.foreground, marginBottom: 20, textAlign: "center" }}>
              Select Checkpoint
            </Text>
            
            <View style={{ gap: 12 }}>
              {CHECKPOINTS.map(checkpoint => (
                <TouchableOpacity
                  key={checkpoint.id}
                  onPress={() => handleCheckpointChange(checkpoint.id)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 16,
                    backgroundColor: currentCheckpoint === checkpoint.id ? checkpoint.color + "20" : colors.surface,
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor: currentCheckpoint === checkpoint.id ? checkpoint.color : colors.border,
                  }}
                >
                  <View style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: checkpoint.color,
                    justifyContent: "center",
                    alignItems: "center",
                    marginRight: 14,
                  }}>
                    <IconSymbol name="location.fill" size={22} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 17, fontWeight: "600", color: colors.foreground }}>
                      {checkpoint.name}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.muted }}>
                      {checkpoint.description}
                    </Text>
                  </View>
                  {currentCheckpoint === checkpoint.id && (
                    <IconSymbol name="checkmark.circle.fill" size={24} color={checkpoint.color} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
            
            <TouchableOpacity
              onPress={() => setShowCheckpointSelector(false)}
              style={{
                marginTop: 20,
                paddingVertical: 14,
                backgroundColor: colors.surface,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text style={{ color: colors.foreground, fontWeight: "600", textAlign: "center" }}>
                Cancel
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <ScanResultModal
        visible={scanResult !== null && !continuousMode}
        result={scanResult}
        onClose={handleResultClose}
        checkpointName={checkpointName}
      />
      
      {/* Quick toast for continuous mode */}
      {continuousMode && scanResult && (
        <View style={{
          position: "absolute",
          bottom: 120,
          left: 20,
          right: 20,
          backgroundColor: scanResult.success ? colors.success : colors.error,
          padding: 16,
          borderRadius: 12,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }}>
          <IconSymbol 
            name={scanResult.success ? "checkmark.circle.fill" : "xmark.circle.fill"} 
            size={24} 
            color="#fff" 
          />
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 15 }}>
              {scanResult.participant?.name || "Unknown"}
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: 13 }}>
              {scanResult.message}
            </Text>
          </View>
          {scanResult.jatraCount !== undefined && (
            <View style={{
              backgroundColor: "rgba(255,255,255,0.2)",
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 8,
            }}>
              <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 14 }}>
                #{scanResult.jatraCount}
              </Text>
            </View>
          )}
        </View>
      )}
    </>
  );
}
