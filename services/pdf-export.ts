import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import type { Participant, LocalScanLog } from "@/types";
import { CHECKPOINTS, JATRA_COMPLETION_CHECKPOINT, TOTAL_PARTICIPANTS } from "@/constants/checkpoints";

interface ReportData {
  participants: Participant[];
  scanLogs: LocalScanLog[];
  reportType: "scans" | "pilgrims" | "summary" | "full";
  title?: string;
}

// Generate HTML content for PDF
function generateHTMLReport(data: ReportData): string {
  const { participants, scanLogs, reportType, title } = data;
  const reportDate = new Date().toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const checkpointNames: Record<number, string> = {
    1: "Aamli",
    2: "Gheti",
    3: "X",
  };

  // Calculate statistics
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayScans = scanLogs.filter(log => new Date(log.scannedAt) >= today);
  const totalJatras = scanLogs.filter(log => log.checkpointId === JATRA_COMPLETION_CHECKPOINT).length;
  const todayJatras = todayScans.filter(log => log.checkpointId === JATRA_COMPLETION_CHECKPOINT).length;
  const uniquePilgrimsToday = new Set(todayScans.map(log => log.participantUuid)).size;

  const checkpointStats = CHECKPOINTS.map(cp => ({
    ...cp,
    total: scanLogs.filter(log => log.checkpointId === cp.id).length,
    today: todayScans.filter(log => log.checkpointId === cp.id).length,
  }));

  // CSS styles
  const styles = `
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { 
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        color: #333;
        line-height: 1.5;
        padding: 40px;
      }
      .header {
        text-align: center;
        margin-bottom: 30px;
        padding-bottom: 20px;
        border-bottom: 2px solid #FF6B00;
      }
      .header h1 {
        color: #FF6B00;
        font-size: 28px;
        margin-bottom: 8px;
      }
      .header .subtitle {
        color: #666;
        font-size: 14px;
      }
      .section {
        margin-bottom: 30px;
      }
      .section h2 {
        color: #FF6B00;
        font-size: 18px;
        margin-bottom: 15px;
        padding-bottom: 8px;
        border-bottom: 1px solid #eee;
      }
      .stats-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 15px;
        margin-bottom: 20px;
      }
      .stat-card {
        background: #f8f9fa;
        border-radius: 8px;
        padding: 15px;
        text-align: center;
      }
      .stat-value {
        font-size: 28px;
        font-weight: bold;
        color: #FF6B00;
      }
      .stat-label {
        font-size: 12px;
        color: #666;
        margin-top: 4px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 12px;
      }
      th, td {
        padding: 10px 12px;
        text-align: left;
        border-bottom: 1px solid #eee;
      }
      th {
        background: #FF6B00;
        color: white;
        font-weight: 600;
      }
      tr:nth-child(even) {
        background: #f8f9fa;
      }
      .badge {
        display: inline-block;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 500;
      }
      .badge-success { background: #dcfce7; color: #166534; }
      .badge-warning { background: #fef3c7; color: #92400e; }
      .badge-error { background: #fee2e2; color: #991b1b; }
      .footer {
        margin-top: 40px;
        padding-top: 20px;
        border-top: 1px solid #eee;
        text-align: center;
        color: #999;
        font-size: 11px;
      }
      @media print {
        body { padding: 20px; }
        .stats-grid { grid-template-columns: repeat(2, 1fr); }
      }
    </style>
  `;

  let content = "";

  // Summary section (always included)
  if (reportType === "summary" || reportType === "full") {
    content += `
      <div class="section">
        <h2>Summary Statistics</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">${TOTAL_PARTICIPANTS}</div>
            <div class="stat-label">Total Pilgrims</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${scanLogs.length}</div>
            <div class="stat-label">Total Scans</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${totalJatras}</div>
            <div class="stat-label">Total Jatras</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${uniquePilgrimsToday}</div>
            <div class="stat-label">Pilgrims Today</div>
          </div>
        </div>
        
        <h3 style="font-size: 14px; margin-bottom: 10px; color: #666;">Checkpoint Breakdown</h3>
        <table>
          <thead>
            <tr>
              <th>Checkpoint</th>
              <th>Total Scans</th>
              <th>Today</th>
            </tr>
          </thead>
          <tbody>
            ${checkpointStats.map(cp => `
              <tr>
                <td><strong>${cp.name}</strong> - ${cp.description}</td>
                <td>${cp.total}</td>
                <td>${cp.today}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  // Pilgrims section
  if (reportType === "pilgrims" || reportType === "full") {
    const pilgrimData = participants.map(p => {
      const pScans = scanLogs.filter(log => log.participantUuid === p.uuid);
      const jatras = pScans.filter(log => log.checkpointId === JATRA_COMPLETION_CHECKPOINT).length;
      return { ...p, totalScans: pScans.length, jatras };
    }).sort((a, b) => b.jatras - a.jatras);

    content += `
      <div class="section">
        <h2>Pilgrim Summary (${participants.length} pilgrims)</h2>
        <table>
          <thead>
            <tr>
              <th>Badge</th>
              <th>Name</th>
              <th>Age</th>
              <th>Blood</th>
              <th>Scans</th>
              <th>Jatras</th>
            </tr>
          </thead>
          <tbody>
            ${pilgrimData.slice(0, 100).map(p => `
              <tr>
                <td><strong>#${p.badgeNumber}</strong></td>
                <td>${p.name}</td>
                <td>${p.age || "-"}</td>
                <td>${p.bloodGroup || "-"}</td>
                <td>${p.totalScans}</td>
                <td>
                  <span class="badge ${p.jatras >= 7 ? "badge-success" : p.jatras > 0 ? "badge-warning" : ""}">
                    ${p.jatras}
                  </span>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
        ${pilgrimData.length > 100 ? `<p style="margin-top: 10px; color: #666; font-size: 12px;">Showing first 100 of ${pilgrimData.length} pilgrims</p>` : ""}
      </div>
    `;
  }

  // Scans section
  if (reportType === "scans" || reportType === "full") {
    const recentScans = scanLogs.slice(0, 200).map(log => {
      const participant = participants.find(p => p.uuid === log.participantUuid);
      return { ...log, participant };
    });

    content += `
      <div class="section">
        <h2>Recent Scan Logs (${scanLogs.length} total)</h2>
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Badge</th>
              <th>Pilgrim</th>
              <th>Checkpoint</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${recentScans.map(log => `
              <tr>
                <td>${new Date(log.scannedAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}</td>
                <td>#${log.participant?.badgeNumber || "?"}</td>
                <td>${log.participant?.name || "Unknown"}</td>
                <td>${checkpointNames[log.checkpointId] || log.checkpointId}</td>
                <td>
                  <span class="badge ${log.synced ? "badge-success" : "badge-warning"}">
                    ${log.synced ? "Synced" : "Pending"}
                  </span>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
        ${scanLogs.length > 200 ? `<p style="margin-top: 10px; color: #666; font-size: 12px;">Showing first 200 of ${scanLogs.length} scans</p>` : ""}
      </div>
    `;
  }

  const reportTitle = title || `Palitana Yatra ${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${reportTitle}</title>
      ${styles}
    </head>
    <body>
      <div class="header">
        <h1>🙏 Palitana Yatra Tracker</h1>
        <div class="subtitle">${reportTitle} • Generated on ${reportDate}</div>
      </div>
      
      ${content}
      
      <div class="footer">
        <p>Palitana Yatra Tracker • Shatrunjaya Hill Pilgrimage Management</p>
        <p>Report generated automatically • Data may be subject to sync delays</p>
      </div>
    </body>
    </html>
  `;
}

// Export PDF on web (opens print dialog)
async function exportPDFWeb(html: string, filename: string): Promise<void> {
  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  }
}

// Export PDF on native (save and share)
async function exportPDFNative(html: string, filename: string): Promise<void> {
  const fileUri = FileSystem.documentDirectory + filename;
  
  // Save HTML file (can be opened in browser and printed as PDF)
  await FileSystem.writeAsStringAsync(fileUri, html, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(fileUri, {
      mimeType: "text/html",
      dialogTitle: "Export Report",
      UTI: "public.html",
    });
  }
}

// Main export function
export async function exportPDFReport(data: ReportData): Promise<{ success: boolean; error?: string }> {
  try {
    const html = generateHTMLReport(data);
    const filename = `palitana_${data.reportType}_report_${new Date().toISOString().split("T")[0]}.html`;

    if (Platform.OS === "web") {
      await exportPDFWeb(html, filename);
    } else {
      await exportPDFNative(html, filename);
    }

    return { success: true };
  } catch (error) {
    console.error("PDF export error:", error);
    return { success: false, error: String(error) };
  }
}
