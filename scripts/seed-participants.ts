import { drizzle } from "drizzle-orm/mysql2";
import { participants } from "../drizzle/schema";
import seedData from "../seed-data.json";

async function seedParticipants() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }

  const db = drizzle(process.env.DATABASE_URL);

  console.log(`Seeding ${seedData.length} participants...`);

  for (const participant of seedData) {
    try {
      await db.insert(participants).values({
        uuid: participant.uuid,
        badgeNumber: participant.badgeNumber,
        name: participant.name,
        qrToken: participant.qrToken,
        age: participant.age,
        bloodGroup: participant.bloodGroup,
        emergencyContact: participant.emergencyContact,
        photoUrl: participant.photoUrl,
      }).onDuplicateKeyUpdate({
        set: {
          name: participant.name,
          age: participant.age,
          bloodGroup: participant.bloodGroup,
          emergencyContact: participant.emergencyContact,
        },
      });
    } catch (error) {
      console.error(`Failed to insert participant ${participant.badgeNumber}:`, error);
    }
  }

  console.log("Seeding complete!");
  process.exit(0);
}

seedParticipants();
