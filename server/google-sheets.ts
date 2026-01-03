import { google, sheets_v4 } from "googleapis";

// Google Sheets configuration
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID || "1BYVEW7FDb9Q2UW1aEvrYJUwPxB5XP94YAGkzpy_eJt4";
const SCAN_LOGS_SHEET = "ScanLogs";
const JATRA_COMPLETIONS_SHEET = "JatraCompletions";
const PILGRIM_STATUS_SHEET = "PilgrimStatus";
const SAFETY_ALERTS_SHEET = "SafetyAlerts";

// IST timezone offset (UTC+5:30)
const IST_OFFSET = 5.5 * 60 * 60 * 1000;

// Format date to IST string
function formatToIST(date: Date): string {
  const istDate = new Date(date.getTime() + IST_OFFSET);
  const day = istDate.getUTCDate().toString().padStart(2, '0');
  const month = (istDate.getUTCMonth() + 1).toString().padStart(2, '0');
  const year = istDate.getUTCFullYear();
  const hours = istDate.getUTCHours().toString().padStart(2, '0');
  const minutes = istDate.getUTCMinutes().toString().padStart(2, '0');
  const seconds = istDate.getUTCSeconds().toString().padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds} IST`;
}

// Get day name in IST
function getDayInIST(date: Date): string {
  const istDate = new Date(date.getTime() + IST_OFFSET);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[istDate.getUTCDay()];
}

// Service account credentials from environment
let sheetsClient: sheets_v4.Sheets | null = null;

async function getGoogleSheetsClient(): Promise<sheets_v4.Sheets | null> {
  if (sheetsClient) return sheetsClient;

  try {
    const credentials = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (!credentials) {
      console.warn("[Google Sheets] No service account credentials found");
      return null;
    }

    const serviceAccount = JSON.parse(credentials);
    
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    sheetsClient = google.sheets({ version: "v4", auth });
    return sheetsClient;
  } catch (error) {
    console.error("[Google Sheets] Failed to initialize client:", error);
    return null;
  }
}

// Ensure sheets exist with proper headers
async function ensureSheetsExist(): Promise<boolean> {
  const sheets = await getGoogleSheetsClient();
  if (!sheets) return false;

  try {
    // Get existing sheets
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });

    const existingSheets = spreadsheet.data.sheets?.map(s => s.properties?.title) || [];

    // Create ScanLogs sheet if not exists
    if (!existingSheets.includes(SCAN_LOGS_SHEET)) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [{
            addSheet: {
              properties: { title: SCAN_LOGS_SHEET },
            },
          }],
        },
      });

      // Add headers matching Google Sheet format
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SCAN_LOGS_SHEET}!A1:E1`,
        valueInputOption: "RAW",
        requestBody: {
          values: [[
            "Day",
            "Time",
            "Badge Number",
            "Yatri Name",
            "Checkpoint Name"
          ]],
        },
      });
    }

    // Create JatraCompletions sheet if not exists
    if (!existingSheets.includes(JATRA_COMPLETIONS_SHEET)) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [{
            addSheet: {
              properties: { title: JATRA_COMPLETIONS_SHEET },
            },
          }],
        },
      });

      // Add headers matching Google Sheet format
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${JATRA_COMPLETIONS_SHEET}!A1:G1`,
        valueInputOption: "RAW",
        requestBody: {
          values: [[
            "Day",
            "Badge Number",
            "Yatri Name",
            "Jatra Number",
            "Start Time",
            "End Time",
            "Duration (mins)"
          ]],
        },
      });
    }

    // Create PilgrimStatus sheet if not exists
    if (!existingSheets.includes(PILGRIM_STATUS_SHEET)) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [{
            addSheet: {
              properties: { title: PILGRIM_STATUS_SHEET },
            },
          }],
        },
      });

      // Add headers
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${PILGRIM_STATUS_SHEET}!A1:L1`,
        valueInputOption: "RAW",
        requestBody: {
          values: [[
            "Badge Number", 
            "Pilgrim Name", 
            "Age",
            "Blood Group",
            "Emergency Contact",
            "Self Contact",
            "Total Jatras",
            "Last Checkpoint",
            "Last Scan Time (IST)",
            "Status",
            "Minutes Since Last Scan",
            "Updated At (IST)"
          ]],
        },
      });
    }

    // Create SafetyAlerts sheet if not exists
    if (!existingSheets.includes(SAFETY_ALERTS_SHEET)) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [{
            addSheet: {
              properties: { title: SAFETY_ALERTS_SHEET },
            },
          }],
        },
      });

      // Add headers
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SAFETY_ALERTS_SHEET}!A1:I1`,
        valueInputOption: "RAW",
        requestBody: {
          values: [[
            "Alert Time (IST)", 
            "Badge Number", 
            "Pilgrim Name", 
            "Emergency Contact",
            "Last Checkpoint",
            "Last Scan Time (IST)",
            "Hours Overdue",
            "Alert Type",
            "Resolved"
          ]],
        },
      });
    }

    return true;
  } catch (error) {
    console.error("[Google Sheets] Failed to ensure sheets exist:", error);
    return false;
  }
}

// Format duration in human-readable format
function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

// Retry helper with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`[Retry] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error("Max retries exceeded");
}

