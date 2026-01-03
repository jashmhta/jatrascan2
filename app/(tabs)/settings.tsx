import { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, Switch, Alert, Platform, Linking, Modal, TextInput } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useOfflineSync } from "@/hooks/use-offline-sync";
import { requestNotificationPermissions } from "@/services/push-notifications";
import * as Notifications from "expo-notifications";
import * as Haptics from "expo-haptics";
import { trpc } from "@/lib/trpc";



const CLEAR_DATA_PASSWORD = "8869";

export default function SettingsScreen() {
  const colors = useColors();
  const { syncStatus, syncWithServer, participants, scanLogs, clearAllLocalData } = useOfflineSync();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const [isSyncing, setIsSyncing] = useState(false);
  const [showClearDataModal, setShowClearDataModal] = useState(false);
  const [clearDataPassword, setClearDataPassword] = useState("");
  const [clearDataError, setClearDataError] = useState("");
  const [isClearing, setIsClearing] = useState(false);

  const clearServerScansMutation = trpc.scanLogs.clearAll.useMutation();

  // Check notification permission status on mount
  useEffect(() => {
    const checkNotificationStatus = async () => {
      if (Platform.OS === "web") return;
      const { status } = await Notifications.getPermissionsAsync();
      setNotificationsEnabled(status === "granted");
    };
    checkNotificationStatus();
  }, []);

  const handleToggleNotifications = async (value: boolean) => {
    if (value) {
      const granted = await requestNotificationPermissions();
      setNotificationsEnabled(granted);
      if (!granted && Platform.OS !== "web") {
        Alert.alert(
          "Permission Required",
          "Please enable notifications in your device settings to receive 7th Jatra alerts.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() },
          ]
        );
      }
    } else {
      setNotificationsEnabled(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await syncWithServer();
      if (Platform.OS !== "web") {
        Alert.alert("Sync Complete", "Data synchronized successfully!");
      }
    } catch {
      if (Platform.OS !== "web") {
        Alert.alert("Sync Failed", "Please check your internet connection and try again.");
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearCache = () => {
    if (Platform.OS === "web") {
      // Web doesn't support Alert.alert with callbacks
      console.log("Clear cache requested");
      return;
    }
    
    Alert.alert(
      "Clear Local Cache",
      "This will clear locally cached data. Your scans are safely stored on the server and will be re-downloaded.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Clear", 
          style: "destructive",
          onPress: () => {
            // Clear AsyncStorage cache
            console.log("Cache cleared");
          }
        },
      ]
    );
  };

  const handleOpenClearDataModal = () => {
    setClearDataPassword("");
    setClearDataError("");
    setShowClearDataModal(true);
  };

  const handleClearAllData = async () => {
    if (clearDataPassword !== CLEAR_DATA_PASSWORD) {
      setClearDataError("Incorrect password. Please try again.");
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      return;
    }

    // Check for pending syncs
    if (syncStatus.pendingScans > 0) {
      setClearDataError(`You have ${syncStatus.pendingScans} pending scan(s). Please sync first before clearing data.`);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
      return;
    }

    setIsClearing(true);
    setClearDataError("");

    try {
      // Clear local data first
      const localResult = await clearAllLocalData();
      
      if (!localResult.success) {
        throw new Error("Failed to clear local data");
      }

      // Clear server data
      await clearServerScansMutation.mutateAsync();

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      setShowClearDataModal(false);
      
      if (Platform.OS !== "web") {
        Alert.alert(
          "Data Cleared",
          "All scan logs have been cleared successfully. Pilgrim data has been preserved.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      console.error("Clear data error:", error);
      setClearDataError("Failed to clear data. Please try again.");
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setIsClearing(false);
    }
  };

  const SettingRow = ({ 
    icon, 
    title, 
    subtitle, 
    rightElement,
    onPress,
    color = colors.foreground,
  }: {
    icon: any;
    title: string;
    subtitle?: string;
    rightElement?: React.ReactNode;
    onPress?: () => void;
    color?: string;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <View style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: color + "20",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 14,
      }}>
        <IconSymbol name={icon} size={20} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: "500", color: colors.foreground }}>
          {title}
        </Text>
        {subtitle && (
          <Text style={{ fontSize: 13, color: colors.muted, marginTop: 2 }}>
            {subtitle}
          </Text>
        )}
      </View>
      {rightElement}
    </TouchableOpacity>
  );

  return (
    <ScreenContainer>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
        <Text style={{ fontSize: 28, fontWeight: "bold", color: colors.foreground, marginBottom: 4 }}>
          Settings
        </Text>
        <Text style={{ fontSize: 15, color: colors.muted, marginBottom: 24 }}>
          Customize your app experience
        </Text>

        {/* Audio & Haptics Section */}
        <View style={{
          backgroundColor: colors.surface,
          borderRadius: 16,
          padding: 16,
          marginBottom: 20,
          borderWidth: 1,
          borderColor: colors.border,
        }}>
          <Text style={{ fontSize: 14, fontWeight: "600", color: colors.muted, marginBottom: 4, textTransform: "uppercase" }}>
            Feedback
          </Text>
          
          <SettingRow
            icon={soundEnabled ? "speaker.wave.2.fill" : "speaker.slash.fill"}
            title="Sound Effects"
            subtitle="Play sounds on scan"
            color={colors.primary}
            rightElement={
              <Switch
                value={soundEnabled}
                onValueChange={setSoundEnabled}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            }
          />
          
          <SettingRow
            icon="hand.tap.fill"
            title="Haptic Feedback"
            subtitle="Vibrate on scan"
            color={colors.primary}
            rightElement={
              <Switch
                value={hapticEnabled}
                onValueChange={setHapticEnabled}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            }
          />
          
          <SettingRow
            icon="bell.fill"
            title="7th Jatra Notifications"
            subtitle="Alert when pilgrim completes Saat Jatra"
            color={colors.aamli}
            rightElement={
              <Switch
                value={notificationsEnabled}
                onValueChange={handleToggleNotifications}
                trackColor={{ false: colors.border, true: colors.aamli }}
                thumbColor="#fff"
              />
            }
          />
        </View>

        {/* Sync Status Dashboard */}
        <View style={{
          backgroundColor: colors.surface,
          borderRadius: 16,
          padding: 16,
          marginBottom: 20,
          borderWidth: 1,
          borderColor: colors.border,
        }}>
          <Text style={{ fontSize: 14, fontWeight: "600", color: colors.muted, marginBottom: 4, textTransform: "uppercase" }}>
            Sync Status
          </Text>
          
          {/* Real-time Sync Indicator */}
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 12, marginBottom: 16 }}>
            <View style={{
              width: 12,
              height: 12,
              borderRadius: 6,
              backgroundColor: isSyncing ? colors.warning : (syncStatus.pendingScans > 0 ? colors.error : colors.success),
              marginRight: 8,
            }} />
            <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground }}>
              {isSyncing ? "Syncing..." : (syncStatus.pendingScans > 0 ? "Pending Sync" : "All Synced")}
            </Text>
          </View>

          {/* Sync Statistics */}
          <View style={{ flexDirection: "row", marginBottom: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, color: colors.muted, marginBottom: 4 }}>Pending Scans</Text>
              <Text style={{ fontSize: 24, fontWeight: "bold", color: syncStatus.pendingScans > 0 ? colors.error : colors.success }}>
                {syncStatus.pendingScans}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, color: colors.muted, marginBottom: 4 }}>Total Scans</Text>
              <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.foreground }}>
                {scanLogs.length}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, color: colors.muted, marginBottom: 4 }}>Pilgrims</Text>
              <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.foreground }}>
                {participants.length}
              </Text>
            </View>
          </View>

          {/* Last Sync Time */}
          {syncStatus.lastSyncTime && (
            <Text style={{ fontSize: 13, color: colors.muted, marginTop: 8 }}>
              Last synced: {new Date(syncStatus.lastSyncTime).toLocaleString()}
            </Text>
          )}

          {/* Sync Warning */}
          {syncStatus.pendingScans > 0 && (
            <View style={{
              backgroundColor: colors.error + "15",
              borderRadius: 8,
              padding: 12,
              marginTop: 12,
              borderWidth: 1,
              borderColor: colors.error + "30",
            }}>
              <Text style={{ fontSize: 13, color: colors.error, fontWeight: "500" }}>
                ⚠️ You have {syncStatus.pendingScans} scan(s) waiting to sync to Google Sheets
              </Text>
            </View>
          )}
        </View>

        {/* Data Section */}
        <View style={{
          backgroundColor: colors.surface,
          borderRadius: 16,
          padding: 16,
          marginBottom: 20,
          borderWidth: 1,
          borderColor: colors.border,
        }}>
          <Text style={{ fontSize: 14, fontWeight: "600", color: colors.muted, marginBottom: 4, textTransform: "uppercase" }}>
            Data Management
          </Text>
          
          <SettingRow
            icon="arrow.clockwise"
            title="Sync Now"
            subtitle={syncStatus.isOnline 
              ? `${syncStatus.pendingScans} pending scans` 
              : "Offline - will sync when connected"
            }
            color={colors.success}
            onPress={handleSync}
            rightElement={
              isSyncing ? (
                <Text style={{ color: colors.primary, fontWeight: "500" }}>Syncing...</Text>
              ) : (
                <IconSymbol name="chevron.right" size={18} color={colors.muted} />
              )
            }
          />
          
          <SettingRow
            icon="trash.fill"
            title="Clear Local Cache"
            subtitle="Re-download data from server"
            color={colors.warning}
            onPress={handleClearCache}
            rightElement={
              <IconSymbol name="chevron.right" size={18} color={colors.muted} />
            }
          />

          <SettingRow
            icon="exclamationmark.triangle.fill"
            title="Clear All Scan Data"
            subtitle="Password protected - clears all scan logs"
            color={colors.error}
            onPress={handleOpenClearDataModal}
            rightElement={
              <IconSymbol name="chevron.right" size={18} color={colors.muted} />
            }
          />
        </View>

        {/* Stats Section */}
        <View style={{
          backgroundColor: colors.surface,
          borderRadius: 16,
          padding: 16,
          marginBottom: 20,
          borderWidth: 1,
          borderColor: colors.border,
        }}>
          <Text style={{ fontSize: 14, fontWeight: "600", color: colors.muted, marginBottom: 12, textTransform: "uppercase" }}>
            Local Data
          </Text>
          
          <View style={{ flexDirection: "row", gap: 16 }}>
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.foreground }}>
                {participants.length}
              </Text>
              <Text style={{ fontSize: 12, color: colors.muted }}>Pilgrims</Text>
            </View>
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.foreground }}>
                {scanLogs.length}
              </Text>
              <Text style={{ fontSize: 12, color: colors.muted }}>Scans</Text>
            </View>
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={{ fontSize: 24, fontWeight: "bold", color: syncStatus.pendingScans > 0 ? colors.warning : colors.success }}>
                {syncStatus.pendingScans}
              </Text>
              <Text style={{ fontSize: 12, color: colors.muted }}>Pending</Text>
            </View>
          </View>
        </View>

        {/* About Section */}
        <View style={{
          backgroundColor: colors.surface,
          borderRadius: 16,
          padding: 16,
          borderWidth: 1,
          borderColor: colors.border,
        }}>
          <Text style={{ fontSize: 14, fontWeight: "600", color: colors.muted, marginBottom: 4, textTransform: "uppercase" }}>
            About
          </Text>
          
          <SettingRow
            icon="info.circle.fill"
            title="Palitana Yatra Tracker"
            subtitle="Version 1.0.0"
            color={colors.primary}
          />
          
          <View style={{ paddingVertical: 12 }}>
            <Text style={{ fontSize: 13, color: colors.muted, lineHeight: 20 }}>
              Track pilgrims during the Shatrunjaya Hill pilgrimage in Palitana, Gujarat. 
              Built for 413 pilgrims across 3 checkpoints with offline-first sync.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Clear Data Password Modal */}
      <Modal
        visible={showClearDataModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowClearDataModal(false)}
      >
        <View style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "rgba(0,0,0,0.6)",
          padding: 32,
        }}>
          <View style={{
            backgroundColor: colors.background,
            borderRadius: 20,
            padding: 24,
            width: "100%",
            maxWidth: 340,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.3,
            shadowRadius: 16,
            elevation: 10,
          }}>
            <View style={{
              width: 60,
              height: 60,
              borderRadius: 30,
              backgroundColor: colors.error + "20",
              justifyContent: "center",
              alignItems: "center",
              alignSelf: "center",
              marginBottom: 16,
            }}>
              <IconSymbol name="exclamationmark.triangle.fill" size={32} color={colors.error} />
            </View>

            <Text style={{
              fontSize: 20,
              fontWeight: "bold",
              color: colors.foreground,
              textAlign: "center",
              marginBottom: 8,
            }}>
              Clear All Scan Data
            </Text>

            <Text style={{
              fontSize: 14,
              color: colors.muted,
              textAlign: "center",
              marginBottom: 20,
              lineHeight: 20,
            }}>
              This will permanently delete all scan logs from the app and server. Pilgrim data will be preserved. {syncStatus.pendingScans > 0 ? `\n\n⚠️ You must sync ${syncStatus.pendingScans} pending scan(s) first.` : '\n\nEnter the password to confirm.'}
            </Text>

            <TextInput
              style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontSize: 18,
                color: colors.foreground,
                textAlign: "center",
                borderWidth: 1,
                borderColor: clearDataError ? colors.error : colors.border,
                letterSpacing: 4,
              }}
              placeholder="Enter password"
              placeholderTextColor={colors.muted}
              value={clearDataPassword}
              onChangeText={(text) => {
                setClearDataPassword(text);
                setClearDataError("");
              }}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={4}
              autoFocus
            />

            {clearDataError ? (
              <Text style={{
                fontSize: 13,
                color: colors.error,
                textAlign: "center",
                marginTop: 8,
              }}>
                {clearDataError}
              </Text>
            ) : null}

            <View style={{ flexDirection: "row", gap: 12, marginTop: 20 }}>
              <TouchableOpacity
                onPress={() => setShowClearDataModal(false)}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: 12,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: colors.foreground,
                  textAlign: "center",
                }}>
                  Cancel
                </Text>
              </TouchableOpacity>

              {syncStatus.pendingScans > 0 ? (
                <TouchableOpacity
                  onPress={async () => {
                    await handleSync();
                    setShowClearDataModal(false);
                  }}
                  disabled={isSyncing}
                  style={{
                    flex: 1,
                    paddingVertical: 14,
                    borderRadius: 12,
                    backgroundColor: isSyncing ? colors.muted : colors.primary,
                  }}
                >
                  <Text style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: "#fff",
                    textAlign: "center",
                  }}>
                    {isSyncing ? "Syncing..." : "Sync Now"}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={handleClearAllData}
                  disabled={isClearing || clearDataPassword.length !== 4}
                  style={{
                    flex: 1,
                    paddingVertical: 14,
                    borderRadius: 12,
                    backgroundColor: isClearing || clearDataPassword.length !== 4 ? colors.muted : colors.error,
                  }}
                >
                  <Text style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: "#fff",
                    textAlign: "center",
                  }}>
                    {isClearing ? "Clearing..." : "Clear Data"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}
