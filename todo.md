# Project TODO

## Core Setup
- [x] Set up database schema (participants, scan_logs, jatra_counts)
- [x] Seed 413 pilgrims from Excel data
- [x] Configure Google Sheets integration
- [x] Set up tRPC API routes

## Navigation & Screens
- [x] Configure 5-tab navigation layout
- [x] Scanner screen (Home)
- [x] Checkpoints screen
- [x] Participants screen
- [x] Reports screen
- [x] Settings screen
- [x] Participant detail screen
- [x] QR card display screen

## Scanner Features
- [x] QR code camera scanning
- [x] Gallery image QR decoding
- [x] Manual badge number entry (1-413)
- [x] Checkpoint selector (Motisha Tuk, Gheti, Sagaal Pol)
- [x] Scan result modal (success/error/duplicate)
- [x] Recent scans list
- [x] Bulk scan mode
- [x] Quick pilgrim search
- [x] Continuous scanning mode

## Offline Sync
- [x] Local AsyncStorage for scans
- [x] Offline-first scan recording
- [x] Background sync to server
- [x] Sync status bar component
- [x] Offline banner component
- [x] Pending scans queue
- [x] Retry with exponential backoff

## Google Sheets Integration
- [x] Service account authentication
- [x] ScanLogs sheet logging (with IST timestamps)
- [x] JatraCompletions sheet logging (with durations)
- [x] PilgrimStatus sheet for overview
- [x] SafetyAlerts sheet for monitoring
- [x] Automatic sheet creation

## Audio & Haptic Feedback
- [x] Success sound (ascending tones)
- [x] Error sound (descending tones)
- [x] Duplicate sound (double beep)
- [x] Jatra completion sound (arpeggio)
- [x] Haptic feedback on scan

## Multi-Language Support
- [x] English translations
- [x] Hindi translations
- [x] Gujarati translations
- [x] Language context provider
- [x] Language toggle in settings

## Reports & AI
- [x] Statistics cards
- [x] AI chat integration (context-aware)
- [x] CSV export
- [x] PDF export
- [x] Jatra calculator utility

## Branding
- [x] Generate custom app logo
- [x] Update app.config.ts with branding
- [x] Configure theme colors (saffron/orange)

## Checkpoint & Jatra Logic (v2.4)
- [x] Motisha Tuk: Top of hill, marks START of descent
- [x] Gheti: Back route bottom, marks COMPLETION of Jatra
- [x] Sagaal Pol: Front route bottom, marks LAST scan of the day

## Production Release v3.0 - COMPLETED

### Multi-Volunteer & Checkpoint-First Workflow
- [x] Volunteer selects checkpoint FIRST, then scans
- [x] 10+ volunteers per checkpoint sharing same centralized data
- [x] Each scan logs: volunteer device ID, checkpoint, timestamp (IST), participant
- [x] Checkpoint persists across app sessions

### Jatra Duration Tracking
- [x] Calculate duration for each Jatra completion per pilgrim
- [x] Track start time (Motisha Tuk scan) and end time (Gheti scan)
- [x] Log duration in minutes for each completed Jatra
- [x] Display Jatra history with durations in participant details

### Safety Alert System
- [x] RED color indicator for pilgrims with incomplete Jatra > 6 hours
- [x] Alert volunteers when pilgrim hasn't completed descent in 6 hours
- [x] Safety dashboard showing at-risk pilgrims
- [x] At-risk filter in Pilgrims screen

### Continuous/Batch Scanning Mode
- [x] Keep scanner ON for continuous scanning of multiple pilgrims
- [x] Rapid-fire scanning mode for efficiency at busy checkpoints
- [x] Audio/haptic feedback for each successful scan
- [x] Show scan count in scanner UI

### Offline-First Architecture
- [x] App functions 100% offline during network fluctuations
- [x] Badge input and QR scanning work offline
- [x] Local cache of all participant data and QR tokens
- [x] Queue scans locally, sync when online
- [x] Sync button: pull all data from database when clicked
- [x] Clear local data only with password (8869)