// Log a scan to Google Sheets with retry mechanism
export async function logScanToSheets(scan: {
  scannedAt: Date;
  badgeNumber: number;
  pilgrimName: string;
  checkpoint: string;
  bloodGroup?: string;
  emergencyContact?: string;
  deviceId?: string;
  volunteerId?: string;
  uuid: string;
}): Promise<boolean> {
  const sheets = await getGoogleSheetsClient();
  if (!sheets) return false;

  try {
    await ensureSheetsExist();

    const day = getDayInIST(scan.scannedAt);
    const time = formatToIST(scan.scannedAt);
    
    // Retry with exponential backoff (3 attempts, 1s, 2s, 4s delays)
    await retryWithBackoff(async () => {
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SCAN_LOGS_SHEET}!A:E`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [[
            day,
            time,
            scan.badgeNumber,
            scan.pilgrimName,
            scan.checkpoint,
          ]],
        },
      });
    });

    console.log(`[Google Sheets] ✓ Scan logged: Badge #${scan.badgeNumber} at ${scan.checkpoint}`);
    return true;
  } catch (error) {
    console.error("[CRITICAL] Failed to log scan after retries:", error);
    return false;
  }
}

// Log multiple scans to Google Sheets (batch)
export async function logScansToSheets(scans: Array<{
  scannedAt: Date;
  badgeNumber: number;
  pilgrimName: string;
  checkpoint: string;
  bloodGroup?: string;
  emergencyContact?: string;
  deviceId?: string;
  volunteerId?: string;
  uuid: string;
}>): Promise<{ success: number; failed: number }> {
  const sheets = await getGoogleSheetsClient();
  if (!sheets) return { success: 0, failed: scans.length };

  try {
    await ensureSheetsExist();

    const values = scans.map(scan => {
      const day = getDayInIST(scan.scannedAt);
      const time = formatToIST(scan.scannedAt);
      return [
        day,
        time,
        scan.badgeNumber,
        scan.pilgrimName,
        scan.checkpoint,
      ];
    });

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SCAN_LOGS_SHEET}!A:E`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values },
    });

    return { success: scans.length, failed: 0 };
  } catch (error) {
    console.error("[Google Sheets] Failed to log scans:", error);
    return { success: 0, failed: scans.length };
  }
}

// Log a Jatra completion to Google Sheets
export async function logJatraToSheets(jatra: {
  completedAt: Date;
  badgeNumber: number;
  pilgrimName: string;
  jatraNumber: number;
  startTime?: Date;
  endTime?: Date;
  durationMinutes?: number;
}): Promise<boolean> {
  const sheets = await getGoogleSheetsClient();
  if (!sheets) return false;

  try {
    await ensureSheetsExist();

    const day = getDayInIST(jatra.endTime || new Date());
    
    // Retry with exponential backoff (3 attempts, 1s, 2s, 4s delays)
    await retryWithBackoff(async () => {
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${JATRA_COMPLETIONS_SHEET}!A:G`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [[
            day,
            jatra.badgeNumber,
            jatra.pilgrimName,
            jatra.jatraNumber,
            jatra.startTime ? formatToIST(jatra.startTime) : "",
            jatra.endTime ? formatToIST(jatra.endTime) : "",
            jatra.durationMinutes || "",
          ]],
        },
      });
    });

    console.log(`[Google Sheets] ✓ Jatra logged: Badge #${jatra.badgeNumber} - Jatra ${jatra.jatraNumber} (${jatra.durationMinutes}min)`);
    return true;
  } catch (error) {
    console.error("[CRITICAL] Failed to log Jatra after retries:", error);
    return false;
  }
}

