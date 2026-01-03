export interface Participant {
  id: number;
  uuid: string;
  badgeNumber: number;
  name: string;
  qrToken: string;
  age: number | null;
  bloodGroup: string | null;
  emergencyContact: string | null;
  selfContact: string | null;  // Added: pilgrim's own contact number
  photoUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScanLog {
  id: number;
  uuid: string;
  participantId: number;
  participantUuid: string;
  checkpointId: number;
  deviceId: string | null;
  volunteerId: string | null;  // Added: volunteer identifier
  scannedAt: Date;
  scannedAtIST: string;  // Added: IST formatted timestamp
  syncedToSheets: boolean;
  createdAt: Date;
}

export interface JatraCount {
  id: number;
  participantId: number;
  participantUuid: string;
  jatraNumber: number;
  startScanId: number | null;
  endScanId: number | null;
  startTime: Date | null;
  endTime: Date | null;
  durationMinutes: number | null;
  completedAt: Date;
  syncedToSheets: boolean;
  createdAt: Date;
}

export interface ScanResult {
  success: boolean;
  duplicate?: boolean;
  message: string;
  participant?: Participant;
  jatraCount?: number;
  jatraDuration?: number;  // Added: duration in minutes for completed Jatra
  isFinalDescent?: boolean;
  checkpointName?: string;
  timestampIST?: string;  // Added: IST formatted timestamp
}

export interface LocalScanLog {
  uuid: string;
  participantId: number;
  participantUuid: string;
  checkpointId: number;
  deviceId?: string;
  volunteerId?: string;  // Added: volunteer identifier
  scannedAt: string;
  scannedAtIST: string;  // Added: IST formatted timestamp
  synced: boolean;
}

export interface AppSettings {
  currentCheckpoint: number;
  soundEnabled: boolean;
  hapticEnabled: boolean;
  language: "en" | "hi" | "gu";
  deviceId: string;
  volunteerId: string;  // Added: volunteer name/ID
  lastSyncTime: string | null;
  continuousScanMode: boolean;  // Added: for batch scanning
}

export interface SyncStatus {
  isOnline: boolean;
  pendingScans: number;
  lastSyncTime: Date | null;
  isSyncing: boolean;
  lastSyncError?: string;  // Added: error message if sync failed
}

export interface Statistics {
  totalParticipants: number;
  totalScans: number;
  totalJatras: number;
  todayScans: number;
  todayJatras: number;
  checkpointStats: { checkpointId: number; count: number }[];
  atRiskPilgrims: number;  // Added: pilgrims with incomplete Jatra > 6 hours
}

// New: Jatra duration tracking per participant
export interface JatraDuration {
  jatraNumber: number;
  startTime: string;  // IST
  endTime: string | null;  // IST, null if in progress
  durationMinutes: number | null;
  startCheckpoint: string;
  endCheckpoint: string | null;
  isComplete: boolean;
}

// New: Participant with safety status
export interface ParticipantWithStatus extends Participant {
  currentJatra: number;
  lastScanTime: Date | null;
  lastCheckpoint: string | null;
  isAtRisk: boolean;  // True if incomplete Jatra > 6 hours
  minutesSinceLastScan: number | null;
  jatraDurations: JatraDuration[];
}

// New: Volunteer info
export interface VolunteerInfo {
  id: string;
  name: string;
  checkpoint: number;
  deviceId: string;
  lastActive: Date;
}

// New: Batch scan result for continuous scanning
export interface BatchScanResult {
  totalScanned: number;
  successful: number;
  duplicates: number;
  errors: number;
  scans: ScanResult[];
}

// IST timezone offset (UTC+5:30)
export const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

// Safety threshold: 6 hours in milliseconds
export const SAFETY_THRESHOLD_MS = 6 * 60 * 60 * 1000;

// Format date to IST string
export function formatToIST(date: Date): string {
  const istDate = new Date(date.getTime() + IST_OFFSET_MS);
  const day = String(istDate.getUTCDate()).padStart(2, '0');
  const month = String(istDate.getUTCMonth() + 1).padStart(2, '0');
  const year = istDate.getUTCFullYear();
  const hours = String(istDate.getUTCHours()).padStart(2, '0');
  const minutes = String(istDate.getUTCMinutes()).padStart(2, '0');
  const seconds = String(istDate.getUTCSeconds()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds} IST`;
}

// Parse IST string back to Date
export function parseIST(istString: string): Date {
  // Expected format: DD/MM/YYYY HH:MM:SS IST
  const match = istString.match(/(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})/);
  if (!match) return new Date();
  const [, day, month, year, hours, minutes, seconds] = match;
  const utcDate = new Date(Date.UTC(
    parseInt(year),
    parseInt(month) - 1,
    parseInt(day),
    parseInt(hours),
    parseInt(minutes),
    parseInt(seconds)
  ));
  return new Date(utcDate.getTime() - IST_OFFSET_MS);
}

// Calculate duration in minutes between two dates
export function calculateDurationMinutes(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60));
}

// Check if pilgrim is at risk (incomplete Jatra > 6 hours)
export function isAtRisk(lastScanTime: Date | null, lastCheckpointId: number | null): boolean {
  if (!lastScanTime || lastCheckpointId === null) return false;
  // At risk if last scan was at Motisha Tuk (descent start) and > 6 hours ago
  if (lastCheckpointId === 1) {  // Motisha Tuk
    const timeSinceLastScan = Date.now() - lastScanTime.getTime();
    return timeSinceLastScan > SAFETY_THRESHOLD_MS;
  }
  return false;
}
