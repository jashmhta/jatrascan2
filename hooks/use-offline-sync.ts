import { useState, useEffect, useCallback, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { v4 as uuidv4 } from "uuid";

import { trpc } from "@/lib/trpc";
import { 
  DUPLICATE_RATE_LIMIT_MS, 
  JATRA_COMPLETION_CHECKPOINT, 
  FINAL_DESCENT_CHECKPOINT,
  DESCENT_START_CHECKPOINT,
  SYNC_POLL_INTERVAL_ONLINE,
  CHECKPOINTS,
  getCheckpointById,
} from "@/constants/checkpoints";
import { notify7thJatraCompletion } from "@/services/push-notifications";
import { 
  formatToIST, 
  calculateDurationMinutes,
  SAFETY_THRESHOLD_MS,
} from "@/types";
import type { 
  Participant, 
  LocalScanLog, 
  ScanResult, 
  SyncStatus,
  ParticipantWithStatus,
  JatraDuration,
  BatchScanResult,
} from "@/types";

const STORAGE_KEYS = {
  PARTICIPANTS: "palitana_participants",
  SCAN_LOGS: "palitana_scan_logs",
  PENDING_SCANS: "palitana_pending_scans",
  LAST_SYNC: "palitana_last_sync",
  DEVICE_ID: "palitana_device_id",
  VOLUNTEER_ID: "palitana_volunteer_id",
  CURRENT_CHECKPOINT: "palitana_current_checkpoint",
};

export function useOfflineSync() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [scanLogs, setScanLogs] = useState<LocalScanLog[]>([]);
  const [pendingScans, setPendingScans] = useState<LocalScanLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: true,
    pendingScans: 0,
    lastSyncTime: null,
    isSyncing: false,
  });
  const [deviceId, setDeviceId] = useState<string>("");
  const [volunteerId, setVolunteerId] = useState<string>("");
  const [currentCheckpoint, setCurrentCheckpoint] = useState<number>(1);
  const [continuousScanMode, setContinuousScanMode] = useState(false);
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 5;
  const baseDelay = 1000;

  // tRPC queries
  const participantsQuery = trpc.participants.list.useQuery(undefined, {
    enabled: false,
    retry: 2,
  });

  const scanLogsQuery = trpc.scanLogs.list.useQuery(undefined, {
    enabled: false,
    retry: 2,
  });

  const createScanMutation = trpc.scanLogs.create.useMutation();
  const bulkCreateMutation = trpc.scanLogs.bulkCreate.useMutation();
  const createJatraCountMutation = trpc.jatraCounts.create.useMutation();

  // Initialize device ID and volunteer ID
  useEffect(() => {
    const initIds = async () => {
      let devId = await AsyncStorage.getItem(STORAGE_KEYS.DEVICE_ID);
      if (!devId) {
        devId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await AsyncStorage.setItem(STORAGE_KEYS.DEVICE_ID, devId);
      }
      setDeviceId(devId);

      const volId = await AsyncStorage.getItem(STORAGE_KEYS.VOLUNTEER_ID);
      if (volId) setVolunteerId(volId);

      const savedCheckpoint = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_CHECKPOINT);
      if (savedCheckpoint) setCurrentCheckpoint(parseInt(savedCheckpoint, 10));
    };
    initIds();
  }, []);

  // Save volunteer ID
  const setVolunteerIdAndSave = useCallback(async (id: string) => {
    setVolunteerId(id);
    await AsyncStorage.setItem(STORAGE_KEYS.VOLUNTEER_ID, id);
  }, []);

  // Save current checkpoint
  const setCurrentCheckpointAndSave = useCallback(async (checkpointId: number) => {
    setCurrentCheckpoint(checkpointId);
    await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_CHECKPOINT, checkpointId.toString());
  }, []);

  // Load cached data on mount
  useEffect(() => {
    const loadCachedData = async () => {
      try {
        const [cachedParticipants, cachedScanLogs, cachedPending, lastSync] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.PARTICIPANTS),
          AsyncStorage.getItem(STORAGE_KEYS.SCAN_LOGS),
          AsyncStorage.getItem(STORAGE_KEYS.PENDING_SCANS),
          AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC),
        ]);

        if (cachedParticipants) {
          setParticipants(JSON.parse(cachedParticipants));
        }
        if (cachedScanLogs) {
          setScanLogs(JSON.parse(cachedScanLogs));
        }
        if (cachedPending) {
          const pending = JSON.parse(cachedPending);
          setPendingScans(pending);
          setSyncStatus(prev => ({ ...prev, pendingScans: pending.length }));
        }
        if (lastSync) {
          setSyncStatus(prev => ({ ...prev, lastSyncTime: new Date(lastSync) }));
        }
      } catch (error) {
        console.error("Failed to load cached data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCachedData();
  }, []);

  // Calculate exponential backoff delay
  const getBackoffDelay = useCallback((retryCount: number): number => {
    const delay = Math.min(baseDelay * Math.pow(2, retryCount), 16000);
    const jitter = delay * 0.2 * (Math.random() * 2 - 1);
    return Math.floor(delay + jitter);
  }, []);

  // Full sync with server - pulls all data from centralized database
  const syncWithServer = useCallback(async (isRetry = false) => {
    if (syncStatus.isSyncing && !isRetry) return;

    setSyncStatus(prev => ({ ...prev, isSyncing: true }));

    try {
      // Fetch latest participants from central database
      const participantsResult = await participantsQuery.refetch();
      if (participantsResult.data) {
        setParticipants(participantsResult.data as Participant[]);
        await AsyncStorage.setItem(STORAGE_KEYS.PARTICIPANTS, JSON.stringify(participantsResult.data));
      }

      // Fetch ALL scan logs from central database (shared across all volunteers)
      const scanLogsResult = await scanLogsQuery.refetch();
      if (scanLogsResult.data) {
        const serverLogs: LocalScanLog[] = (scanLogsResult.data as any[]).map((log: any) => ({
          uuid: log.uuid,
          participantId: log.participantId,
          participantUuid: log.participantUuid,
          checkpointId: log.checkpointId,
          deviceId: log.deviceId,
          volunteerId: log.volunteerId,
          scannedAt: typeof log.scannedAt === 'string' ? log.scannedAt : new Date(log.scannedAt).toISOString(),
          scannedAtIST: formatToIST(new Date(log.scannedAt)),
          synced: true,
        }));
        
        // Merge with pending scans (local scans not yet synced)
        const pendingUuids = new Set(pendingScans.map(s => s.uuid));
        const mergedLogs = [
          ...pendingScans,
          ...serverLogs.filter(log => !pendingUuids.has(log.uuid)),
        ].sort((a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime());
        
        setScanLogs(mergedLogs);
        await AsyncStorage.setItem(STORAGE_KEYS.SCAN_LOGS, JSON.stringify(mergedLogs));
      }

      // Push pending scans to server
      if (pendingScans.length > 0) {
        try {
          const result = await bulkCreateMutation.mutateAsync(
            pendingScans.map(scan => ({
              uuid: scan.uuid,
              participantId: scan.participantId,
              participantUuid: scan.participantUuid,
              checkpointId: scan.checkpointId,
              deviceId: scan.deviceId,
              volunteerId: scan.volunteerId,
              scannedAt: scan.scannedAt,
            }))
          );

          if (result.inserted > 0) {
            const syncedUuids = new Set(pendingScans.map(s => s.uuid));
            setScanLogs(prev => prev.map(log => 
              syncedUuids.has(log.uuid) ? { ...log, synced: true } : log
            ));
            setPendingScans([]);
            await AsyncStorage.setItem(STORAGE_KEYS.PENDING_SCANS, JSON.stringify([]));
          }
        } catch (error) {
          console.error("Failed to push pending scans:", error);
        }
      }

      const now = new Date();
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, now.toISOString());
      setSyncStatus(prev => ({
        ...prev,
        isOnline: true,
        pendingScans: 0,
        lastSyncTime: now,
        isSyncing: false,
        lastSyncError: undefined,
      }));
      retryCountRef.current = 0;
    } catch (error) {
      console.error("Sync failed:", error);
      
      if (retryCountRef.current < maxRetries) {
        const delay = getBackoffDelay(retryCountRef.current);
        retryCountRef.current += 1;
        setTimeout(() => syncWithServer(true), delay);
      }
      
      setSyncStatus(prev => ({
        ...prev,
        isOnline: false,
        isSyncing: false,
        lastSyncError: error instanceof Error ? error.message : "Sync failed",
      }));
    }
  }, [syncStatus.isSyncing, pendingScans, participantsQuery, scanLogsQuery, bulkCreateMutation, getBackoffDelay]);

  // Initial sync and periodic sync
  useEffect(() => {
    syncWithServer();
    syncIntervalRef.current = setInterval(() => {
      syncWithServer();
    }, SYNC_POLL_INTERVAL_ONLINE);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, []);

  // Check for duplicate scan (within rate limit)
  const isDuplicateScan = useCallback((participantUuid: string, checkpointId: number): boolean => {
    const cutoffTime = Date.now() - DUPLICATE_RATE_LIMIT_MS;
    return scanLogs.some(
      log =>
        log.participantUuid === participantUuid &&
        log.checkpointId === checkpointId &&
        new Date(log.scannedAt).getTime() > cutoffTime
    );
  }, [scanLogs]);

  // Get Jatra count for a participant
  const getJatraCount = useCallback((participantUuid: string): number => {
    return scanLogs.filter(
      log => log.participantUuid === participantUuid && log.checkpointId === JATRA_COMPLETION_CHECKPOINT
    ).length;
  }, [scanLogs]);

  // Get participant's scan history
  const getParticipantScans = useCallback((participantUuid: string): LocalScanLog[] => {
    return scanLogs
      .filter(log => log.participantUuid === participantUuid)
      .sort((a, b) => new Date(a.scannedAt).getTime() - new Date(b.scannedAt).getTime());
  }, [scanLogs]);

  // Calculate Jatra durations for a participant
  const getJatraDurations = useCallback((participantUuid: string): JatraDuration[] => {
    const participantScans = getParticipantScans(participantUuid);
    const durations: JatraDuration[] = [];
    
    let currentJatraStart: LocalScanLog | null = null;
    let jatraNumber = 0;
    
    for (const scan of participantScans) {
      if (scan.checkpointId === DESCENT_START_CHECKPOINT) {
        // Start of descent (Motisha Tuk)
        currentJatraStart = scan;
      } else if (scan.checkpointId === JATRA_COMPLETION_CHECKPOINT && currentJatraStart) {
        // Jatra completed (Gheti)
        jatraNumber++;
        const startTime = new Date(currentJatraStart.scannedAt);
        const endTime = new Date(scan.scannedAt);
        
        durations.push({
          jatraNumber,
          startTime: formatToIST(startTime),
          endTime: formatToIST(endTime),
          durationMinutes: calculateDurationMinutes(startTime, endTime),
          startCheckpoint: getCheckpointById(DESCENT_START_CHECKPOINT)?.name || "Motisha Tuk",
          endCheckpoint: getCheckpointById(JATRA_COMPLETION_CHECKPOINT)?.name || "Gheti",
          isComplete: true,
        });
        currentJatraStart = null;
      }
    }
    
    // Check for in-progress Jatra
    if (currentJatraStart) {
      const startTime = new Date(currentJatraStart.scannedAt);
      durations.push({
        jatraNumber: jatraNumber + 1,
        startTime: formatToIST(startTime),
        endTime: null,
        durationMinutes: null,
        startCheckpoint: getCheckpointById(DESCENT_START_CHECKPOINT)?.name || "Motisha Tuk",
        endCheckpoint: null,
        isComplete: false,
      });
    }
    
    return durations;
  }, [getParticipantScans]);

  // Get participant with safety status
  const getParticipantWithStatus = useCallback((participant: Participant): ParticipantWithStatus => {
    const participantScans = getParticipantScans(participant.uuid);
    const lastScan = participantScans[participantScans.length - 1];
    const jatraCount = getJatraCount(participant.uuid);
    const jatraDurations = getJatraDurations(participant.uuid);
    
    let isAtRisk = false;
    let minutesSinceLastScan: number | null = null;
    
    if (lastScan) {
      const lastScanTime = new Date(lastScan.scannedAt);
      minutesSinceLastScan = calculateDurationMinutes(lastScanTime, new Date());
      
      // At risk if last scan was at Motisha Tuk (descent start) and > 6 hours ago
      if (lastScan.checkpointId === DESCENT_START_CHECKPOINT) {
        const timeSinceLastScan = Date.now() - lastScanTime.getTime();
        isAtRisk = timeSinceLastScan > SAFETY_THRESHOLD_MS;
      }
    }
    
    return {
      ...participant,
      currentJatra: jatraCount,
      lastScanTime: lastScan ? new Date(lastScan.scannedAt) : null,
      lastCheckpoint: lastScan ? getCheckpointById(lastScan.checkpointId)?.name || null : null,
      isAtRisk,
      minutesSinceLastScan,
      jatraDurations,
    };
  }, [getParticipantScans, getJatraCount, getJatraDurations]);

  // Get all at-risk pilgrims
  const getAtRiskPilgrims = useCallback((): ParticipantWithStatus[] => {
    return participants
      .map(p => getParticipantWithStatus(p))
      .filter(p => p.isAtRisk)
      .sort((a, b) => (b.minutesSinceLastScan || 0) - (a.minutesSinceLastScan || 0));
  }, [participants, getParticipantWithStatus]);

  // Add a new scan (works offline)
  const addScan = useCallback(async (participant: Participant, checkpointId: number): Promise<ScanResult> => {
    // Check for duplicate
    if (isDuplicateScan(participant.uuid, checkpointId)) {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
      return {
        success: false,
        duplicate: true,
        message: "Already scanned at this checkpoint within 10 minutes",
        participant,
      };
    }

    const now = new Date();
    const timestampIST = formatToIST(now);
    
    const newScan: LocalScanLog = {
      uuid: uuidv4(),
      participantId: participant.id,
      participantUuid: participant.uuid,
      checkpointId,
      deviceId,
      volunteerId,
      scannedAt: now.toISOString(),
      scannedAtIST: timestampIST,
      synced: false,
    };

    // Add to local state immediately (offline-first)
    setScanLogs(prev => [newScan, ...prev]);
    setPendingScans(prev => {
      const updated = [newScan, ...prev];
      AsyncStorage.setItem(STORAGE_KEYS.PENDING_SCANS, JSON.stringify(updated)).catch(console.error);
      AsyncStorage.setItem(STORAGE_KEYS.SCAN_LOGS, JSON.stringify([newScan, ...scanLogs])).catch(console.error);
      return updated;
    });

    setSyncStatus(prev => ({ ...prev, pendingScans: prev.pendingScans + 1 }));

    // Haptic feedback
    if (Platform.OS !== "web") {
      if (checkpointId === JATRA_COMPLETION_CHECKPOINT) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    }

    // Calculate Jatra duration if completing a Jatra
    let jatraDuration: number | undefined;
    const jatraCount = checkpointId === JATRA_COMPLETION_CHECKPOINT 
      ? getJatraCount(participant.uuid) + 1 
      : getJatraCount(participant.uuid);

    if (checkpointId === JATRA_COMPLETION_CHECKPOINT) {
      // Find the last Motisha Tuk scan for this participant
      const participantScans = getParticipantScans(participant.uuid);
      const lastMotishaScan = [...participantScans]
        .reverse()
        .find(s => s.checkpointId === DESCENT_START_CHECKPOINT);
      
      if (lastMotishaScan) {
        jatraDuration = calculateDurationMinutes(new Date(lastMotishaScan.scannedAt), now);
      }
    }

    // Try to sync immediately (non-blocking)
    createScanMutation.mutateAsync({
      uuid: newScan.uuid,
      participantId: participant.id,
      participantUuid: participant.uuid,
      checkpointId,
      deviceId,
      scannedAt: newScan.scannedAt,
    }).then(result => {
      if (result.success) {
        setScanLogs(prev => prev.map(log => 
          log.uuid === newScan.uuid ? { ...log, synced: true } : log
        ));
        setPendingScans(prev => {
          const updated = prev.filter(s => s.uuid !== newScan.uuid);
          AsyncStorage.setItem(STORAGE_KEYS.PENDING_SCANS, JSON.stringify(updated)).catch(console.error);
          return updated;
        });
        setSyncStatus(prev => ({ ...prev, pendingScans: Math.max(0, prev.pendingScans - 1) }));
      }
    }).catch(error => {
      console.error("Failed to sync scan (will retry):", error);
    });

    // Log Jatra completion to JatraCompletions sheet
    if (checkpointId === JATRA_COMPLETION_CHECKPOINT) {
      const participantScans = getParticipantScans(participant.uuid);
      const lastMotishaScan = [...participantScans]
        .reverse()
        .find(s => s.checkpointId === DESCENT_START_CHECKPOINT);
      
      if (lastMotishaScan) {
        createJatraCountMutation.mutateAsync({
          participantId: participant.id,
          participantUuid: participant.uuid,
          jatraNumber: jatraCount,
          startTime: lastMotishaScan.scannedAt,
          endTime: newScan.scannedAt,
          durationMinutes: jatraDuration,
          completedAt: newScan.scannedAt,
        }).catch(error => {
          console.error("Failed to log Jatra completion:", error);
        });
      }
    }

    // Check for 7th Jatra completion
    if (checkpointId === JATRA_COMPLETION_CHECKPOINT && jatraCount === 7) {
      notify7thJatraCompletion(participant).catch(console.error);
    }

    // Generate message
    let message = "Scan recorded successfully";
    const checkpoint = getCheckpointById(checkpointId);
    
    if (checkpointId === JATRA_COMPLETION_CHECKPOINT) {
      message = jatraDuration 
        ? `Jatra #${jatraCount} completed in ${jatraDuration} min at ${checkpoint?.name || 'Gheti'}!`
        : `Jatra #${jatraCount} completed at ${checkpoint?.name || 'Gheti'}!`;
    } else if (checkpointId === FINAL_DESCENT_CHECKPOINT) {
      message = `Final descent recorded at ${checkpoint?.name || 'Sagaal Pol'} - Day complete!`;
    } else if (checkpointId === DESCENT_START_CHECKPOINT) {
      message = `Descent started from ${checkpoint?.name || 'Motisha Tuk'}`;
    }

    return {
      success: true,
      message,
      participant,
      jatraCount,
      jatraDuration,
      isFinalDescent: checkpointId === FINAL_DESCENT_CHECKPOINT,
      checkpointName: checkpoint?.name,
      timestampIST,
    };
  }, [deviceId, volunteerId, isDuplicateScan, getJatraCount, getParticipantScans, scanLogs, createScanMutation]);

  // Batch scan multiple participants (continuous scanning mode)
  const batchScan = useCallback(async (participantUuids: string[]): Promise<BatchScanResult> => {
    const results: ScanResult[] = [];
    let successful = 0;
    let duplicates = 0;
    let errors = 0;

    for (const uuid of participantUuids) {
      const participant = participants.find(p => p.uuid === uuid);
      if (!participant) {
        errors++;
        results.push({ success: false, message: "Participant not found" });
        continue;
      }

      const result = await addScan(participant, currentCheckpoint);
      results.push(result);
      
      if (result.success) {
        successful++;
      } else if (result.duplicate) {
        duplicates++;
      } else {
        errors++;
      }

      // Small delay between scans for stability
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    return {
      totalScanned: participantUuids.length,
      successful,
      duplicates,
      errors,
      scans: results,
    };
  }, [participants, currentCheckpoint, addScan]);

  // Clear all local scan data (keeps pilgrim data)
  const clearAllLocalData = useCallback(async () => {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.SCAN_LOGS,
        STORAGE_KEYS.PENDING_SCANS,
        STORAGE_KEYS.LAST_SYNC,
      ]);
      
      setScanLogs([]);
      setPendingScans([]);
      setSyncStatus(prev => ({
        ...prev,
        pendingScans: 0,
        lastSyncTime: null,
      }));
      
      return { success: true };
    } catch (error) {
      console.error("Failed to clear local data:", error);
      return { success: false, error };
    }
  }, []);

  // Force full sync from database (pull all data)
  const forceFullSync = useCallback(async () => {
    // Clear local scan logs first
    setScanLogs([]);
    await AsyncStorage.removeItem(STORAGE_KEYS.SCAN_LOGS);
    
    // Then sync from server
    await syncWithServer();
  }, [syncWithServer]);

  // Get recent scans (sorted by time)
  const recentScans = scanLogs.slice(0, 100);

  // Get statistics
  const getStatistics = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayScans = scanLogs.filter(log => new Date(log.scannedAt) >= today);
    const todayJatras = todayScans.filter(log => log.checkpointId === JATRA_COMPLETION_CHECKPOINT).length;
    
    const checkpointStats = CHECKPOINTS.map(cp => ({
      checkpointId: cp.id,
      count: scanLogs.filter(log => log.checkpointId === cp.id).length,
      todayCount: todayScans.filter(log => log.checkpointId === cp.id).length,
    }));
    
    const atRiskPilgrims = getAtRiskPilgrims();
    
    return {
      totalParticipants: participants.length,
      totalScans: scanLogs.length,
      totalJatras: scanLogs.filter(log => log.checkpointId === JATRA_COMPLETION_CHECKPOINT).length,
      todayScans: todayScans.length,
      todayJatras,
      checkpointStats,
      atRiskCount: atRiskPilgrims.length,
      atRiskPilgrims,
    };
  }, [scanLogs, participants, getAtRiskPilgrims]);

  return {
    // Data
    participants,
    scanLogs,
    recentScans,
    pendingScans,
    isLoading,
    syncStatus,
    deviceId,
    volunteerId,
    currentCheckpoint,
    continuousScanMode,
    
    // Actions
    addScan,
    batchScan,
    isDuplicateScan,
    getJatraCount,
    getParticipantScans,
    getJatraDurations,
    getParticipantWithStatus,
    getAtRiskPilgrims,
    getStatistics,
    syncWithServer,
    forceFullSync,
    clearAllLocalData,
    
    // Settings
    setVolunteerId: setVolunteerIdAndSave,
    setCurrentCheckpoint: setCurrentCheckpointAndSave,
    setContinuousScanMode,
  };
}