// Update pilgrim status in Google Sheets
export async function updatePilgrimStatus(pilgrim: {
  badgeNumber: number;
  name: string;
  age?: number;
  bloodGroup?: string;
  emergencyContact?: string;
  selfContact?: string;
  totalJatras: number;
  lastCheckpoint?: string;
  lastScanTime?: Date;
  status: "safe" | "at-risk" | "completed";
  minutesSinceLastScan?: number;
}): Promise<boolean> {
  const sheets = await getGoogleSheetsClient();
  if (!sheets) return false;

  try {
    await ensureSheetsExist();

    const now = new Date();
    
    // First, try to find existing row for this pilgrim
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${PILGRIM_STATUS_SHEET}!A:A`,
    });

    const rows = response.data.values || [];
    let rowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      if (parseInt(rows[i][0], 10) === pilgrim.badgeNumber) {
        rowIndex = i + 1; // 1-indexed
        break;
      }
    }

    const rowData = [
      pilgrim.badgeNumber,
      pilgrim.name,
      pilgrim.age || "",
      pilgrim.bloodGroup || "",
      pilgrim.emergencyContact || "",
      pilgrim.selfContact || "",
      pilgrim.totalJatras,
      pilgrim.lastCheckpoint || "",
      pilgrim.lastScanTime ? formatToIST(pilgrim.lastScanTime) : "",
      pilgrim.status.toUpperCase(),
      pilgrim.minutesSinceLastScan || "",
      formatToIST(now),
    ];

    if (rowIndex > 0) {
      // Update existing row
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${PILGRIM_STATUS_SHEET}!A${rowIndex}:L${rowIndex}`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [rowData] },
      });
    } else {
      // Append new row
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${PILGRIM_STATUS_SHEET}!A:L`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [rowData] },
      });
    }

    return true;
  } catch (error) {
    console.error("[Google Sheets] Failed to update pilgrim status:", error);
    return false;
  }
}

// Log safety alert to Google Sheets
export async function logSafetyAlert(alert: {
  badgeNumber: number;
  pilgrimName: string;
  emergencyContact?: string;
  lastCheckpoint?: string;
  lastScanTime?: Date;
  hoursOverdue: number;
  alertType: "6_HOUR_WARNING" | "MISSING" | "RESOLVED";
}): Promise<boolean> {
  const sheets = await getGoogleSheetsClient();
  if (!sheets) return false;

  try {
    await ensureSheetsExist();

    const now = new Date();
    
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SAFETY_ALERTS_SHEET}!A:I`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[
          formatToIST(now),
          alert.badgeNumber,
          alert.pilgrimName,
          alert.emergencyContact || "",
          alert.lastCheckpoint || "",
          alert.lastScanTime ? formatToIST(alert.lastScanTime) : "",
          alert.hoursOverdue.toFixed(1),
          alert.alertType,
          alert.alertType === "RESOLVED" ? "YES" : "NO",
        ]],
      },
    });

    return true;
  } catch (error) {
    console.error("[Google Sheets] Failed to log safety alert:", error);
    return false;
  }
}