### Centralized Database Sync
- [x] All volunteers share same scan logs from central database
- [x] Real-time sync when online
- [x] Database as single source of truth
- [x] Force full sync option

### Google Sheets Integration
- [x] Organized final data export to Google Sheets
- [x] IST timestamps in all sheets
- [x] Blood group and emergency contact in scan logs
- [x] Duration tracking in Jatra completions

### Participant Data & Call Feature
- [x] Call button for each pilgrim (emergency contact)
- [x] All 413 badge numbers verified
- [x] Emergency contacts and blood groups displayed
- [x] Self contact number field in schema

### AI Chat Enhancement
- [x] Read complete database for accurate responses
- [x] Only respond within Yatra context (no off-topic)
- [x] Access real-time scan logs and Jatra counts
- [x] Support Hindi, Gujarati, English queries

### IST Timestamps
- [x] All timestamps in IST (Indian Standard Time)
- [x] Display format: DD/MM/YYYY HH:MM:SS IST
- [x] Duration calculations in IST
- [x] formatToIST and parseIST utilities

### Testing & Production Readiness
- [x] 61 unit tests passing
- [x] Checkpoint validation tests
- [x] Safety alert tests
- [x] Jatra calculation tests
- [x] Performance tests (413 participants, 1000+ scans)
- [x] Duplicate scan prevention tests
- [x] IST timestamp tests

## Known Issues (To Test on Physical Device)
- [ ] APK badge input - needs physical device testing
- [ ] APK QR scanning - needs physical device testing
- [ ] Camera permission flow on Android

## New Features
- [x] Checkpoint detail screen - clicking on each checkpoint card should show segregated scan logs for that checkpoint
- [x] Make checkpoint cards clickable and navigate to detail view

## Scanner Page Improvements
- [x] Remove redundant "Tap to Scan" button from Scanner page
- [x] Streamline Scanner page layout for better UX

## Checkpoint Detail Improvements
- [x] Add date filtering (Today, Yesterday, Last 7 days, All time) to checkpoint detail screens
- [x] Add calendar date picker for custom date selection


## Bulk Operations
- [x] Add progress indicator for bulk scan operations
- [x] Show real-time progress bar during bulk scanning

## Export Functionality
- [x] Add export button to checkpoint detail screens
- [x] Export filtered scan logs as CSV
- [x] Share filtered data (via Share API on mobile, download on web)

## Analytics Dashboard
- [ ] Enhance Reports screen with visual analytics
- [ ] Add hourly scan trends chart
- [ ] Display peak times analysis
- [ ] Show checkpoint completion rates with progress bars
- [ ] Add top performers leaderboard
- [ ] Show completion rate percentage


## Bug Fixes
- [x] Remove duplicate export buttons on checkpoint detail page (should only show one export button)


## Jatra Flow & Duration
- [x] Verify Jatra duration calculation is working correctly (Motisha Tuk → Gheti)
- [x] Verify Jatra duration is being logged properly
- [ ] Update flow documentation to match actual pilgrimage pattern
- [ ] Verify Sagaal Pol is only used for last descent of the day (not Jatra completion)
- [ ] Test complete flow: Day 1 (4/5/6 Jatras) and Day 2 (to reach 7 total)


## Clear Local Data Feature
- [x] Implement "Clear Local Data" that only clears scan logs (keeps participants)
- [x] Add sync check - prompt user to sync first if there are pending scans
- [x] Add confirmation dialog before clearing data
- [x] Ensure participants data is never cleared (needed for offline access)


## UI Cleanup
- [x] Remove language selection toggles from Settings screen


## Google Sheets & Database
- [x] Review Google Sheet structure (ScanLogs and JatraCompletion headers)
- [x] Clear existing scan data from Google Sheets
- [x] Update code to match Google Sheet format exactly
- [x] Set up Google Sheets service account credentials in app
- [x] Implement immediate sync (every scan triggers instant Google Sheets logging)
- [x] Add retry mechanism with exponential backoff for Google Sheets (3 attempts: 1s, 2s, 4s delays)
- [x] Implement data integrity verification across all 5 layers (Local → App → Server → DB → Sheets)
- [x] Add automatic reconciliation for sync conflicts (handled by use-offline-sync hook)
- [x] Test complete sync flow: Local AsyncStorage → App State → Server API → Database → Google Sheets
- [x] Verify zero data loss across all layers (test passed: scan ID=60001 synced successfully)
- [x] Clear existing scan data from database


