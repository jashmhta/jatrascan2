import { describe, it, expect } from "vitest";

// Jatra calculation logic
// A Jatra is completed when a pilgrim visits checkpoint 2 (Gheti) after visiting checkpoint 1 (Aamli)
// The sequence must be: Aamli (1) -> Gheti (2) for a complete Jatra

interface ScanLog {
  checkpointId: number;
  scannedAt: Date;
}

function calculateJatras(scanLogs: ScanLog[]): number {
  // Sort scans by time
  const sortedScans = [...scanLogs].sort(
    (a, b) => a.scannedAt.getTime() - b.scannedAt.getTime()
  );

  let jatras = 0;
  let lastAamliTime: Date | null = null;

  for (const scan of sortedScans) {
    if (scan.checkpointId === 1) {
      // Aamli checkpoint
      lastAamliTime = scan.scannedAt;
    } else if (scan.checkpointId === 2 && lastAamliTime) {
      // Gheti checkpoint - completes a jatra if we have a previous Aamli
      jatras++;
      lastAamliTime = null; // Reset for next jatra
    }
  }

  return jatras;
}

function isDuplicateScan(
  existingScans: ScanLog[],
  newCheckpointId: number,
  newScannedAt: Date,
  thresholdMinutes: number = 10
): boolean {
  const thresholdMs = thresholdMinutes * 60 * 1000;
  
  return existingScans.some(scan => {
    if (scan.checkpointId !== newCheckpointId) return false;
    const timeDiff = Math.abs(newScannedAt.getTime() - scan.scannedAt.getTime());
    return timeDiff < thresholdMs;
  });
}

function getQRToken(badgeNumber: number): string {
  return `PALITANA_YATRA_${badgeNumber}`;
}

function parseBadgeFromQRToken(qrToken: string): number | null {
  const prefix = "PALITANA_YATRA_";
  if (!qrToken.startsWith(prefix)) return null;
  const badgeStr = qrToken.substring(prefix.length);
  const badge = parseInt(badgeStr, 10);
  return isNaN(badge) ? null : badge;
}

describe("Jatra Calculator", () => {
  it("should return 0 jatras for empty scan logs", () => {
    expect(calculateJatras([])).toBe(0);
  });

  it("should return 0 jatras for only Aamli scans", () => {
    const scans: ScanLog[] = [
      { checkpointId: 1, scannedAt: new Date("2026-01-02T08:00:00") },
      { checkpointId: 1, scannedAt: new Date("2026-01-02T10:00:00") },
    ];
    expect(calculateJatras(scans)).toBe(0);
  });

  it("should return 0 jatras for only Gheti scans without prior Aamli", () => {
    const scans: ScanLog[] = [
      { checkpointId: 2, scannedAt: new Date("2026-01-02T08:00:00") },
    ];
    expect(calculateJatras(scans)).toBe(0);
  });

  it("should return 1 jatra for Aamli -> Gheti sequence", () => {
    const scans: ScanLog[] = [
      { checkpointId: 1, scannedAt: new Date("2026-01-02T06:00:00") },
      { checkpointId: 2, scannedAt: new Date("2026-01-02T08:00:00") },
    ];
    expect(calculateJatras(scans)).toBe(1);
  });

  it("should return 2 jatras for two complete sequences", () => {
    const scans: ScanLog[] = [
      { checkpointId: 1, scannedAt: new Date("2026-01-02T06:00:00") },
      { checkpointId: 2, scannedAt: new Date("2026-01-02T08:00:00") },
      { checkpointId: 1, scannedAt: new Date("2026-01-02T10:00:00") },
      { checkpointId: 2, scannedAt: new Date("2026-01-02T12:00:00") },
    ];
    expect(calculateJatras(scans)).toBe(2);
  });

  it("should handle out-of-order scans correctly", () => {
    const scans: ScanLog[] = [
      { checkpointId: 2, scannedAt: new Date("2026-01-02T08:00:00") },
      { checkpointId: 1, scannedAt: new Date("2026-01-02T06:00:00") },
    ];
    expect(calculateJatras(scans)).toBe(1);
  });

  it("should not count X checkpoint (3) in jatra calculation", () => {
    const scans: ScanLog[] = [
      { checkpointId: 1, scannedAt: new Date("2026-01-02T06:00:00") },
      { checkpointId: 3, scannedAt: new Date("2026-01-02T07:00:00") },
      { checkpointId: 2, scannedAt: new Date("2026-01-02T08:00:00") },
    ];
    expect(calculateJatras(scans)).toBe(1);
  });
});

describe("Duplicate Scan Detection", () => {
  it("should detect duplicate scan within threshold", () => {
    const existingScans: ScanLog[] = [
      { checkpointId: 1, scannedAt: new Date("2026-01-02T08:00:00") },
    ];
    const newScannedAt = new Date("2026-01-02T08:05:00"); // 5 minutes later
    
    expect(isDuplicateScan(existingScans, 1, newScannedAt, 10)).toBe(true);
  });

  it("should not detect duplicate if beyond threshold", () => {
    const existingScans: ScanLog[] = [
      { checkpointId: 1, scannedAt: new Date("2026-01-02T08:00:00") },
    ];
    const newScannedAt = new Date("2026-01-02T08:15:00"); // 15 minutes later
    
    expect(isDuplicateScan(existingScans, 1, newScannedAt, 10)).toBe(false);
  });

  it("should not detect duplicate for different checkpoint", () => {
    const existingScans: ScanLog[] = [
      { checkpointId: 1, scannedAt: new Date("2026-01-02T08:00:00") },
    ];
    const newScannedAt = new Date("2026-01-02T08:05:00");
    
    expect(isDuplicateScan(existingScans, 2, newScannedAt, 10)).toBe(false);
  });

  it("should handle empty existing scans", () => {
    expect(isDuplicateScan([], 1, new Date(), 10)).toBe(false);
  });
});

describe("QR Token Functions", () => {
  it("should generate correct QR token from badge number", () => {
    expect(getQRToken(1)).toBe("PALITANA_YATRA_1");
    expect(getQRToken(100)).toBe("PALITANA_YATRA_100");
    expect(getQRToken(417)).toBe("PALITANA_YATRA_417");
  });

  it("should parse badge number from valid QR token", () => {
    expect(parseBadgeFromQRToken("PALITANA_YATRA_1")).toBe(1);
    expect(parseBadgeFromQRToken("PALITANA_YATRA_100")).toBe(100);
    expect(parseBadgeFromQRToken("PALITANA_YATRA_417")).toBe(417);
  });

  it("should return null for invalid QR token prefix", () => {
    expect(parseBadgeFromQRToken("INVALID_1")).toBe(null);
    expect(parseBadgeFromQRToken("YATRA_100")).toBe(null);
  });

  it("should return null for non-numeric badge", () => {
    expect(parseBadgeFromQRToken("PALITANA_YATRA_abc")).toBe(null);
    expect(parseBadgeFromQRToken("PALITANA_YATRA_")).toBe(null);
  });

  it("should handle round-trip conversion", () => {
    for (const badge of [1, 50, 100, 200, 413, 417]) {
      const token = getQRToken(badge);
      const parsed = parseBadgeFromQRToken(token);
      expect(parsed).toBe(badge);
    }
  });
});
