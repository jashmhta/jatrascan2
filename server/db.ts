import { eq, desc, and, gte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, participants, scanLogs, jatraCounts, InsertParticipant, InsertScanLog, InsertJatraCount } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============================================
// Participant Functions
// ============================================

export async function getAllParticipants() {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(participants).orderBy(participants.badgeNumber);
}

export async function getParticipantByUuid(uuid: string) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(participants).where(eq(participants.uuid, uuid)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getParticipantByQrToken(qrToken: string) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(participants).where(eq(participants.qrToken, qrToken)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getParticipantByBadgeNumber(badgeNumber: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(participants).where(eq(participants.badgeNumber, badgeNumber)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function bulkUpsertParticipants(data: InsertParticipant[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  for (const participant of data) {
    await db.insert(participants).values(participant).onDuplicateKeyUpdate({
      set: {
        name: participant.name,
        age: participant.age,
        bloodGroup: participant.bloodGroup,
        emergencyContact: participant.emergencyContact,
        photoUrl: participant.photoUrl,
      },
    });
  }
  
  return { inserted: data.length };
}

// ============================================
// Scan Log Functions
// ============================================

export async function getAllScanLogs() {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(scanLogs).orderBy(desc(scanLogs.scannedAt));
}

export async function getScanLogsByParticipant(participantUuid: string) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(scanLogs)
    .where(eq(scanLogs.participantUuid, participantUuid))
    .orderBy(desc(scanLogs.scannedAt));
}

export async function getScanLogsByCheckpoint(checkpointId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(scanLogs)
    .where(eq(scanLogs.checkpointId, checkpointId))
    .orderBy(desc(scanLogs.scannedAt));
}

export async function createScanLog(data: InsertScanLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(scanLogs).values(data);
  return { id: result[0].insertId };
}

export async function bulkCreateScanLogs(data: InsertScanLog[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  if (data.length === 0) return { inserted: 0 };
  
  // Insert each scan log, skipping duplicates by uuid
  let inserted = 0;
  for (const log of data) {
    try {
      await db.insert(scanLogs).values(log).onDuplicateKeyUpdate({
        set: { syncedToSheets: log.syncedToSheets },
      });
      inserted++;
    } catch (error) {
      console.warn(`[Database] Failed to insert scan log ${log.uuid}:`, error);
    }
  }
  
  return { inserted };
}

export async function getRecentScanLogs(limit: number = 50) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(scanLogs).orderBy(desc(scanLogs.scannedAt)).limit(limit);
}

export async function isDuplicateScan(participantUuid: string, checkpointId: number, withinMinutes: number = 10) {
  const db = await getDb();
  if (!db) return false;
  
  const cutoffTime = new Date(Date.now() - withinMinutes * 60 * 1000);
  
  const result = await db.select().from(scanLogs)
    .where(and(
      eq(scanLogs.participantUuid, participantUuid),
      eq(scanLogs.checkpointId, checkpointId),
      gte(scanLogs.scannedAt, cutoffTime)
    ))
    .limit(1);
  
  return result.length > 0;
}

export async function clearAllScanLogs() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(scanLogs);
  await db.delete(jatraCounts);
  return { success: true };
}

// ============================================
// Jatra Count Functions
// ============================================

export async function getAllJatraCounts() {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(jatraCounts).orderBy(desc(jatraCounts.completedAt));
}

export async function getJatraCountsByParticipant(participantUuid: string) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(jatraCounts)
    .where(eq(jatraCounts.participantUuid, participantUuid))
    .orderBy(jatraCounts.jatraNumber);
}

export async function createJatraCount(data: InsertJatraCount) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(jatraCounts).values(data);
  return { id: result[0].insertId };
}

export async function getUnsyncedScanLogs() {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(scanLogs)
    .where(eq(scanLogs.syncedToSheets, false))
    .orderBy(scanLogs.scannedAt);
}

export async function markScanLogsSynced(uuids: string[]) {
  const db = await getDb();
  if (!db) return;
  
  for (const uuid of uuids) {
    await db.update(scanLogs)
      .set({ syncedToSheets: true })
      .where(eq(scanLogs.uuid, uuid));
  }
}

export async function getUnsyncedJatraCounts() {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(jatraCounts)
    .where(eq(jatraCounts.syncedToSheets, false))
    .orderBy(jatraCounts.completedAt);
}

export async function markJatraCountsSynced(ids: number[]) {
  const db = await getDb();
  if (!db) return;
  
  for (const id of ids) {
    await db.update(jatraCounts)
      .set({ syncedToSheets: true })
      .where(eq(jatraCounts.id, id));
  }
}

// ============================================
// Statistics Functions
// ============================================

export async function getStatistics() {
  const db = await getDb();
  if (!db) return null;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const [totalParticipants] = await db.select({ count: sql<number>`count(*)` }).from(participants);
  const [totalScans] = await db.select({ count: sql<number>`count(*)` }).from(scanLogs);
  const [totalJatras] = await db.select({ count: sql<number>`count(*)` }).from(jatraCounts);
  const [todayScans] = await db.select({ count: sql<number>`count(*)` }).from(scanLogs).where(gte(scanLogs.scannedAt, today));
  const [todayJatras] = await db.select({ count: sql<number>`count(*)` }).from(jatraCounts).where(gte(jatraCounts.completedAt, today));
  
  // Get scans per checkpoint
  const checkpointStats = await db.select({
    checkpointId: scanLogs.checkpointId,
    count: sql<number>`count(*)`,
  }).from(scanLogs).groupBy(scanLogs.checkpointId);
  
  return {
    totalParticipants: totalParticipants?.count ?? 0,
    totalScans: totalScans?.count ?? 0,
    totalJatras: totalJatras?.count ?? 0,
    todayScans: todayScans?.count ?? 0,
    todayJatras: todayJatras?.count ?? 0,
    checkpointStats,
  };
}

// ============================================
// Full Sync Function
// ============================================

export async function getFullSyncData() {
  const db = await getDb();
  if (!db) return { participants: [], scanLogs: [], jatraCounts: [] };
  
  const [allParticipants, allScanLogs, allJatraCounts] = await Promise.all([
    getAllParticipants(),
    getAllScanLogs(),
    getAllJatraCounts(),
  ]);
  
  return {
    participants: allParticipants,
    scanLogs: allScanLogs,
    jatraCounts: allJatraCounts,
  };
}
