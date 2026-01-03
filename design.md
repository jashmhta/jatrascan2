# Palitana Yatra Tracker - Mobile App Interface Design

## Overview
A mobile application designed to track 413 pilgrims during the Shatrunjaya Hill pilgrimage in Palitana, Gujarat. The app enables 40+ volunteers to scan QR codes at 3 checkpoints with real-time synchronization across all devices.

## Design Philosophy
- **Mobile Portrait Orientation (9:16)** - One-handed usage optimized
- **Apple Human Interface Guidelines (HIG)** compliant - First-party iOS app feel
- **Offline-First** - Works without internet, syncs when online
- **Speed & Efficiency** - Fast QR scanning and instant feedback

---

## Screen List

### 1. Scanner Screen (Home / Tab 1)
**Primary screen for QR code scanning**

### 2. Checkpoints Screen (Tab 2)
**View and select checkpoints**

### 3. Participants Screen (Tab 3)
**Browse all 413 pilgrims**

### 4. Reports Screen (Tab 4)
**Statistics, AI chat, and data export**

### 5. Settings Screen (Tab 5)
**App configuration and preferences**

### 6. Participant Detail Screen
**Individual pilgrim details and scan history**

### 7. QR Card Display Screen
**Show pilgrim's QR code card**

---

## Primary Content and Functionality

### Scanner Screen (Home)
**Layout (top to bottom):**
1. **Header Section**
   - App title: "Palitana Yatra Tracker"
   - Subtitle: "413 Pilgrims • 3 Checkpoints"
   - Gradient background (saffron/orange theme - Jain pilgrimage colors)

2. **Sync Status Bar**
   - Online/Offline indicator
   - Pending scans count
   - Last sync timestamp

3. **Checkpoint Selector**
   - Three horizontal buttons: Aamli | Gheti | X
   - Active checkpoint highlighted with primary color
   - Tap to switch checkpoint

4. **Scan Button (Center)**
   - Large circular button (140px)
   - QR code icon
   - "Tap to Scan" label
   - Animated pulse effect when ready

5. **Action Buttons Row**
   - Manual Entry (keyboard icon) - Enter badge number manually
   - Quick Search (magnifying glass) - Search pilgrim by name/badge
   - Bulk Scan Mode (stack icon) - Continuous scanning

6. **Recent Scans List**
   - Last 10 scans on mobile
   - Shows: Name, Checkpoint, Time ago
   - Tap to view pilgrim detail

**Functionality:**
- Camera-based QR scanning
- Gallery image QR decoding
- Manual badge number entry (1-413)
- Duplicate scan prevention (10-minute window)
- Success/Error/Duplicate audio feedback
- Haptic feedback on scan

### Checkpoints Screen
**Content:**
- List of 3 checkpoints with descriptions
- Current scan counts per checkpoint
- Day 1/Day 2 filter toggle

**Checkpoint Details:**
| ID | Name | Description |
|----|------|-------------|
| 1 | Aamli | Midway point on Gheti route |
| 2 | Gheti | Bottom of Gheti route (Jatra completion marker) |
| 3 | X | Front Side route |

### Participants Screen
**Content:**
- Searchable list of 413 pilgrims
- Each row shows: Badge #, Name, Jatra count
- Filter by: All, Currently Descending, Completed Jatras
- Sort by: Badge number, Name, Jatra count

**Row Actions:**
- Tap to view participant detail
- Quick scan button on each row

### Reports Screen
**Content:**
1. **Statistics Cards**
   - Total Jatras completed today
   - Pilgrims currently descending
   - Scans per checkpoint
   - Average Jatra time

2. **AI Chat Section**
   - Ask questions about pilgrimage data
   - Suggested questions:
     - "How many Jatras completed today?"
     - "Who completed the most Jatras?"
     - "Show checkpoint summary"

3. **Export Options**
   - Export to CSV
   - View Google Sheets (opens external link)

### Settings Screen
**Content:**
1. **Language Selection**
   - English (default)
   - Hindi (हिंदी)
   - Gujarati (ગુજરાતી)

2. **Audio Settings**
   - Sound effects toggle
   - Haptic feedback toggle

3. **Data Management**
   - Sync now button
   - Clear local cache
   - View sync status

4. **About**
   - App version
   - Developer info

