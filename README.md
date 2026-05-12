# Paternity Leave Tracker

8-week training tracker built on Google Sheets + Next.js. Mobile-first PWA with offline support, rest timer, and haptics.

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS with custom design tokens
- Framer Motion (page transitions, swipe gestures, modal animations)
- Recharts (volume bars, weight line, Whoop trend)
- SWR (data fetching + caching)
- React Hot Toast (success/error notifications)
- Lucide React (icons)
- date-fns (date formatting)
- Service Worker (offline shell caching)

Data flow: Google Sheets → Apps Script Web App → Next.js API route → SWR → React UI

## Mobile-first features

- **Bottom nav** with safe-area inset for iPhone home indicator
- **44px minimum tap targets** (Apple's accessibility floor)
- **Numeric keypads** triggered automatically (`inputMode="decimal"`, `step="2.5"` on weight)
- **Auto-focus chain**: weight → reps → next set → next exercise. Works with the on-screen keyboard's Enter/Done key (`enterKeyHint="next"`)
- **Haptic feedback** (vibration) on every interaction: tap, save success, error, set complete, timer warning, warn before delete
- **Rest timer**: tap the ⏱ button on any set after entering weight × reps. Full-screen overlay, presets (60/90/120/180s), ±15s adjust, pause, double-buzz when done, 10s warning tick
- **Segmented controls** for Phase / Day picking — one-thumb operation with framer-motion sliding indicator
- **Swipe-to-delete** on history sessions (drag left, tap trash icon to confirm)
- **Offline queue**: writes that fail go to localStorage and auto-sync when connection returns. Top banner shows pending count
- **Service worker**: app shell cached, so opening the app in the basement gym still works
- **PWA manifest**: "Add to Home Screen" gives full-screen, no Safari chrome, custom icon
- **Dark theme** tuned for 3am feedings (no eye-blasting)
- **`userScalable: false`**: prevents accidental pinch-zoom mid-set
- **Sticky save bar**: floats above bottom nav, always thumb-reachable, shows live volume

## Setup

### 1. Google Sheets

1. Upload `Paternity_Leave_Tracker.xlsx` to Google Drive
2. Right-click → Open with → Google Sheets (auto-converts)
3. Tabs: `Dashboard`, `ExerciseCatalog`, `WorkoutLog`, `WeeklyCheckIn`, `WhoopDaily`, `Zone2Log`, `RecoveryLog`, `Config`

### 2. Apps Script

1. In the Sheet: **Extensions → Apps Script**
2. Delete the default `Code.gs`, paste contents of `apps-script/Code.gs`
3. Edit constants at top:
   - `SHEET_ID`: leave blank (script is bound to the sheet)
   - `API_KEY`: replace with a long random string. `openssl rand -hex 32` works.
4. Save (⌘S)
5. **Deploy → New deployment**
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone** (API key is the security layer)
   - Click **Deploy**, authorize Google, copy the Web app URL (ends in `/exec`)

### 3. Next.js app

```bash
cd paternity-app
npm install
cp .env.example .env.local
```

Edit `.env.local`:

```
APPS_SCRIPT_URL=https://script.google.com/macros/s/PASTE_DEPLOYMENT_ID/exec
APPS_SCRIPT_API_KEY=THE_SAME_LONG_RANDOM_STRING
```

```bash
npm run dev
```

### 4. Production deploy (Vercel)

```bash
npm install -g vercel
vercel
```

Add the same two env vars in Vercel dashboard. Open the deployed URL on your phone and use **Add to Home Screen** for the PWA experience.

## Pages

- `/`           Home dashboard — week, phase, last Whoop guidance, weekly volume + bodyweight charts
- `/log`        Workout logger — segmented phase/day, every catalog exercise, set rows with auto-focus + rest timer + haptics
- `/whoop`      Daily Whoop — recovery, sleep, HRV, RHR, strain + 14-day chart
- `/check-in`   Weekly check-in — weight, BF, avg Whoop, avg sleep, stress
- `/zone2`      Zone 2 cardio log
- `/recovery`   Sunday recovery — interactive 6-item checklist with haptic ticks
- `/history`    Sessions grouped by date. Swipe left on a card to delete the entire session, or tap individual sets

## Workflow during a workout

1. Open `/log`, phase/day auto-detected
2. Enter weight, hit Enter → jumps to reps
3. Hit Enter → marks set complete, opens rest timer
4. Timer runs in background, gives haptic warning at 10s, double-buzz when done
5. Auto-focus jumps to next set's weight field
6. Last set of last exercise? Tap **Save session** (sticky bar)

## How phase progression works

- `Config` sheet has `block_start_date`. Summary endpoint computes current week from that.
- Wks 1-4 = Phase 1 (Strength). Wks 5-8 = Phase 2 (Hypertrophy). Different lifts.
- Override anytime with the segmented control on `/log`.

## Updating exercises

Edit `ExerciseCatalog` in the Sheet directly. Columns: `phase` (P1/P2), `day` (A/B/C), `order`, `exercise`, `sets`, `reps`, `note`. App reloads it on every page visit.

## Offline behavior

- **Reads**: SWR shows last-cached data when offline
- **Writes**: queue in localStorage, banner shows count, auto-flush when back online
- **Failed writes**: retry up to 5 times before being dropped
- **Important**: open the app once online so the service worker installs the shell

## Troubleshooting

- **"Connection error"**: env vars wrong, or Apps Script not deployed as Web app
- **"Unauthorized"**: API_KEY mismatch
- **Haptics not firing**: iOS Safari requires the app to be installed via "Add to Home Screen" for `navigator.vibrate`. In-browser, haptics may be silent — that's an iOS limitation, not a bug
- **Apps Script edits**: each `Code.gs` change requires **Deploy → Manage deployments → Edit → New version**
- **Service worker stuck**: in Chrome DevTools → Application → Service Workers → Unregister, then hard reload

## Notes

- Apps Script free tier: 20,000 URL Fetch calls/day, 6 min/script execution. More than enough for personal use.
- The Sheet remains source of truth — edit rows directly any time.
- All sensitive recovery numbers (RHR, HRV) are stored in your own Drive. No third-party servers.
