import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import type { LocalScanLog, Participant } from "@/types";
import { formatToIST, calculateDurationMinutes } from "@/types";
import { CHECKPOINTS, JATRA_COMPLETION_CHECKPOINT, DESCENT_START_CHECKPOINT } from "@/constants/checkpoints";

export interface DailySummaryData {
  date: Date;
  totalScans: number;
  totalJatras: number;
  averageDuration: number | null;
  checkpointBreakdown: {
    checkpointName: string;
    scanCount: number;
  }[];
  jatraCompletions: {
    badgeNumber: number;
    pilgrimName: string;
    jatraNumber: number;
    duration: number;
    completedAt: string;
  }[];
  topPerformers: {
    badgeNumber: number;
    pilgrimName: string;
    totalJatras: number;
  }[];
}

/**
 * Generate daily summary data from scan logs
 */
export function generateDailySummaryData(
  scanLogs: LocalScanLog[],
  participants: Participant[],
  targetDate: Date
): DailySummaryData {
  // Filter scans for target date
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  const dailyScans = scanLogs.filter(log => {
    const scanDate = new Date(log.scannedAt);
    return scanDate >= startOfDay && scanDate <= endOfDay;
  });

  // Calculate checkpoint breakdown
  const checkpointBreakdown = CHECKPOINTS.map(cp => ({
    checkpointName: cp.name,
    scanCount: dailyScans.filter(s => s.checkpointId === cp.id).length,
  }));

  // Calculate Jatra completions with durations
  const jatraScans = dailyScans.filter(s => s.checkpointId === JATRA_COMPLETION_CHECKPOINT);
  const jatraCompletions: DailySummaryData["jatraCompletions"] = [];
  const durations: number[] = [];

  jatraScans.forEach(jatraScan => {
    const participant = participants.find(p => p.uuid === jatraScan.participantUuid);
    if (!participant) return;

    // Find corresponding Motisha Tuk scan
    const motishaScan = [...dailyScans]
      .reverse()
      .find(s => 
        s.participantUuid === jatraScan.participantUuid &&
        s.checkpointId === DESCENT_START_CHECKPOINT &&
        new Date(s.scannedAt) < new Date(jatraScan.scannedAt)
      );

    if (motishaScan) {
      const duration = calculateDurationMinutes(
        new Date(motishaScan.scannedAt),
        new Date(jatraScan.scannedAt)
      );
      durations.push(duration);

      // Calculate Jatra number for this participant
      const participantJatras = scanLogs.filter(
        s => s.participantUuid === jatraScan.participantUuid &&
        s.checkpointId === JATRA_COMPLETION_CHECKPOINT &&
        new Date(s.scannedAt) <= new Date(jatraScan.scannedAt)
      );

      jatraCompletions.push({
        badgeNumber: participant.id,
        pilgrimName: participant.name,
        jatraNumber: participantJatras.length,
        duration,
        completedAt: formatToIST(new Date(jatraScan.scannedAt)),
      });
    }
  });

  // Calculate average duration
  const averageDuration = durations.length > 0
    ? Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length)
    : null;

  // Calculate top performers (most Jatras completed)
  const participantJatraCounts = new Map<string, number>();
  scanLogs
    .filter(s => s.checkpointId === JATRA_COMPLETION_CHECKPOINT)
    .forEach(s => {
      const count = participantJatraCounts.get(s.participantUuid) || 0;
      participantJatraCounts.set(s.participantUuid, count + 1);
    });

  const topPerformers = Array.from(participantJatraCounts.entries())
    .map(([uuid, count]) => {
      const participant = participants.find(p => p.uuid === uuid);
      return participant ? {
        badgeNumber: participant.id,
        pilgrimName: participant.name,
        totalJatras: count,
      } : null;
    })
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .sort((a, b) => b.totalJatras - a.totalJatras)
    .slice(0, 10);

  return {
    date: targetDate,
    totalScans: dailyScans.length,
    totalJatras: jatraScans.length,
    averageDuration,
    checkpointBreakdown,
    jatraCompletions,
    topPerformers,
  };
}

/**
 * Generate HTML content for the PDF report
 */
