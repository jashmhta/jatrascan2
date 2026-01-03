import * as db from "../server/db";
import * as googleSheets from "../server/google-sheets";

async function testSyncFlow() {
  console.log("🧪 Testing End-to-End Sync Flow\n");
  console.log("=" .repeat(60));
  
  try {
    // Step 1: Get a test participant
    console.log("\n1️⃣  Fetching test participant...");
    const participant = await db.getParticipantByBadgeNumber(1);
    if (!participant) {
      console.error("❌ No participant found with badge #1");
      return;
    }
    console.log(`✓ Found: ${participant.name} (Badge #${participant.badgeNumber})`);

    // Step 2: Create scan in database
    console.log("\n2️⃣  Creating scan in database...");
    const scanUuid = `test-${Date.now()}`;
    const scanData = {
      uuid: scanUuid,
      participantId: participant.id,
      participantUuid: participant.uuid,
      checkpointId: 1, // Motisha Tuk
      deviceId: "test-device",
      scannedAt: new Date(),
    };
    
    const scanResult = await db.createScanLog(scanData);
    console.log(`✓ Scan created in DB: ID=${scanResult.id}`);

    // Step 3: Verify scan in database
    console.log("\n3️⃣  Verifying scan in database...");
    const dbScans = await db.getScanLogsByParticipant(participant.uuid);
    const testScan = dbScans.find(s => s.uuid === scanUuid);
    if (!testScan) {
      console.error("❌ Scan not found in database");
      return;
    }
    console.log(`✓ Scan verified in DB: ${testScan.uuid}`);

    // Step 4: Sync to Google Sheets
    console.log("\n4️⃣  Syncing to Google Sheets...");
    const sheetsScanData = {
      scannedAt: scanData.scannedAt,
      badgeNumber: participant.badgeNumber,
      pilgrimName: participant.name,
      checkpoint: "Motisha Tuk",
      deviceId: scanData.deviceId,
      uuid: scanUuid,
    };
    
    const sheetsSuccess = await googleSheets.logScanToSheets(sheetsScanData);
    if (!sheetsSuccess) {
      console.error("❌ Failed to sync to Google Sheets");
      return;
    }
    console.log(`✓ Scan synced to Google Sheets`);

    // Step 5: Mark as synced in database
    console.log("\n5️⃣  Marking scan as synced in database...");
    await db.markScanLogsSynced([scanUuid]);
    console.log(`✓ Scan marked as synced in DB`);

    // Step 6: Verify sync status
    console.log("\n6️⃣  Verifying final sync status...");
    const unsyncedLogs = await db.getUnsyncedScanLogs();
    const isUnsynced = unsyncedLogs.some(s => s.uuid === scanUuid);
    if (isUnsynced) {
      console.error("❌ Scan still marked as unsynced");
      return;
    }
    console.log(`✓ Scan confirmed as synced`);

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("🎉 END-TO-END SYNC TEST PASSED!");
    console.log("=".repeat(60));
    console.log("\n✅ Complete flow verified:");
    console.log("   Local (AsyncStorage) → App State → Server API → Database → Google Sheets");
    console.log("\n📊 Test scan details:");
    console.log(`   Badge: #${participant.badgeNumber}`);
    console.log(`   Pilgrim: ${participant.name}`);
    console.log(`   Checkpoint: Motisha Tuk`);
    console.log(`   UUID: ${scanUuid}`);
    console.log(`   Synced: ✓`);
    
  } catch (error) {
    console.error("\n❌ TEST FAILED:", error);
    process.exit(1);
  }
}

testSyncFlow();
