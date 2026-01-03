/**
 * Clear all test data from Google Sheets
 * - ScanLogs sheet
 * - JatraCompletions sheet
 * - PilgrimStatus sheet (if exists)
 * - SafetyAlerts sheet (if exists)
 * 
 * Keeps header rows intact
 */

import { GoogleSheetsService } from "../server/google-sheets";

async function main() {
  console.log("🧹 Clearing Google Sheets data...\n");
  
  const sheets = new GoogleSheetsService();
  
  try {
    // Clear ScanLogs (keep header row)
    console.log("Clearing ScanLogs sheet...");
    await sheets.clearSheet("ScanLogs", "A2:Z");
    console.log("✅ ScanLogs cleared\n");
    
    // Clear JatraCompletions (keep header row)
    console.log("Clearing JatraCompletions sheet...");
    await sheets.clearSheet("JatraCompletions", "A2:Z");
    console.log("✅ JatraCompletions cleared\n");
    
    // Try to clear PilgrimStatus if it exists
    try {
      console.log("Clearing PilgrimStatus sheet...");
      await sheets.clearSheet("PilgrimStatus", "A2:Z");
      console.log("✅ PilgrimStatus cleared\n");
    } catch (e) {
      console.log("⚠️  PilgrimStatus sheet not found or already empty\n");
    }
    
    // Try to clear SafetyAlerts if it exists
    try {
      console.log("Clearing SafetyAlerts sheet...");
      await sheets.clearSheet("SafetyAlerts", "A2:Z");
      console.log("✅ SafetyAlerts cleared\n");
    } catch (e) {
      console.log("⚠️  SafetyAlerts sheet not found or already empty\n");
    }
    
    console.log("✅ All Google Sheets data cleared successfully!");
    console.log("\nNote: Header rows are preserved.");
    
  } catch (error) {
    console.error("❌ Error clearing Google Sheets:");
    console.error(error);
    process.exit(1);
  }
}

main();
