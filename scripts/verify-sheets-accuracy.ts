import { google } from "googleapis";

const SPREADSHEET_ID = "1BYVEW7FDb9Q2UW1aEvrYJUwPxB5XP94YAGkzpy_eJt4";
const SCAN_LOGS_SHEET = "ScanLogs";
const JATRA_COMPLETIONS_SHEET = "JatraCompletions";

async function verifyAccuracy() {
  console.log("🔍 Verifying Google Sheets Data Accuracy...\n");

  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || "{}");
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  // Check ScanLogs
  console.log("📋 ScanLogs Sheet:");
  console.log("==================");
  const scanLogsResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SCAN_LOGS_SHEET}!A1:E100`,
  });

  const scanLogsData = scanLogsResponse.data.values || [];
  console.log("Headers:", scanLogsData[0]);
  console.log("Expected: ['Day', 'Time', 'Badge Number', 'Yatri Name', 'Checkpoint Name']");
  console.log("\nData rows:");
  for (let i = 1; i < scanLogsData.length; i++) {
    const row = scanLogsData[i];
    console.log(`Row ${i}:`);
    console.log(`  Day: ${row[0]}`);
    console.log(`  Time: ${row[1]}`);
    console.log(`  Badge Number: ${row[2]}`);
    console.log(`  Yatri Name: ${row[3]}`);
    console.log(`  Checkpoint Name: ${row[4]}`);
    console.log();
  }

  // Check JatraCompletions
  console.log("\n📋 JatraCompletions Sheet:");
  console.log("==========================");
  const jatraResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${JATRA_COMPLETIONS_SHEET}!A1:G100`,
  });

  const jatraData = jatraResponse.data.values || [];
  console.log("Headers:", jatraData[0]);
  console.log("Expected: ['Day', 'Badge Number', 'Yatri Name', 'Jatra Number', 'Start Time', 'End Time', 'Duration (mins)']");
  console.log("\nData rows:");
  for (let i = 1; i < jatraData.length; i++) {
    const row = jatraData[i];
    console.log(`Row ${i}:`);
    console.log(`  Day: ${row[0]}`);
    console.log(`  Badge Number: ${row[1]}`);
    console.log(`  Yatri Name: ${row[2]}`);
    console.log(`  Jatra Number: ${row[3]}`);
    console.log(`  Start Time: ${row[4]}`);
    console.log(`  End Time: ${row[5]}`);
    console.log(`  Duration (mins): ${row[6]}`);
    console.log();
  }

  console.log("✅ Verification complete!");
}

verifyAccuracy().catch(console.error);
