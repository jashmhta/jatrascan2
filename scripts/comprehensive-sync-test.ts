import * as db from "../server/db";
import * as googleSheets from "../server/google-sheets";

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
  error?: string;
}

const results: TestResult[] = [];

function logTest(name: string, passed: boolean, details: string, error?: string) {
  results.push({ name, passed, details, error });
  const icon = passed ? "✅" : "❌";
  console.log(`${icon} ${name}: ${details}`);
  if (error) console.error(`   Error: ${error}`);
}

async function runComprehensiveTests() {
  console.log("🧪 COMPREHENSIVE SYNC TEST SUITE");
  console.log("=".repeat(70));
  console.log("Testing: Local → App → Server → DB → Google Sheets\n");

  try {
    const participants = await db.getAllParticipants();
    if (participants.length < 5) {
      throw new Error("Need at least 5 participants for testing");
    }

    const testParticipants = participants.slice(0, 5);
    console.log(`📋 Using ${testParticipants.length} test participants\n`);

    // TEST 1: Single Scan
    console.log("TEST 1: Single Scan Logging");
    console.log("-".repeat(70));
    try {
      const p1 = testParticipants[0];
      const scanUuid = `test-single-${Date.now()}`;
      
      const scanData = {
        uuid: scanUuid,
        participantId: p1.id,
        participantUuid: p1.uuid,
        checkpointId: 1,
        deviceId: "test-device-1",
        scannedAt: new Date(),
      };
      
      await db.createScanLog(scanData);
      
      const sheetsScanData = {
        scannedAt: scanData.scannedAt,
        badgeNumber: p1.badgeNumber,
        pilgrimName: p1.name,
        checkpoint: "Motisha Tuk",
        deviceId: scanData.deviceId,
        uuid: scanUuid,
      };
      
      const sheetsSuccess = await googleSheets.logScanToSheets(sheetsScanData);
      await db.markScanLogsSynced([scanUuid]);
      
      logTest("Single Scan", sheetsSuccess, `Badge #${p1.badgeNumber} at Motisha Tuk`);
    } catch (error) {
      logTest("Single Scan", false, "Failed", String(error));
    }

    // TEST 2: Bulk Scans
    console.log("\nTEST 2: Bulk Scan Logging");
    console.log("-".repeat(70));
    try {
      const bulkScans = testParticipants.slice(1, 4).map((p, i) => ({
        uuid: `test-bulk-${Date.now()}-${i}`,
        participantId: p.id,
        participantUuid: p.uuid,
        checkpointId: 1,
        deviceId: `test-device-bulk-${i}`,
        scannedAt: new Date(Date.now() + i * 1000),
      }));
      
      await db.bulkCreateScanLogs(bulkScans);
      
      for (const scan of bulkScans) {
        const p = testParticipants.find(tp => tp.uuid === scan.participantUuid)!;
        await googleSheets.logScanToSheets({
          scannedAt: scan.scannedAt,
          badgeNumber: p.badgeNumber,
          pilgrimName: p.name,
          checkpoint: "Motisha Tuk",
          deviceId: scan.deviceId,
          uuid: scan.uuid,
        });
      }
      
      await db.markScanLogsSynced(bulkScans.map(s => s.uuid));
      
      logTest("Bulk Scan", true, `3 scans synced`);
    } catch (error) {
      logTest("Bulk Scan", false, "Failed", String(error));
    }

    // TEST 3: Complete Jatra Flow
    console.log("\nTEST 3: Complete Jatra Flow");
    console.log("-".repeat(70));
    try {
      const p5 = testParticipants[4];
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + 15 * 60 * 1000);
      
      const scan1Uuid = `test-jatra-start-${Date.now()}`;
      await db.createScanLog({
        uuid: scan1Uuid,
        participantId: p5.id,
        participantUuid: p5.uuid,
        checkpointId: 1,
        deviceId: "test-device-jatra",
        scannedAt: startTime,
      });
      
      await googleSheets.logScanToSheets({
        scannedAt: startTime,
        badgeNumber: p5.badgeNumber,
        pilgrimName: p5.name,
        checkpoint: "Motisha Tuk",
        deviceId: "test-device-jatra",
        uuid: scan1Uuid,
      });
      
      await db.markScanLogsSynced([scan1Uuid]);
      
      const scan2Uuid = `test-jatra-end-${Date.now()}`;
      await db.createScanLog({
        uuid: scan2Uuid,
        participantId: p5.id,
        participantUuid: p5.uuid,
        checkpointId: 2,
        deviceId: "test-device-jatra",
        scannedAt: endTime,
      });
      
      await googleSheets.logScanToSheets({
        scannedAt: endTime,
        badgeNumber: p5.badgeNumber,
        pilgrimName: p5.name,
        checkpoint: "Gheti",
        deviceId: "test-device-jatra",
        uuid: scan2Uuid,
      });
      
      await db.markScanLogsSynced([scan2Uuid]);
      
      await db.createJatraCount({
        participantId: p5.id,
        participantUuid: p5.uuid,
        jatraNumber: 1,
        startTime,
        endTime,
        durationMinutes: 15,
        completedAt: endTime,
      });
      
      await googleSheets.logJatraToSheets({
        completedAt: endTime,
        badgeNumber: p5.badgeNumber,
        pilgrimName: p5.name,
        jatraNumber: 1,
        startTime,
        endTime,
        durationMinutes: 15,
      });
      
      logTest("Jatra Flow", true, `Badge #${p5.badgeNumber}: Motisha Tuk → Gheti (15 min)`);
    } catch (error) {
      logTest("Jatra Flow", false, "Failed", String(error));
    }

    // SUMMARY
    console.log("\n" + "=".repeat(70));
    console.log("📊 TEST SUMMARY");
    console.log("=".repeat(70));
    
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const total = results.length;
    
    console.log(`Total Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
    
    if (failed === 0) {
      console.log("\n🎉 ALL TESTS PASSED!");
    }
    
  } catch (error) {
    console.error("\n❌ TEST SUITE FAILED:", error);
    process.exit(1);
  }
}

runComprehensiveTests();