### Participant Detail Screen
**Content:**
- Pilgrim photo (from QR card)
- Name and badge number
- Age, blood group, emergency contact
- QR code display
- Scan history timeline
- Jatra completion count

### QR Card Display Screen
**Content:**
- Full-screen QR code
- Badge number and name
- Shareable/printable format

---

## Key User Flows

### Flow 1: Scan Pilgrim at Checkpoint
1. User opens app → Scanner screen displayed
2. User selects checkpoint (Aamli/Gheti/X)
3. User taps "Scan" button → Camera opens
4. User scans pilgrim's QR code
5. App validates QR → Shows success modal with pilgrim name
6. If Gheti checkpoint → Shows Jatra completion celebration
7. Scan logged locally and synced to server

### Flow 2: Manual Badge Entry
1. User taps "Manual Entry" button
2. Numeric keypad appears
3. User enters badge number (1-413)
4. User taps "Record Checkpoint"
5. App validates and records scan

### Flow 3: Search Pilgrim
1. User taps "Quick Search" button
2. Search modal opens
3. User types name or badge number
4. Results filter in real-time
5. User taps pilgrim → Detail screen opens

### Flow 4: View Reports
1. User navigates to Reports tab
2. Statistics cards load with current data
3. User can ask AI questions
4. User can export data to CSV

### Flow 5: Change Language
1. User navigates to Settings tab
2. User taps language option
3. User selects preferred language
4. App UI updates immediately

---

## Color Choices

### Primary Palette (Jain Pilgrimage Theme)
| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| primary | #FF6B00 (Saffron) | #FF8C33 | Accent, buttons, active states |
| background | #FFFFFF | #151718 | Screen backgrounds |
| surface | #FFF8F0 (Warm white) | #1E2022 | Cards, elevated surfaces |
| foreground | #1A1A1A | #ECEDEE | Primary text |
| muted | #666666 | #9BA1A6 | Secondary text |
| border | #E5E0D8 | #334155 | Dividers, borders |
| success | #22C55E | #4ADE80 | Successful scans |
| warning | #F59E0B | #FBBF24 | Duplicate scans |
| error | #EF4444 | #F87171 | Errors, not found |

### Checkpoint Colors
| Checkpoint | Color | Meaning |
|------------|-------|---------|
| Aamli | #3B82F6 (Blue) | Midway point |
| Gheti | #22C55E (Green) | Jatra completion |
| X | #8B5CF6 (Purple) | Final descent |

---

## Component Specifications

### Scan Button
- Size: 140px diameter
- Background: Primary gradient (saffron)
- Icon: QR code scanner, 48px
- Shadow: Subtle elevation
- Animation: Pulse when ready, scale on press

### Checkpoint Selector
- Horizontal row of 3 buttons
- Active: Primary background, white text
- Inactive: Surface background, muted text
- Border radius: 12px
- Height: 48px

### Recent Scan Card
- Height: 72px
- Left: Badge number badge (circle)
- Center: Name (bold), Checkpoint + time (muted)
- Right: Chevron icon
- Divider: 1px border

### Sync Status Bar
- Height: 44px
- Left: WiFi icon (green/red)
- Center: Status text
- Right: Pending count badge
- Background: Surface color

---

## Audio Feedback Specifications

| Event | Sound | Duration |
|-------|-------|----------|
| Successful scan | Ascending tones (A5→E6) | 250ms |
| Error (not found) | Descending tones (A4→A3) | 350ms |
| Duplicate scan | Double beep (E5→E5) | 300ms |
| Jatra complete | Arpeggio (C5→E5→G5→C6) | 500ms |

---

## Offline Behavior

1. **All scans saved locally first** - Instant UI feedback
2. **Background sync** - Server sync happens asynchronously
3. **Cached participants** - 413 pilgrims cached for offline access
4. **Retry queue** - Failed syncs retry with exponential backoff
5. **Visual indicators** - Clear offline/online status in UI

---

## Data Model Summary

### Participant
- id (UUID)
- name (string)
- badgeNumber (1-413)
- qrToken (PALITANA_YATRA_{badgeNumber})
- age, bloodGroup, emergencyContact
- photoUrl (optional)

### ScanLog
- id (UUID)
- participantId (UUID)
- checkpointId (1, 2, or 3)
- scannedAt (timestamp)
- deviceId (optional)
- synced (boolean)

### Checkpoint
- id (1, 2, 3)
- name (Aamli, Gheti, X)
- description (string)