function generateReportHTML(data: DailySummaryData): string {
  const dateStr = data.date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 40px;
      background: #fff;
      color: #1a1a1a;
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
      border-bottom: 3px solid #ff6b35;
      padding-bottom: 20px;
    }
    h1 {
      font-size: 32px;
      color: #ff6b35;
      margin-bottom: 8px;
    }
    .subtitle {
      font-size: 18px;
      color: #666;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 40px;
    }
    .stat-card {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #ff6b35;
    }
    .stat-value {
      font-size: 36px;
      font-weight: bold;
      color: #ff6b35;
      margin-bottom: 4px;
    }
    .stat-label {
      font-size: 14px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .section {
      margin-bottom: 40px;
    }
    h2 {
      font-size: 24px;
      margin-bottom: 20px;
      color: #1a1a1a;
      border-bottom: 2px solid #e0e0e0;
      padding-bottom: 10px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e0e0e0;
    }
    th {
      background: #f8f9fa;
      font-weight: 600;
      color: #1a1a1a;
    }
    tr:hover {
      background: #f8f9fa;
    }
    .footer {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 2px solid #e0e0e0;
      text-align: center;
      color: #666;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 Palitana Yatra Daily Report</h1>
    <p class="subtitle">${dateStr}</p>
  </div>

  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-value">${data.totalScans}</div>
      <div class="stat-label">Total Scans</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${data.totalJatras}</div>
      <div class="stat-label">Jatras Completed</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${data.averageDuration !== null ? `${data.averageDuration} min` : "N/A"}</div>
      <div class="stat-label">Avg Duration</div>
    </div>
  </div>

  <div class="section">
    <h2>Checkpoint Activity</h2>
    <table>
      <thead>
        <tr>
          <th>Checkpoint</th>
          <th>Scan Count</th>
        </tr>
      </thead>
      <tbody>
        ${data.checkpointBreakdown.map(cp => `
          <tr>
            <td>${cp.checkpointName}</td>
            <td>${cp.scanCount}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  </div>

  ${data.jatraCompletions.length > 0 ? `
  <div class="section">
    <h2>Jatra Completions (${data.jatraCompletions.length})</h2>
    <table>
      <thead>
        <tr>
          <th>Badge</th>
          <th>Pilgrim Name</th>
          <th>Jatra #</th>
          <th>Duration (min)</th>
          <th>Completed At</th>
        </tr>
      </thead>
      <tbody>
        ${data.jatraCompletions.map(j => `
          <tr>
            <td>#${j.badgeNumber}</td>
            <td>${j.pilgrimName}</td>
            <td>${j.jatraNumber}</td>
            <td>${j.duration}</td>
            <td>${j.completedAt}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  </div>
  ` : ""}

  ${data.topPerformers.length > 0 ? `
  <div class="section">
    <h2>Top Performers (All Time)</h2>
    <table>
      <thead>
        <tr>
          <th>Rank</th>
          <th>Badge</th>
          <th>Pilgrim Name</th>
          <th>Total Jatras</th>
        </tr>
      </thead>
      <tbody>
        ${data.topPerformers.map((p, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td>#${p.badgeNumber}</td>
            <td>${p.pilgrimName}</td>
            <td>${p.totalJatras}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  </div>
  ` : ""}

  <div class="footer">
    <p>Generated on ${formatToIST(new Date())}</p>
    <p>Palitana Yatra Tracker © 2026</p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate and export daily summary PDF report
 */
export async function exportDailySummaryPDF(
  scanLogs: LocalScanLog[],
  participants: Participant[],
  targetDate: Date = new Date()
): Promise<{ success: boolean; message: string; filePath?: string }> {
  try {
    // Generate summary data
    const summaryData = generateDailySummaryData(scanLogs, participants, targetDate);

    // Generate HTML
    const html = generateReportHTML(summaryData);

    // Create filename
    const dateStr = targetDate.toISOString().split("T")[0];
    const fileName = `palitana_report_${dateStr}.html`;
    const filePath = `${FileSystem.documentDirectory}${fileName}`;

    // Write HTML file
    await FileSystem.writeAsStringAsync(filePath, html, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    // Share the file
    if (Platform.OS !== "web") {
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(filePath, {
          mimeType: "text/html",
          dialogTitle: "Export Daily Report",
        });
      }
    }

    return {
      success: true,
      message: "Report generated successfully",
      filePath,
    };
  } catch (error) {
    console.error("Failed to generate report:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to generate report",
    };
  }
}
