import { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform, Modal, ActivityIndicator, Alert } from "react-native";
import { CameraView, useCameraPermissions, BarcodeScanningResult } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import jsQR from "jsqr";
import { IconSymbol } from "./ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { QR_TOKEN_PREFIX } from "@/constants/checkpoints";

export interface QRScannerProps {
  visible: boolean;
  onClose: () => void;
  onScan: (qrToken: string) => void;
  continuousMode?: boolean;
  scanCount?: number;
  checkpointName?: string;
  checkpointColor?: string;
  onToggleContinuous?: () => void;
  onChangeCheckpoint?: () => void;
  lastScannedInfo?: { badgeNumber: number; name: string } | null;
}

export function QRScanner({ 
  visible, 
  onClose, 
  onScan,
  continuousMode = true,
  scanCount = 0,
  checkpointName = "Unknown",
  checkpointColor = "#FF6B00",
  onToggleContinuous,
  onChangeCheckpoint,
  lastScannedInfo,
}: QRScannerProps) {
  const colors = useColors();
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(true);
  const [flashOn, setFlashOn] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const lastScannedRef = useRef<string | null>(null);
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scanCooldownRef = useRef<boolean>(false);

  useEffect(() => {
    if (visible) {
      setIsScanning(true);
      lastScannedRef.current = null;
      scanCooldownRef.current = false;
    }
    return () => {
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
    };
  }, [visible]);

  const handleBarCodeScanned = (result: BarcodeScanningResult) => {
    if (!isScanning || scanCooldownRef.current) return;
    
    const { data } = result;
    
    // Validate QR token format
    if (!data.startsWith(QR_TOKEN_PREFIX)) {
      return;
    }

    // Prevent duplicate scans of the same code within cooldown period
    if (data === lastScannedRef.current) return;
    
    // Set cooldown to prevent rapid-fire scans
    scanCooldownRef.current = true;
    lastScannedRef.current = data;
    
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    onScan(data);

    // In continuous mode, reset after a short delay to allow next scan
    if (continuousMode) {
      if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = setTimeout(() => {
        scanCooldownRef.current = false;
        // Allow same badge to be scanned again after longer delay
        setTimeout(() => {
          lastScannedRef.current = null;
        }, 3000);
      }, 1000);
    } else {
      setIsScanning(false);
      onClose();
    }
  };

  const decodeQRFromImage = async (imageUri: string): Promise<string | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        
        if (!ctx) {
          resolve(null);
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        
        if (code && code.data) {
          resolve(code.data);
        } else {
          resolve(null);
        }
      };

      img.onerror = () => {
        resolve(null);
      };

      img.src = imageUri;
    });
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        setIsProcessingImage(true);
        const imageUri = result.assets[0].uri;
        
        if (Platform.OS === "web") {
          const qrData = await decodeQRFromImage(imageUri);
          
          if (qrData) {
            if (qrData.startsWith(QR_TOKEN_PREFIX)) {
              if (Platform.OS !== "web") {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }
              onScan(qrData);
              if (!continuousMode) {
                onClose();
              }
            } else {
              Alert.alert("Invalid QR Code", "This QR code is not a valid Palitana Yatra ID card.");
            }
          } else {
            Alert.alert("No QR Code Found", "Could not detect a QR code in the selected image. Please try another image.");
          }
        } else {
          Alert.alert(
            "Gallery Scan",
            "For best results on mobile, please use the camera to scan QR codes directly.",
            [{ text: "OK" }]
          );
        }
        
        setIsProcessingImage(false);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      setIsProcessingImage(false);
      Alert.alert("Error", "Failed to process the image. Please try again.");
    }
  };

  if (!visible) return null;

  if (!permission) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </Modal>
    );
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={styles.permissionContainer}>
            <IconSymbol name="camera.fill" size={64} color={colors.muted} />
            <Text style={[styles.permissionTitle, { color: colors.foreground }]}>
              Camera Permission Required
            </Text>
            <Text style={[styles.permissionText, { color: colors.muted }]}>
              We need camera access to scan QR codes on pilgrim ID cards.
            </Text>
            <TouchableOpacity
              onPress={requestPermission}
              style={[styles.permissionButton, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.permissionButtonText}>Grant Permission</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
              <Text style={[styles.cancelButtonText, { color: colors.muted }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          enableTorch={flashOn}
          barcodeScannerSettings={{
            barcodeTypes: ["qr"],
          }}
          onBarcodeScanned={isScanning ? handleBarCodeScanned : undefined}
        />
        
        {/* Processing Overlay */}
        {isProcessingImage && (
          <View style={styles.processingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.processingText}>Scanning image...</Text>
          </View>
        )}
        
        {/* Overlay */}
        <View style={styles.overlay}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.headerButton}>
              <IconSymbol name="xmark" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Scan QR Code</Text>
            <TouchableOpacity 
              onPress={() => setFlashOn(!flashOn)} 
              style={[styles.headerButton, flashOn && { backgroundColor: "#FFD700" }]}
            >
              <IconSymbol 
                name="star.fill" 
                size={24} 
                color={flashOn ? "#000" : "#fff"} 
              />
            </TouchableOpacity>
          </View>

          {/* Current Checkpoint Banner */}
          <TouchableOpacity 
            onPress={onChangeCheckpoint}
            style={[styles.checkpointBanner, { backgroundColor: checkpointColor }]}
          >
            <IconSymbol name="location.fill" size={20} color="#fff" />
            <Text style={styles.checkpointText}>Scanning at: {checkpointName}</Text>
            <IconSymbol name="chevron.right" size={16} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>

          {/* Scan Frame */}
          <View style={styles.scanArea}>
            <View style={[styles.scanFrame, { borderColor: checkpointColor }]}>
              <View style={[styles.corner, styles.cornerTL, { borderColor: checkpointColor }]} />
              <View style={[styles.corner, styles.cornerTR, { borderColor: checkpointColor }]} />
              <View style={[styles.corner, styles.cornerBL, { borderColor: checkpointColor }]} />
              <View style={[styles.corner, styles.cornerBR, { borderColor: checkpointColor }]} />
            </View>
            <Text style={styles.scanText}>
              Position the QR code within the frame
            </Text>
          </View>

          {/* Last Scanned Info (Continuous Mode) */}
          {continuousMode && lastScannedInfo && (
            <View style={[styles.lastScannedBanner, { backgroundColor: checkpointColor }]}>
              <View style={styles.lastScannedContent}>
                <Text style={styles.lastScannedBadge}>#{lastScannedInfo.badgeNumber}</Text>
                <Text style={styles.lastScannedName}>{lastScannedInfo.name}</Text>
              </View>
              <Text style={styles.lastScannedCount}>{scanCount} scanned</Text>
            </View>
          )}

          {/* Scan Counter (Continuous Mode, no recent scan) */}
          {continuousMode && scanCount > 0 && !lastScannedInfo && (
            <View style={[styles.scanCounter, { backgroundColor: checkpointColor }]}>
              <Text style={styles.scanCounterText}>{scanCount} scanned</Text>
            </View>
          )}

          {/* Bottom Actions */}
          <View style={styles.bottomActions}>
            {/* Continuous Mode Toggle */}
            <TouchableOpacity 
              onPress={onToggleContinuous}
              style={[
                styles.actionButton,
                continuousMode && styles.actionButtonActive,
              ]}
            >
              <IconSymbol 
                name="arrow.clockwise" 
                size={24} 
                color={continuousMode ? "#4ADE80" : "#fff"} 
              />
              <Text style={[
                styles.actionText,
                continuousMode && { color: "#4ADE80" }
              ]}>
                {continuousMode ? "Continuous ON" : "Continuous OFF"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={handlePickImage}
              style={styles.actionButton}
              disabled={isProcessingImage}
            >
              <IconSymbol name="photo.fill" size={24} color="#fff" />
              <Text style={styles.actionText}>Gallery</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  processingText: {
    color: "#fff",
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
  checkpointBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  checkpointText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
  },
  scanArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scanFrame: {
    width: 260,
    height: 260,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 40,
    height: 40,
    borderWidth: 4,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 12,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 12,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 12,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 12,
  },
  scanText: {
    marginTop: 24,
    fontSize: 14,
    color: "#fff",
    textAlign: "center",
  },
  scanCounter: {
    position: "absolute",
    top: 180,
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  scanCounterText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  lastScannedBanner: {
    position: "absolute",
    top: 160,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    minWidth: 280,
    maxWidth: 340,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  lastScannedContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 4,
  },
  lastScannedBadge: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    backgroundColor: "rgba(0,0,0,0.3)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  lastScannedName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  lastScannedCount: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 13,
    fontWeight: "500",
    textAlign: "right",
  },
  bottomActions: {
    flexDirection: "row",
    justifyContent: "center",
    paddingBottom: 60,
    gap: 48,
  },
  actionButton: {
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  actionButtonActive: {
    backgroundColor: "rgba(74, 222, 128, 0.2)",
  },
  actionText: {
    fontSize: 11,
    color: "#fff",
    fontWeight: "500",
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginTop: 24,
    marginBottom: 12,
    textAlign: "center",
  },
  permissionText: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 22,
  },
  permissionButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  cancelButton: {
    paddingVertical: 12,
  },
  cancelButtonText: {
    fontSize: 15,
  },
});
