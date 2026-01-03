import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import * as db from "./db";
import * as googleSheets from "./google-sheets";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // Participants API
  participants: router({
    list: publicProcedure.query(async () => {
      return db.getAllParticipants();
    }),

    get: publicProcedure
      .input(z.object({ uuid: z.string() }))
      .query(async ({ input }) => {
        return db.getParticipantByUuid(input.uuid);
      }),

    getByQrToken: publicProcedure
      .input(z.object({ qrToken: z.string() }))
      .query(async ({ input }) => {
        return db.getParticipantByQrToken(input.qrToken);
      }),

    getByBadgeNumber: publicProcedure
      .input(z.object({ badgeNumber: z.number() }))
      .query(async ({ input }) => {
        return db.getParticipantByBadgeNumber(input.badgeNumber);
      }),

    bulkUpsert: publicProcedure
      .input(z.array(z.object({
        uuid: z.string(),
        badgeNumber: z.number(),
        name: z.string(),
        qrToken: z.string(),
        age: z.number().nullable().optional(),
        bloodGroup: z.string().nullable().optional(),
        emergencyContact: z.string().nullable().optional(),
        photoUrl: z.string().nullable().optional(),
      })))
      .mutation(async ({ input }) => {
        return db.bulkUpsertParticipants(input);
      }),
  }),

  // Scan Logs API
  scanLogs: router({
    list: publicProcedure.query(async () => {
      return db.getAllScanLogs();
    }),

    recent: publicProcedure
      .input(z.object({ limit: z.number().default(50) }))
      .query(async ({ input }) => {
        return db.getRecentScanLogs(input.limit);
      }),

    getByParticipant: publicProcedure
      .input(z.object({ participantUuid: z.string() }))
      .query(async ({ input }) => {
        return db.getScanLogsByParticipant(input.participantUuid);
      }),

    getByCheckpoint: publicProcedure
      .input(z.object({ checkpointId: z.number() }))
      .query(async ({ input }) => {
        return db.getScanLogsByCheckpoint(input.checkpointId);
      }),

    create: publicProcedure
      .input(z.object({
        uuid: z.string(),
        participantId: z.number(),
        participantUuid: z.string(),
        checkpointId: z.number(),
        deviceId: z.string().optional(),
        scannedAt: z.string(),
      }))
      .mutation(async ({ input }) => {
        // Check for duplicate scan
        const isDuplicate = await db.isDuplicateScan(input.participantUuid, input.checkpointId);
        if (isDuplicate) {
          return { success: false, duplicate: true, message: "Duplicate scan within 10 minutes" };
        }

        const result = await db.createScanLog({
          ...input,
          scannedAt: new Date(input.scannedAt),
        });

        // IMMEDIATE SYNC TO GOOGLE SHEETS (zero-tolerance)
        try {
          const participant = await db.getParticipantByUuid(input.participantUuid);
          const checkpointNames: Record<number, string> = {
            1: "Motisha Tuk",
            2: "Gheti",
            3: "Sagaal Pol",
          };

          if (participant) {
            const scanData = {
              scannedAt: new Date(input.scannedAt),
              badgeNumber: participant.badgeNumber,
              pilgrimName: participant.name,
              checkpoint: checkpointNames[input.checkpointId] || "Unknown",
              deviceId: input.deviceId,
              uuid: input.uuid,
            };

            const sheetsSuccess = await googleSheets.logScanToSheets(scanData);
            if (sheetsSuccess) {
              await db.markScanLogsSynced([input.uuid]);
            }
          }
        } catch (error) {
          console.error("[CRITICAL] Failed to sync scan to Google Sheets:", error);
          // Don't fail the request, but log the error for monitoring
        }

        return { success: true, duplicate: false, id: result.id };
      }),

    bulkCreate: publicProcedure
      .input(z.array(z.object({
        uuid: z.string(),
        participantId: z.number(),
        participantUuid: z.string(),
        checkpointId: z.number(),
        deviceId: z.string().optional(),
        scannedAt: z.string(),
        syncedToSheets: z.boolean().optional(),
      })))
      .mutation(async ({ input }) => {
        const data = input.map(log => ({
          ...log,
          scannedAt: new Date(log.scannedAt),
        }));
        return db.bulkCreateScanLogs(data);
      }),

    checkDuplicate: publicProcedure
      .input(z.object({
        participantUuid: z.string(),
        checkpointId: z.number(),
      }))
      .query(async ({ input }) => {
        const isDuplicate = await db.isDuplicateScan(input.participantUuid, input.checkpointId);
        return { isDuplicate };
      }),

    clearAll: publicProcedure.mutation(async () => {
      return db.clearAllScanLogs();
    }),
  }),

  // Jatra Counts API
  jatraCounts: router({
    list: publicProcedure.query(async () => {
      return db.getAllJatraCounts();
    }),

    getByParticipant: publicProcedure
      .input(z.object({ participantUuid: z.string() }))
      .query(async ({ input }) => {
        return db.getJatraCountsByParticipant(input.participantUuid);
      }),

    create: publicProcedure
      .input(z.object({
        participantId: z.number(),
        participantUuid: z.string(),
        jatraNumber: z.number(),
        startScanId: z.number().optional(),
        endScanId: z.number().optional(),
        startTime: z.string().optional(),
        endTime: z.string().optional(),
        durationMinutes: z.number().optional(),
        completedAt: z.string(),
      }))
      .mutation(async ({ input }) => {
        const result = await db.createJatraCount({
          ...input,
          startTime: input.startTime ? new Date(input.startTime) : undefined,
          endTime: input.endTime ? new Date(input.endTime) : undefined,
          completedAt: new Date(input.completedAt),
        });

        // IMMEDIATE SYNC TO GOOGLE SHEETS (zero-tolerance)
        try {
          const participant = await db.getParticipantByUuid(input.participantUuid);
          if (participant) {
            const jatraData = {
              completedAt: new Date(input.completedAt),
              badgeNumber: participant.badgeNumber,
              pilgrimName: participant.name,
              jatraNumber: input.jatraNumber,
              startTime: input.startTime ? new Date(input.startTime) : undefined,
              endTime: input.endTime ? new Date(input.endTime) : undefined,
              durationMinutes: input.durationMinutes,
            };

            await googleSheets.logJatraToSheets(jatraData);
          }
        } catch (error) {
          console.error("[CRITICAL] Failed to sync Jatra to Google Sheets:", error);
          // Don't fail the request, but log the error for monitoring
        }

        return { success: true, id: result.id };
      }),
  }),

  // Sync API
  sync: router({
    fullSync: publicProcedure.query(async () => {
      return db.getFullSyncData();
    }),

    pushChanges: publicProcedure
      .input(z.object({
        scanLogs: z.array(z.object({
          uuid: z.string(),
          participantId: z.number(),
          participantUuid: z.string(),
          checkpointId: z.number(),
          deviceId: z.string().optional(),
          scannedAt: z.string(),
        })),
      }))
      .mutation(async ({ input }) => {
        const data = input.scanLogs.map(log => ({
          ...log,
          scannedAt: new Date(log.scannedAt),
        }));
        const result = await db.bulkCreateScanLogs(data);
        return { success: true, inserted: result.inserted };
      }),
  }),

  // Google Sheets Sync API
  sheets: router({
    test: publicProcedure.query(async () => {
      return googleSheets.testGoogleSheetsConnection();
    }),

    syncScanLogs: publicProcedure.mutation(async () => {
      // Get unsynced scan logs from database
      const unsyncedLogs = await db.getUnsyncedScanLogs();
      if (unsyncedLogs.length === 0) {
        return { success: true, synced: 0, message: "No scans to sync" };
      }

      // Get participant details for each scan
      const participants = await db.getAllParticipants();
      const participantMap = new Map(participants.map(p => [p.uuid, p]));

      const checkpointNames: Record<number, string> = {
        1: "Motisha Tuk",
        2: "Gheti",
        3: "Sagaal Pol",
      };

      const scansToSync = unsyncedLogs.map(log => {
        const participant = participantMap.get(log.participantUuid);
        return {
          scannedAt: log.scannedAt,
          badgeNumber: participant?.badgeNumber || 0,
          pilgrimName: participant?.name || "Unknown",
          checkpoint: checkpointNames[log.checkpointId] || "Unknown",
          deviceId: log.deviceId || undefined,
          uuid: log.uuid,
        };
      });

      const result = await googleSheets.logScansToSheets(scansToSync);

      if (result.success > 0) {
        // Mark synced logs in database
        const syncedUuids = unsyncedLogs.slice(0, result.success).map(l => l.uuid);
        await db.markScanLogsSynced(syncedUuids);
      }

      return {
        success: result.success > 0,
        synced: result.success,
        failed: result.failed,
        message: `Synced ${result.success} scans to Google Sheets`,
      };
    }),
  }),

  // AI Chat API
  ai: router({
    analyzeYatraData: publicProcedure
      .input(z.object({ question: z.string().min(1).max(500) }))
      .mutation(async ({ input }) => {
        // Import LLM helper
        const { invokeLLM } = await import("./_core/llm");
        
        // Sanitize input to prevent prompt injection
        let sanitizedQuestion = input.question
          .replace(/\b(system|assistant|ignore|override)\s*/gi, '')
          .replace(/```[\s\S]*?```/g, '')
          .replace(/<[^>]*>/g, '')
          .trim()
          .slice(0, 500);
        
        // Check for injection patterns
        const injectionPatterns = [
          /ignore.*previous/i,
          /disregard.*instructions/i,
          /pretend.*you.*are/i,
        ];
        
        for (const pattern of injectionPatterns) {
          if (pattern.test(input.question)) {
            sanitizedQuestion = 'How many pilgrims have completed their Jatras today?';
            break;
          }
        }
        
        // Fetch all data from database
        const [participants, scanLogs, jatraCounts, stats] = await Promise.all([
          db.getAllParticipants(),
          db.getAllScanLogs(),
          db.getAllJatraCounts(),
          db.getStatistics(),
        ]);
        
        // Build context for AI
        const checkpointNames: Record<number, string> = {
          1: "Motisha Tuk",
          2: "Gheti",
          3: "Sagaal Pol",
        };
        
        const context = `
You are an AI assistant for the Palitana Yatra Tracker app. You ONLY help with tracking pilgrims during the Shatrunjaya Hill pilgrimage (Saat Jatra - 7 rounds).

IMPORTANT RULES:
1. ONLY answer questions related to the Palitana Yatra pilgrimage tracking
2. DO NOT answer questions outside this context (general knowledge, coding, etc.)
3. If asked something unrelated, politely redirect to pilgrimage-related queries
4. All timestamps are in IST (Indian Standard Time)
5. Be concise and accurate with data from the database

Current Statistics:
- Total Pilgrims: ${stats?.totalParticipants || 0}
- Total Scans Today: ${stats?.totalScans || 0}
- Jatras Completed: ${stats?.totalJatras || 0}
- Checkpoint Scans: Motisha Tuk=${stats?.checkpointStats?.find(c => c.checkpointId === 1)?.count || 0}, Gheti=${stats?.checkpointStats?.find(c => c.checkpointId === 2)?.count || 0}, Sagaal Pol=${stats?.checkpointStats?.find(c => c.checkpointId === 3)?.count || 0}

Key Concepts:
- A "Jatra" is one complete pilgrimage round (climb up from front + descend via back route to Gheti)
- Pilgrims complete 7 Jatras total (Saat Jatra) over 2 days
- Day 1: 4-6 Jatras depending on pilgrim group
- Day 2: Remaining Jatras to complete 7 total

Checkpoints:
- Motisha Tuk: Top of hill - scanned before starting descent (odd-numbered scans)
- Gheti: Back route bottom - marks Jatra completion (even-numbered scans)
- Sagaal Pol: Front route bottom - marks final descent of the day only

Recent Scan Activity (last 20):
${scanLogs.slice(0, 20).map(log => {
  const participant = participants.find(p => p.uuid === log.participantUuid);
  return `- Badge #${participant?.badgeNumber || '?'} (${participant?.name || 'Unknown'}) at ${checkpointNames[log.checkpointId]} on ${new Date(log.scannedAt).toLocaleString()}`;
}).join('\n')}

Top Jatra Completers:
${jatraCounts
  .reduce((acc, jc) => {
    const existing = acc.find(a => a.participantUuid === jc.participantUuid);
    if (existing) {
      existing.count = Math.max(existing.count, jc.jatraNumber);
    } else {
      const participant = participants.find(p => p.uuid === jc.participantUuid);
      acc.push({ participantUuid: jc.participantUuid, name: participant?.name || 'Unknown', badgeNumber: participant?.badgeNumber || 0, count: jc.jatraNumber });
    }
    return acc;
  }, [] as { participantUuid: string; name: string; badgeNumber: number; count: number }[])
  .sort((a, b) => b.count - a.count)
  .slice(0, 10)
  .map(p => `- Badge #${p.badgeNumber} (${p.name}): ${p.count} Jatras`)
  .join('\n')}

Answer the user's question concisely. If asked in Hindi or Gujarati, respond in that language.
`;
        
        try {
          const response = await invokeLLM({
            messages: [
              { role: "system", content: context },
              { role: "user", content: sanitizedQuestion },
            ],
          });
          
          // Extract content from the response properly
          let content = "";
          if (response?.choices?.[0]?.message?.content) {
            const messageContent = response.choices[0].message.content;
            if (typeof messageContent === "string") {
              content = messageContent;
            } else if (Array.isArray(messageContent)) {
              // Handle array of content parts
              content = messageContent
                .filter((part: any) => part.type === "text")
                .map((part: any) => part.text)
                .join("\n");
            }
          }
          
          return {
            success: true,
            answer: content || "I couldn't generate a response. Please try again.",
          };
        } catch (error) {
          console.error("AI error:", error);
          return {
            success: false,
            answer: "Sorry, I encountered an error. Please try again later.",
          };
        }
      }),
  }),

  // Statistics API
  statistics: router({
    get: publicProcedure.query(async () => {
      return db.getStatistics();
    }),
  }),

  // Admin utilities
  admin: router({
    clearSheets: publicProcedure.mutation(async () => {
      return googleSheets.clearAllScanLogs();
    }),
  }),
});

export type AppRouter = typeof appRouter;