// Get all scan logs from Google Sheets
export async function getScanLogsFromSheets(): Promise<Array<{
  timestamp: string;
  badgeNumber: number;
  pilgrimName: string;
  checkpoint: string;
  deviceId: string;
  uuid: string;
}>> {
  const sheets = await getGoogleSheetsClient();
  if (!sheets) return [];

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SCAN_LOGS_SHEET}!A2:K`,
    });

    const rows = response.data.values || [];
    return rows.map(row => ({
      timestamp: row[0] || "",
      badgeNumber: parseInt(row[1], 10) || 0,
      pilgrimName: row[2] || "",
      checkpoint: row[3] || "",
      deviceId: row[6] || "",
      uuid: row[8] || "",
    }));
  } catch (error) {
    console.error("[Google Sheets] Failed to get scan logs:", error);
    return [];
  }
}

// Test connection to Google Sheets
export async function testGoogleSheetsConnection(): Promise<{ success: boolean; message: string }> {
  const sheets = await getGoogleSheetsClient();
  if (!sheets) {
    return { success: false, message: "No Google Sheets credentials configured" };
  }

  try {
    const response = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });

    return { 
      success: true, 
      message: `Connected to spreadsheet: ${response.data.properties?.title}` 
    };
  } catch (error: any) {
    return { 
      success: false, 
      message: `Failed to connect: ${error.message}` 
    };
  }
}

// Sync all pilgrim statuses to Google Sheets
export async function syncAllPilgrimStatuses(pilgrims: Array<{
  badgeNumber: number;
  name: string;
  age?: number;
  bloodGroup?: string;
  emergencyContact?: string;
  selfContact?: string;
  totalJatras: number;
  lastCheckpoint?: string;
  lastScanTime?: Date;
  status: "safe" | "at-risk" | "completed";
  minutesSinceLastScan?: number;
}>): Promise<{ success: number; failed: number }> {
  const sheets = await getGoogleSheetsClient();
  if (!sheets) return { success: 0, failed: pilgrims.length };

  try {
    await ensureSheetsExist();

    const now = new Date();
    
    // Clear existing data (except header)
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: `${PILGRIM_STATUS_SHEET}!A2:L`,
    });

    // Prepare all rows
    const values = pilgrims.map(pilgrim => [
      pilgrim.badgeNumber,
      pilgrim.name,
      pilgrim.age || "",
      pilgrim.bloodGroup || "",
      pilgrim.emergencyContact || "",
      pilgrim.selfContact || "",
      pilgrim.totalJatras,
      pilgrim.lastCheckpoint || "",
      pilgrim.lastScanTime ? formatToIST(pilgrim.lastScanTime) : "",
      pilgrim.status.toUpperCase(),
      pilgrim.minutesSinceLastScan || "",
      formatToIST(now),
    ]);

    // Batch update all rows
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${PILGRIM_STATUS_SHEET}!A2:L${pilgrims.length + 1}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values },
    });

    return { success: pilgrims.length, failed: 0 };
  } catch (error) {
    console.error("[Google Sheets] Failed to sync pilgrim statuses:", error);
    return { success: 0, failed: pilgrims.length };
  }
}

/**
 * Clear all scan logs from Google Sheets (keep header row)
 */
export async function clearAllScanLogs(): Promise<{ success: boolean; message: string }> {
  const sheets = await getGoogleSheetsClient();
  if (!sheets) {
    return { success: false, message: "Google Sheets client not initialized" };
  }

  try {
    // Clear ScanLogs sheet (except header)
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SCAN_LOGS_SHEET}!A2:E`,
    });

    // Clear JatraCompletions sheet (except header)
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: `${JATRA_COMPLETIONS_SHEET}!A2:G`,
    });

    console.log("[Google Sheets] Cleared all scan logs and Jatra completions");
    return { success: true, message: "All scan data cleared from Google Sheets" };
  } catch (error: any) {
    console.error("[Google Sheets] Failed to clear scan logs:", error);
    return { success: false, message: error.message || "Failed to clear data" };
  }
}
