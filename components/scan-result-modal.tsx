import { useEffect } from "react";
import { View, Text, Modal, TouchableOpacity } from "react-native";

import { IconSymbol } from "./ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import type { ScanResult } from "@/types";

interface ScanResultModalProps {
  visible: boolean;
  result: ScanResult | null;
  onClose: () => void;
  checkpointName: string;
}

export function ScanResultModal({ visible, result, onClose, checkpointName }: ScanResultModalProps) {
  const colors = useColors();

  useEffect(() => {
    if (visible && result) {
      // Auto-dismiss after 2 seconds for success, 3 seconds for errors
      const timeout = setTimeout(() => {
        onClose();
      }, result.success ? 2000 : 3000);

      return () => clearTimeout(timeout);
    }
  }, [visible, result, onClose]);

  if (!result) return null;

  const isSuccess = result.success && !result.duplicate;
  const isDuplicate = result.duplicate;
  const isJatraComplete = result.success && result.jatraCount && result.jatraCount > 0 && checkpointName === "Gheti";

  const getBackgroundColor = () => {
    if (isJatraComplete) return colors.success;
    if (isSuccess) return colors.primary;
    if (isDuplicate) return colors.warning;
    return colors.error;
  };

  const getIcon = () => {
    if (isJatraComplete) return "star.fill";
    if (isSuccess) return "checkmark.circle.fill";
    if (isDuplicate) return "exclamationmark.triangle.fill";
    return "xmark.circle.fill";
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        activeOpacity={1}
        onPress={onClose}
        style={{ 
          flex: 1, 
          justifyContent: "center", 
          alignItems: "center",
          backgroundColor: "rgba(0,0,0,0.6)",
          padding: 32,
        }}
      >
        <View style={{
          backgroundColor: getBackgroundColor(),
          borderRadius: 24,
          padding: 32,
          alignItems: "center",
          width: "100%",
          maxWidth: 320,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.3,
          shadowRadius: 16,
          elevation: 10,
        }}>
          <View style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: "rgba(255,255,255,0.2)",
            justifyContent: "center",
            alignItems: "center",
            marginBottom: 20,
          }}>
            <IconSymbol name={getIcon()} size={48} color="#fff" />
          </View>

          {result.participant && (
            <>
              <Text style={{ 
                fontSize: 14, 
                color: "rgba(255,255,255,0.8)", 
                marginBottom: 4,
                fontWeight: "500",
              }}>
                Badge #{result.participant.badgeNumber}
              </Text>
              <Text style={{ 
                fontSize: 22, 
                fontWeight: "bold", 
                color: "#fff",
                textAlign: "center",
                marginBottom: 12,
              }}>
                {result.participant.name}
              </Text>
            </>
          )}

          <Text style={{ 
            fontSize: 16, 
            color: "#fff",
            textAlign: "center",
            opacity: 0.9,
          }}>
            {result.message}
          </Text>

          {isJatraComplete && result.jatraCount && (
            <View style={{
              marginTop: 16,
              paddingHorizontal: 20,
              paddingVertical: 8,
              backgroundColor: "rgba(255,255,255,0.2)",
              borderRadius: 16,
            }}>
              <Text style={{ fontSize: 18, fontWeight: "bold", color: "#fff" }}>
                🎉 Jatra #{result.jatraCount}
              </Text>
            </View>
          )}

          <Text style={{ 
            fontSize: 13, 
            color: "rgba(255,255,255,0.7)",
            marginTop: 16,
          }}>
            Tap anywhere to dismiss
          </Text>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}
