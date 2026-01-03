export interface Checkpoint {
  id: number;
  number: number;
  name: string;
  shortName: string;
  description: string;
  color: string;
  location: "top" | "back_bottom" | "front_bottom";
}

/**
 * Palitana Yatra Checkpoint Configuration
 * 
 * Pilgrimage Flow:
 * - Pilgrims climb from front route, do darshan at top
 * - Descend via back route (Gheti side) for most Jatras
 * - Final descent of each day is via front route (Sagaal Pol)
 * 
 * Scan Pattern:
 * - Motisha Tuk: Scanned at TOP before starting descent (odd scans)
 * - Gheti: Scanned at BOTTOM of back route (even scans, marks Jatra completion)
 * - Sagaal Pol: Scanned at BOTTOM of front route (last scan of the day only)
 * 
 * Day 1 Jatra Distribution:
 * - 20-25% pilgrims: 4 Jatras (8 scans, last at Sagaal Pol)
 * - ~60% pilgrims: 5 Jatras (10 scans, last at Sagaal Pol)
 * - ~15% pilgrims: 6 Jatras (12 scans, last at Sagaal Pol)
 * 
 * Day 2: Complete remaining Jatras to reach 7 total (Saat Jatra)
 */
export const CHECKPOINTS: Checkpoint[] = [
  { 
    id: 1, 
    number: 1, 
    name: "Motisha Tuk", 
    shortName: "Motisha",
    description: "Top of hill - scan before descent", 
    color: "#FF7F3F",  // Saffron orange
    location: "top"
  },
  { 
    id: 2, 
    number: 2, 
    name: "Gheti", 
    shortName: "Gheti",
    description: "Back route bottom - Jatra completion", 
    color: "#4CAF50",  // Green for completion
    location: "back_bottom"
  },
  { 
    id: 3, 
    number: 3, 
    name: "Sagaal Pol", 
    shortName: "Sagaal",
    description: "Front route - final descent of day", 
    color: "#2196F3",  // Blue for final
    location: "front_bottom"
  },
];

export const TOTAL_CHECKPOINTS = 3;
export const TOTAL_PARTICIPANTS = 413;

// Duplicate scan prevention - 10 minutes
export const DUPLICATE_RATE_LIMIT_MS = 10 * 60 * 1000;

// Checkpoint IDs
export const CHECKPOINT_IDS = {
  MOTISHA_TUK: 1,
  GHETI: 2,
  SAGAAL_POL: 3,
} as const;

// Legacy aliases for backward compatibility
export const CHECKPOINT_ALIASES = {
  AAMLI: CHECKPOINT_IDS.MOTISHA_TUK,
  X: CHECKPOINT_IDS.SAGAAL_POL,
};

/**
 * Jatra Completion Logic:
 * - A Jatra is completed when scanned at Gheti (back route bottom)
 * - Sagaal Pol scan indicates final descent of the day (not a Jatra completion)
 * - Motisha Tuk scan indicates start of descent
 */
export const JATRA_COMPLETION_CHECKPOINT = CHECKPOINT_IDS.GHETI;

/**
 * Final descent checkpoint - used to mark end of day's pilgrimage
 */
export const FINAL_DESCENT_CHECKPOINT = CHECKPOINT_IDS.SAGAAL_POL;

/**
 * Descent start checkpoint - marks beginning of descent from top
 */
export const DESCENT_START_CHECKPOINT = CHECKPOINT_IDS.MOTISHA_TUK;

// QR Token prefix
export const QR_TOKEN_PREFIX = "PALITANA_YATRA_";

// Badge number range
export const MIN_BADGE_NUMBER = 1;
export const MAX_BADGE_NUMBER = 417;

// Sync configuration
export const SYNC_POLL_INTERVAL_ONLINE = 5000; // 5 seconds
export const SYNC_POLL_INTERVAL_OFFLINE = 30000; // 30 seconds

// UI configuration
export const SCAN_BUTTON_SIZE = 140;
export const RECENT_SCANS_LIMIT = 10;

/**
 * Day 1 Jatra targets based on pilgrim groups
 */
export const DAY1_JATRA_TARGETS = {
  GROUP_A: 4,  // 20-25% of pilgrims
  GROUP_B: 5,  // ~60% of pilgrims
  GROUP_C: 6,  // ~15% of pilgrims
};

/**
 * Total Jatras for Saat Jatra completion
 */
export const SAAT_JATRA_TOTAL = 7;

/**
 * Calculate expected scans for a given number of Jatras
 * Each Jatra = 2 scans (Motisha Tuk + Gheti), except last of day which ends at Sagaal Pol
 */
export function getExpectedScansForJatras(jatras: number, isLastOfDay: boolean): number {
  if (isLastOfDay) {
    // Last Jatra of day: (jatras - 1) * 2 + 1 (Motisha) + 1 (Sagaal Pol)
    return (jatras - 1) * 2 + 2;
  }
  // Normal: jatras * 2
  return jatras * 2;
}

/**
 * Get checkpoint info by ID
 */
export function getCheckpointById(id: number): Checkpoint | undefined {
  return CHECKPOINTS.find(cp => cp.id === id);
}

/**
 * Get checkpoint color by ID (returns hex color)
 */
export function getCheckpointColorById(id: number): string {
  const checkpoint = getCheckpointById(id);
  return checkpoint?.color || "#FF7F3F";
}
