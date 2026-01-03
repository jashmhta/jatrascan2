import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Participants table - 413 pilgrims for the Palitana Yatra
 */
export const participants = mysqlTable("participants", {
  id: int("id").autoincrement().primaryKey(),
  uuid: varchar("uuid", { length: 36 }).notNull().unique(),
  badgeNumber: int("badgeNumber").notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  qrToken: varchar("qrToken", { length: 64 }).notNull().unique(),
  age: int("age"),
  bloodGroup: varchar("bloodGroup", { length: 10 }),
  emergencyContact: varchar("emergencyContact", { length: 20 }),
  selfContact: varchar("selfContact", { length: 20 }),
  photoUrl: text("photoUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Participant = typeof participants.$inferSelect;
export type InsertParticipant = typeof participants.$inferInsert;

/**
 * Scan logs table - records each QR scan at checkpoints
 */
export const scanLogs = mysqlTable("scan_logs", {
  id: int("id").autoincrement().primaryKey(),
  uuid: varchar("uuid", { length: 36 }).notNull().unique(),
  participantId: int("participantId").notNull(),
  participantUuid: varchar("participantUuid", { length: 36 }).notNull(),
  checkpointId: int("checkpointId").notNull(),
  deviceId: varchar("deviceId", { length: 64 }),
  scannedAt: timestamp("scannedAt").notNull(),
  syncedToSheets: boolean("syncedToSheets").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ScanLog = typeof scanLogs.$inferSelect;
export type InsertScanLog = typeof scanLogs.$inferInsert;

/**
 * Jatra counts table - tracks completed pilgrimages per participant
 */
export const jatraCounts = mysqlTable("jatra_counts", {
  id: int("id").autoincrement().primaryKey(),
  participantId: int("participantId").notNull(),
  participantUuid: varchar("participantUuid", { length: 36 }).notNull(),
  jatraNumber: int("jatraNumber").notNull(),
  startScanId: int("startScanId"),
  endScanId: int("endScanId"),
  startTime: timestamp("startTime"),
  endTime: timestamp("endTime"),
  durationMinutes: int("durationMinutes"),
  completedAt: timestamp("completedAt").notNull(),
  syncedToSheets: boolean("syncedToSheets").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type JatraCount = typeof jatraCounts.$inferSelect;
export type InsertJatraCount = typeof jatraCounts.$inferInsert;
