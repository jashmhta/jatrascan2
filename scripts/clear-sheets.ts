import { clearAllScanLogs } from "../server/google-sheets";

async function main() {
  console.log("Clearing all scan logs from Google Sheets...");
  const result = await clearAllScanLogs();
  console.log(result);
  process.exit(result.success ? 0 : 1);
}

main().catch(console.error);
