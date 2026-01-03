import { google } from "googleapis";
import * as fs from "fs";

const SPREADSHEET_ID = "1BYVEW7FDb9Q2UW1aEvrYJUwPxB5XP94YAGkzpy_eJt4";
const SCAN_LOGS_SHEET = "ScanLogs";
const JATRA_COMPLETIONS_SHEET = "JatraCompletions";

async function main() {
  try {
    // Load service account credentials
    const credentials = JSON.parse(
      fs.readFileSync("/home/ubuntu/palitana-yatra-tracker/google-service-account.json", "utf8")
    );

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    console.log("✅ Connected to Google Sheets API\n");

    // 1. Get ScanLogs headers
    console.log("📋 ScanLogs Sheet:");
    console.log("==================");
    const scanLogsHeaders = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SCAN_LOGS_SHEET}!A1:Z1`,
    });
    console.log("Headers:", scanLogsHeaders.data.values?.[0]);

    // Get row count
    const scanLogsData = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SCAN_LOGS_SHEET}!A:A`,
    });
    const scanLogsRowCount = (scanLogsData.data.values?.length || 0) - 1; // Exclude header
    console.log(`Total rows (excluding header): ${scanLogsRowCount}\n`);

    // 2. Get JatraCompletions headers
    console.log("📋 JatraCompletions Sheet:");
    console.log("==========================");
    const jatraHeaders = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${JATRA_COMPLETIONS_SHEET}!A1:Z1`,
    });
    console.log("Headers:", jatraHeaders.data.values?.[0]);

    // Get row count
    const jatraData = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${JATRA_COMPLETIONS_SHEET}!A:A`,
    });
    const jatraRowCount = (jatraData.data.values?.length || 0) - 1; // Exclude header
    console.log(`Total rows (excluding header): ${jatraRowCount}\n`);

    // 3. Clear data (keep headers)
    console.log("🗑️  Clearing scan data...");
    
    if (scanLogsRowCount > 0) {
      await sheets.spreadsheets.values.clear({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SCAN_LOGS_SHEET}!A2:Z`,
      });
      console.log(`✅ Cleared ${scanLogsRowCount} rows from ScanLogs`);
    } else {
      console.log("✅ ScanLogs already empty");
    }

    if (jatraRowCount > 0) {
      await sheets.spreadsheets.values.clear({
        spreadsheetId: SPREADSHEET_ID,
        range: `${JATRA_COMPLETIONS_SHEET}!A2:Z`,
      });
      console.log(`✅ Cleared ${jatraRowCount} rows from JatraCompletions`);
    } else {
      console.log("✅ JatraCompletions already empty");
    }

    console.log("\n✅ Done! Headers preserved, data cleared.");

  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

main();
