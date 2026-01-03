import { logScanToSheets, logJatraToSheets } from "../server/google-sheets";

async function testDirectSync() {
  console.log("🧪 Testing Direct Google Sheets Sync...\n");

  // Test 1: Log a scan
  console.log("📤 Test 1: Logging scan to ScanLogs sheet...");
  try {
    await logScanToSheets({
      badgeNumber: 100,
      pilgrimName: "Test Pilgrim",
      checkpoint: "Motisha Tuk",
      scannedAt: new Date(),
      uuid: `test-scan-${Date.now()}`,
    });
    console.log("✅ Scan logged successfully!\n");
  } catch (error) {
    console.error("❌ Failed to log scan:", error);
    process.exit(1);
  }

  // Test 2: Log a Jatra completion
  console.log("📤 Test 2: Logging Jatra completion to JatraCompletions sheet...");
  try {
    const now = new Date();
    const fifteenMinAgo = new Date(now.getTime() - 15 * 60 * 1000);
    
    await logJatraToSheets({
      badgeNumber: 100,
      pilgrimName: "Test Pilgrim",
      jatraNumber: 1,
      startTime: fifteenMinAgo,
      endTime: now,
      durationMinutes: 15,
    });
    console.log("✅ Jatra completion logged successfully!\n");
  } catch (error) {
    console.error("❌ Failed to log Jatra:", error);
    process.exit(1);
  }

  console.log("🎉 All tests passed!");
  process.exit(0);
}

testDirectSync().catch(console.error);
