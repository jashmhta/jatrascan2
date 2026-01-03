import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Participant } from "@/types";

const STORAGE_KEY = "palitana_notified_7th_jatra";

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Request notification permissions
export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === "web") {
    return false; // Web notifications not supported in this implementation
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === "granted";
}

// Check if we already notified for this pilgrim's 7th Jatra
async function hasNotified7thJatra(participantUuid: string): Promise<boolean> {
  try {
    const notified = await AsyncStorage.getItem(STORAGE_KEY);
    if (!notified) return false;
    const notifiedSet: string[] = JSON.parse(notified);
    return notifiedSet.includes(participantUuid);
  } catch {
    return false;
  }
}

// Mark pilgrim as notified for 7th Jatra
async function markNotified7thJatra(participantUuid: string): Promise<void> {
  try {
    const notified = await AsyncStorage.getItem(STORAGE_KEY);
    const notifiedSet: string[] = notified ? JSON.parse(notified) : [];
    if (!notifiedSet.includes(participantUuid)) {
      notifiedSet.push(participantUuid);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(notifiedSet));
    }
  } catch (error) {
    console.error("Failed to mark 7th Jatra notification:", error);
  }
}

// Send local notification for 7th Jatra completion
export async function notify7thJatraCompletion(participant: Participant): Promise<boolean> {
  // Check if already notified
  if (await hasNotified7thJatra(participant.uuid)) {
    return false;
  }

  // Check permissions
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission && Platform.OS !== "web") {
    console.log("Notification permissions not granted");
    return false;
  }

  try {
    // Schedule immediate local notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "🎉 Saat Jatra Complete!",
        body: `${participant.name} (Badge #${participant.badgeNumber}) has completed their 7th Jatra! Jai Jinendra! 🙏`,
        data: {
          type: "7th_jatra",
          participantUuid: participant.uuid,
          participantName: participant.name,
          badgeNumber: participant.badgeNumber,
        },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null, // Immediate notification
    });

    // Mark as notified
    await markNotified7thJatra(participant.uuid);

    return true;
  } catch (error) {
    console.error("Failed to send 7th Jatra notification:", error);
    return false;
  }
}

// Send notification to owner via server (for important events)
export async function notifyOwnerOf7thJatra(
  participant: Participant,
  apiCall: (input: { title: string; content: string }) => Promise<{ success: boolean }>
): Promise<boolean> {
  try {
    const result = await apiCall({
      title: `🎉 Saat Jatra Complete: ${participant.name}`,
      content: `Pilgrim ${participant.name} (Badge #${participant.badgeNumber}) has completed their 7th Jatra (Saat Jatra) at Palitana Shatrunjaya Hill! This is a significant spiritual milestone.\n\nDetails:\n- Name: ${participant.name}\n- Badge: #${participant.badgeNumber}\n- Blood Group: ${participant.bloodGroup || "N/A"}\n- Age: ${participant.age || "N/A"}\n\nJai Jinendra! 🙏`,
    });
    return result.success;
  } catch (error) {
    console.error("Failed to notify owner:", error);
    return false;
  }
}

// Clear all 7th Jatra notifications (for testing/reset)
export async function clearNotificationHistory(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