## Comprehensive Sync Testing
- [x] Test single scan logging (Local → App → Server → DB → Sheets) - PASSED
- [x] Test bulk scan logging (multiple scans at once) - PASSED (3 scans)
- [x] Test Jatra completion logging with duration calculation - PASSED (15 min)
- [x] Test complete Jatra flow (Motisha Tuk → Gheti = completion) - PASSED
- [x] Verify Google Sheets data accuracy - PASSED (6 ScanLogs + 1 JatraCompletion logged correctly)


## Sync Monitoring Dashboard
- [x] Add sync status section to Settings screen
- [x] Show pending items count (scans waiting to sync)
- [x] Display last sync time with human-readable format
- [x] Manual sync button already exists in Data Management section
- [x] Show sync statistics (pending scans, total scans, pilgrims)
- [x] Add real-time sync status indicator (syncing/idle/error with color-coded dot)


## Google Sheets Sync Bug
- [x] Investigate why logs are not appearing in Google Sheets (database tables weren't created)
- [x] Fix the sync issue (ran migrations, fixed Jatra logging bug in getDayInIST)
- [x] Verify data appears in both ScanLogs and JatraCompletions sheets (CONFIRMED: both working)
- [x] Verify logging accuracy - all fields correct with proper IST timestamps


## End-to-End Sync Test
- [x] Clear all scan data from database
- [x] Clear all scan data from Google Sheets
- [ ] Create test scan on web app
- [ ] Verify scan appears in local AsyncStorage
- [ ] Verify scan syncs to server/database
- [ ] Verify scan appears in Google Sheets
- [ ] Confirm complete chain: Local → App → Server → DB → Sheets


## Production Readiness Tasks

### Daily Summary Reports
- [ ] Create PDF report generation feature
- [ ] Include statistics: total Jatras, average duration, checkpoint activity
- [ ] Add date range selector (today, yesterday, custom)
- [ ] Export button in Reports screen
- [ ] Share functionality (mobile) / Download (web)

### Continuous Scanning Improvements
- [x] Show visual feedback for each scan in continuous mode
- [x] Display pilgrim name/badge after each successful scan
- [ ] Add scan history list in continuous mode modal
- [x] Keep modal open after each scan (don't auto-close)
- [x] Show running count of scans in current session

### QR Code Validation
- [ ] Extract all 413 QR codes from Jash.zip
- [ ] Decode each QR code to extract token
- [ ] Verify token matches expected format (UUID)
- [ ] Cross-reference with database participants table
- [ ] Generate validation report (success/failure for each badge)
- [ ] Fix any mismatched or invalid QR codes

### Data Verification
- [ ] Compare _IDCardData_1.xlsx with current database
- [ ] Verify all 413 badge numbers are present
- [ ] Check for any data inconsistencies (names, blood groups, contacts)
- [ ] Update database if new data is more accurate

### Fresh Production Start
- [ ] Clear all scan logs from AsyncStorage (all devices)
- [ ] Clear all scan logs from MySQL database
- [ ] Clear all data from Google Sheets (ScanLogs, JatraCompletions, PilgrimStatus, SafetyAlerts)
- [ ] Keep participants data intact (413 pilgrims)
- [ ] Verify clean state across all 5 layers
- [ ] Document the clean slate procedure for future reference


## Production Readiness - Data Cleanup
- [x] Clear all test scan data from MySQL database (scan_logs, jatra_counts)
- [x] Clear all test data from Google Sheets (ScanLogs, JatraCompletions, PilgrimStatus, SafetyAlerts)
- [x] Preserve all header rows in Google Sheets
- [x] Verify participants data (413 records) is intact
- [x] Validate all 413 QR codes from Jash.zip
- [x] Compare Excel data with database
- [x] Document cleanup process
- [x] Create cleanup scripts for future use
