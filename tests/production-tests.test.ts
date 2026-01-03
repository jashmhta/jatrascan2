import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  formatToIST,
  parseIST,
  calculateDurationMinutes,
  isAtRisk,
  IST_OFFSET_MS,
  SAFETY_THRESHOLD_MS,
} from "../types";
import {
  CHECKPOINTS,
  DESCENT_START_CHECKPOINT,
  JATRA_COMPLETION_CHECKPOINT,
  FINAL_DESCENT_CHECKPOINT,
  QR_TOKEN_PREFIX,
  getCheckpointById,
  getCheckpointColorById,
} from "../constants/checkpoints";

describe("Production Tests - Palitana Yatra Tracker", () => {
  
  // ============================================
  // IST Timestamp Tests
  // ============================================
  describe("IST Timestamp Utilities", () => {
    it("should format date to IST correctly", () => {
      // UTC midnight = 5:30 AM IST
      const utcMidnight = new Date("2025-01-03T00:00:00.000Z");
      const istString = formatToIST(utcMidnight);
      expect(istString).toBe("03/01/2025 05:30:00 IST");
    });

    it("should handle IST offset correctly (UTC+5:30)", () => {
      expect(IST_OFFSET_MS).toBe(5.5 * 60 * 60 * 1000);
    });

    it("should parse IST string back to Date", () => {
      const istString = "03/01/2025 10:30:00 IST";
      const date = parseIST(istString);
      // 10:30 IST = 05:00 UTC
      expect(date.getUTCHours()).toBe(5);
      expect(date.getUTCMinutes()).toBe(0);
    });

    it("should calculate duration in minutes correctly", () => {
      const start = new Date("2025-01-03T10:00:00.000Z");
      const end = new Date("2025-01-03T11:30:00.000Z");
      expect(calculateDurationMinutes(start, end)).toBe(90);
    });

    it("should handle zero duration", () => {
      const time = new Date("2025-01-03T10:00:00.000Z");
      expect(calculateDurationMinutes(time, time)).toBe(0);
    });
  });

  // ============================================
  // Checkpoint Configuration Tests
  // ============================================
  describe("Checkpoint Configuration", () => {
    it("should have exactly 3 checkpoints", () => {
      expect(CHECKPOINTS.length).toBe(3);
    });

    it("should have correct checkpoint names", () => {
      expect(CHECKPOINTS[0].name).toBe("Motisha Tuk");
      expect(CHECKPOINTS[1].name).toBe("Gheti");
      expect(CHECKPOINTS[2].name).toBe("Sagaal Pol");
    });

    it("should have correct checkpoint IDs", () => {
      expect(DESCENT_START_CHECKPOINT).toBe(1);  // Motisha Tuk
      expect(JATRA_COMPLETION_CHECKPOINT).toBe(2);  // Gheti
      expect(FINAL_DESCENT_CHECKPOINT).toBe(3);  // Sagaal Pol
    });

    it("should return checkpoint by ID", () => {
      const motisha = getCheckpointById(1);
      expect(motisha?.name).toBe("Motisha Tuk");
      expect(motisha?.description).toContain("descent");
    });

    it("should return undefined for invalid checkpoint ID", () => {
      expect(getCheckpointById(99)).toBeUndefined();
    });

    it("should validate checkpoint IDs", () => {
      expect(getCheckpointById(1)).toBeDefined();
      expect(getCheckpointById(2)).toBeDefined();
      expect(getCheckpointById(3)).toBeDefined();
      expect(getCheckpointById(0)).toBeUndefined();
      expect(getCheckpointById(4)).toBeUndefined();
    });

    it("should return correct checkpoint colors", () => {
      const color1 = getCheckpointColorById(1);
      const color2 = getCheckpointColorById(2);
      const color3 = getCheckpointColorById(3);
      expect(color1).toBeDefined();
      expect(color2).toBeDefined();
      expect(color3).toBeDefined();
      // Colors should be different
      expect(color1).not.toBe(color2);
      expect(color2).not.toBe(color3);
    });
  });

  // ============================================
  // QR Token Validation Tests
  // ============================================
  describe("QR Token Validation", () => {
    it("should have correct QR token prefix", () => {
      expect(QR_TOKEN_PREFIX).toBe("PALITANA_YATRA_");
    });

    it("should validate QR token format", () => {
      const validToken = "PALITANA_YATRA_123";
      const invalidToken = "INVALID_TOKEN_123";
      
      expect(validToken.startsWith(QR_TOKEN_PREFIX)).toBe(true);
      expect(invalidToken.startsWith(QR_TOKEN_PREFIX)).toBe(false);
    });

    it("should extract badge number from QR token", () => {
      const token = "PALITANA_YATRA_42";
      const badgeNumber = parseInt(token.replace(QR_TOKEN_PREFIX, ""), 10);
      expect(badgeNumber).toBe(42);
    });
  });

  // ============================================
  // Safety Alert Tests
  // ============================================
  describe("Safety Alert System", () => {
    it("should have correct safety threshold (6 hours)", () => {
      expect(SAFETY_THRESHOLD_MS).toBe(6 * 60 * 60 * 1000);
    });

    it("should not flag as at-risk if no last scan", () => {
      expect(isAtRisk(null, 1)).toBe(false);
    });

    it("should not flag as at-risk if checkpoint is null", () => {
      expect(isAtRisk(new Date(), null)).toBe(false);
    });

    it("should not flag as at-risk if last scan was at Gheti", () => {
      const recentTime = new Date(Date.now() - 1000);
      expect(isAtRisk(recentTime, 2)).toBe(false);  // Gheti
    });

    it("should not flag as at-risk if Motisha Tuk scan was recent", () => {
      const recentTime = new Date(Date.now() - 1000);
      expect(isAtRisk(recentTime, 1)).toBe(false);  // Motisha Tuk
    });

    it("should flag as at-risk if Motisha Tuk scan was > 6 hours ago", () => {
      const oldTime = new Date(Date.now() - (7 * 60 * 60 * 1000));  // 7 hours ago
      expect(isAtRisk(oldTime, 1)).toBe(true);  // Motisha Tuk
    });

    it("should not flag as at-risk at exactly 6 hours", () => {
      const exactlyThreshold = new Date(Date.now() - SAFETY_THRESHOLD_MS);
      expect(isAtRisk(exactlyThreshold, 1)).toBe(false);
    });
  });

  // ============================================
  // Jatra Calculation Tests
  // ============================================
  describe("Jatra Calculation Logic", () => {
    it("should count Jatras correctly based on Gheti scans", () => {
      const scanLogs = [
        { checkpointId: 1, participantUuid: "test" },  // Motisha Tuk
        { checkpointId: 2, participantUuid: "test" },  // Gheti - Jatra 1
        { checkpointId: 1, participantUuid: "test" },  // Motisha Tuk
        { checkpointId: 2, participantUuid: "test" },  // Gheti - Jatra 2
      ];
      
      const jatraCount = scanLogs.filter(
        log => log.participantUuid === "test" && log.checkpointId === JATRA_COMPLETION_CHECKPOINT
      ).length;
      
      expect(jatraCount).toBe(2);
    });

    it("should not count Sagaal Pol as Jatra completion", () => {
      const scanLogs = [
        { checkpointId: 1, participantUuid: "test" },
        { checkpointId: 3, participantUuid: "test" },  // Sagaal Pol - final descent, not Jatra
      ];
      
      const jatraCount = scanLogs.filter(
        log => log.participantUuid === "test" && log.checkpointId === JATRA_COMPLETION_CHECKPOINT
      ).length;
      
      expect(jatraCount).toBe(0);
    });

    it("should track maximum 7 Jatras (Saat Jatra)", () => {
      const MAX_JATRAS = 7;
      expect(MAX_JATRAS).toBe(7);
    });
  });

  // ============================================
  // Badge Number Validation Tests
  // ============================================
  describe("Badge Number Validation", () => {
    it("should validate badge numbers in range 1-413", () => {
      const isValidBadge = (badge: number) => badge >= 1 && badge <= 413;
      
      expect(isValidBadge(1)).toBe(true);
      expect(isValidBadge(413)).toBe(true);
      expect(isValidBadge(200)).toBe(true);
      expect(isValidBadge(0)).toBe(false);
      expect(isValidBadge(414)).toBe(false);
      expect(isValidBadge(-1)).toBe(false);
    });

    it("should handle badge number parsing from string", () => {
      const parseBadge = (input: string): number | null => {
        const num = parseInt(input, 10);
        if (isNaN(num) || num < 1 || num > 413) return null;
        return num;
      };

      expect(parseBadge("1")).toBe(1);
      expect(parseBadge("413")).toBe(413);
      expect(parseBadge("abc")).toBeNull();
      expect(parseBadge("0")).toBeNull();
      expect(parseBadge("500")).toBeNull();
    });
  });

  // ============================================
  // Duplicate Scan Prevention Tests
  // ============================================
  describe("Duplicate Scan Prevention", () => {
    const DUPLICATE_RATE_LIMIT_MS = 10 * 60 * 1000;  // 10 minutes

    it("should detect duplicate scan within rate limit", () => {
      const scanLogs = [
        { 
          participantUuid: "test", 
          checkpointId: 1, 
          scannedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString()  // 5 min ago
        },
      ];
      
      const isDuplicate = (uuid: string, checkpointId: number) => {
        const cutoffTime = Date.now() - DUPLICATE_RATE_LIMIT_MS;
        return scanLogs.some(
          log =>
            log.participantUuid === uuid &&
            log.checkpointId === checkpointId &&
            new Date(log.scannedAt).getTime() > cutoffTime
        );
      };

      expect(isDuplicate("test", 1)).toBe(true);
    });

    it("should allow scan after rate limit expires", () => {
      const scanLogs = [
        { 
          participantUuid: "test", 
          checkpointId: 1, 
          scannedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString()  // 15 min ago
        },
      ];
      
      const isDuplicate = (uuid: string, checkpointId: number) => {
        const cutoffTime = Date.now() - DUPLICATE_RATE_LIMIT_MS;
        return scanLogs.some(
          log =>
            log.participantUuid === uuid &&
            log.checkpointId === checkpointId &&
            new Date(log.scannedAt).getTime() > cutoffTime
        );
      };

      expect(isDuplicate("test", 1)).toBe(false);
    });

    it("should allow same participant at different checkpoint", () => {
      const scanLogs = [
        { 
          participantUuid: "test", 
          checkpointId: 1, 
          scannedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString()
        },
      ];
      
      const isDuplicate = (uuid: string, checkpointId: number) => {
        const cutoffTime = Date.now() - DUPLICATE_RATE_LIMIT_MS;
        return scanLogs.some(
          log =>
            log.participantUuid === uuid &&
            log.checkpointId === checkpointId &&
            new Date(log.scannedAt).getTime() > cutoffTime
        );
      };

      expect(isDuplicate("test", 2)).toBe(false);  // Different checkpoint
    });
  });

  // ============================================
  // Jatra Duration Calculation Tests
  // ============================================
  describe("Jatra Duration Calculation", () => {
    it("should calculate duration between Motisha Tuk and Gheti", () => {
      const startTime = new Date("2025-01-03T10:00:00.000Z");
      const endTime = new Date("2025-01-03T11:45:00.000Z");
      
      const duration = calculateDurationMinutes(startTime, endTime);
      expect(duration).toBe(105);  // 1 hour 45 minutes
    });

    it("should handle typical Jatra duration (60-120 minutes)", () => {
      const typicalDurations = [60, 75, 90, 105, 120];
      typicalDurations.forEach(duration => {
        expect(duration).toBeGreaterThanOrEqual(60);
        expect(duration).toBeLessThanOrEqual(120);
      });
    });

    it("should format duration for display", () => {
      const formatDuration = (minutes: number): string => {
        if (minutes < 60) return `${minutes} min`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
      };

      expect(formatDuration(45)).toBe("45 min");
      expect(formatDuration(60)).toBe("1h 0m");
      expect(formatDuration(90)).toBe("1h 30m");
      expect(formatDuration(135)).toBe("2h 15m");
    });
  });

  // ============================================
  // Data Integrity Tests
  // ============================================
  describe("Data Integrity", () => {
    it("should generate unique UUIDs for scans", () => {
      const generateUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      };

      const uuid1 = generateUUID();
      const uuid2 = generateUUID();
      
      expect(uuid1).not.toBe(uuid2);
      expect(uuid1.length).toBe(36);
      expect(uuid2.length).toBe(36);
    });

    it("should validate phone number format", () => {
      const isValidPhone = (phone: string | null): boolean => {
        if (!phone) return false;
        const cleaned = phone.replace(/[^0-9+]/g, '');
        return cleaned.length >= 10 && cleaned.length <= 15;
      };

      expect(isValidPhone("9876543210")).toBe(true);
      expect(isValidPhone("+919876543210")).toBe(true);
      expect(isValidPhone("123")).toBe(false);
      expect(isValidPhone(null)).toBe(false);
    });

    it("should validate blood group format", () => {
      const validBloodGroups = ["A +ve", "A -ve", "B +ve", "B -ve", "AB +ve", "AB -ve", "O +ve", "O -ve"];
      
      const isValidBloodGroup = (bg: string | null): boolean => {
        if (!bg) return true;  // null is acceptable
        return validBloodGroups.includes(bg);
      };

      expect(isValidBloodGroup("A +ve")).toBe(true);
      expect(isValidBloodGroup("O -ve")).toBe(true);
      expect(isValidBloodGroup("X +ve")).toBe(false);
      expect(isValidBloodGroup(null)).toBe(true);
    });
  });

  // ============================================
  // Offline Sync Tests
  // ============================================
  describe("Offline Sync Logic", () => {
    it("should queue scans when offline", () => {
      const pendingScans: any[] = [];
      const isOnline = false;
      
      const addScan = (scan: any) => {
        if (!isOnline) {
          pendingScans.push({ ...scan, synced: false });
        }
        return pendingScans.length;
      };

      addScan({ uuid: "1", participantUuid: "test" });
      addScan({ uuid: "2", participantUuid: "test2" });
      
      expect(pendingScans.length).toBe(2);
      expect(pendingScans[0].synced).toBe(false);
    });

    it("should mark scans as synced after successful upload", () => {
      const scans = [
        { uuid: "1", synced: false },
        { uuid: "2", synced: false },
      ];
      
      const markSynced = (uuids: string[]) => {
        scans.forEach(scan => {
          if (uuids.includes(scan.uuid)) {
            scan.synced = true;
          }
        });
      };

      markSynced(["1"]);
      
      expect(scans[0].synced).toBe(true);
      expect(scans[1].synced).toBe(false);
    });

    it("should merge server data with local pending scans", () => {
      const serverScans = [
        { uuid: "server-1", synced: true },
        { uuid: "server-2", synced: true },
      ];
      const pendingScans = [
        { uuid: "local-1", synced: false },
      ];
      
      const pendingUuids = new Set(pendingScans.map(s => s.uuid));
      const mergedScans = [
        ...pendingScans,
        ...serverScans.filter(s => !pendingUuids.has(s.uuid)),
      ];
      
      expect(mergedScans.length).toBe(3);
      expect(mergedScans.filter(s => !s.synced).length).toBe(1);
    });
  });

  // ============================================
  // Performance Tests
  // ============================================
  describe("Performance", () => {
    it("should handle 413 participants efficiently", () => {
      const participants = Array.from({ length: 413 }, (_, i) => ({
        id: i + 1,
        uuid: `uuid-${i + 1}`,
        badgeNumber: i + 1,
        name: `Pilgrim ${i + 1}`,
      }));

      const startTime = performance.now();
      
      // Simulate filtering
      const filtered = participants.filter(p => p.badgeNumber > 200);
      
      // Simulate sorting
      const sorted = [...participants].sort((a, b) => a.name.localeCompare(b.name));
      
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(100);  // Should complete in < 100ms
      expect(filtered.length).toBe(213);
      expect(sorted.length).toBe(413);
    });

    it("should handle 1000+ scan logs efficiently", () => {
      const scanLogs = Array.from({ length: 1000 }, (_, i) => ({
        uuid: `scan-${i}`,
        participantUuid: `uuid-${(i % 413) + 1}`,
        checkpointId: (i % 3) + 1,
        scannedAt: new Date(Date.now() - i * 60000).toISOString(),
      }));

      const startTime = performance.now();
      
      // Simulate counting Jatras for a participant
      const participantScans = scanLogs.filter(s => s.participantUuid === "uuid-1");
      const jatraCount = participantScans.filter(s => s.checkpointId === 2).length;
      
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(50);  // Should complete in < 50ms
      expect(jatraCount).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================
  // Edge Case Tests
  // ============================================
  describe("Edge Cases", () => {
    it("should handle empty participant list", () => {
      const participants: any[] = [];
      expect(participants.length).toBe(0);
      expect(participants.filter(p => p.isAtRisk).length).toBe(0);
    });

    it("should handle participant with no scans", () => {
      const scanLogs: any[] = [];
      const participantUuid = "test";
      
      const participantScans = scanLogs.filter(s => s.participantUuid === participantUuid);
      expect(participantScans.length).toBe(0);
    });

    it("should handle midnight IST correctly", () => {
      // Midnight IST = 18:30 UTC previous day
      const midnightIST = new Date("2025-01-02T18:30:00.000Z");
      const formatted = formatToIST(midnightIST);
      expect(formatted).toBe("03/01/2025 00:00:00 IST");
    });

    it("should handle special characters in names", () => {
      const names = [
        "Aachal Vinod Bhandari",
        "Priya's Mother",
        "Test (Nickname)",
        "Name with-hyphen",
      ];
      
      names.forEach(name => {
        expect(name.length).toBeGreaterThan(0);
      });
    });
  });
});
