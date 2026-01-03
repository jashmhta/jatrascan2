import { describe, it, expect } from "vitest";
import { google } from "googleapis";

describe("Google Sheets Integration", () => {
  it("should validate Google service account credentials", async () => {
    const credentials = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    
    expect(credentials).toBeDefined();
    expect(credentials).not.toBe("");

    // Parse credentials
    const serviceAccount = JSON.parse(credentials!);
    expect(serviceAccount.type).toBe("service_account");
    expect(serviceAccount.client_email).toContain("@");
    expect(serviceAccount.private_key).toContain("BEGIN PRIVATE KEY");

    // Test authentication
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });
    
    // Test access to the spreadsheet
    const SPREADSHEET_ID = "1BYVEW7FDb9Q2UW1aEvrYJUwPxB5XP94YAGkzpy_eJt4";
    const response = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });

    expect(response.data.spreadsheetId).toBe(SPREADSHEET_ID);
    expect(response.data.sheets).toBeDefined();
    expect(response.data.sheets!.length).toBeGreaterThan(0);
  }, 15000); // 15 second timeout for API call
});
