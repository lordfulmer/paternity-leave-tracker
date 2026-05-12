/**
 * PATERNITY LEAVE TRACKER — Google Apps Script Web App API
 *
 * SETUP:
 * 1. Open your Google Sheet (the imported Paternity_Leave_Tracker)
 * 2. Extensions > Apps Script — paste this entire file
 * 3. Replace SHEET_ID below with your sheet ID (or leave blank to use bound sheet)
 * 4. Set API_KEY to a long random string — match this in Next.js .env.local
 * 5. Deploy > New deployment > Web app
 *    - Execute as: Me
 *    - Who has access: Anyone (or "Anyone with Google account" for tighter)
 *    - Copy the /exec URL — this becomes APPS_SCRIPT_URL in Next.js
 *
 * ENDPOINTS (all via POST { action, payload, apiKey } JSON body, or GET ?action=...&apiKey=...):
 *   getCatalog            -> all exercises by phase/day
 *   getConfig             -> key/value config
 *   getWorkoutLog         -> all workout sets (optionally filter by phase/day/week)
 *   getRecentSets         -> last sets for a given exercise (for "last weight" prefill)
 *   logWorkoutSet         -> append a set to WorkoutLog
 *   logWorkoutSession     -> append multiple sets at once (full session)
 *   deleteWorkoutSet      -> remove a row by id
 *   getWeeklyCheckIns     -> all weekly check-ins
 *   upsertWeeklyCheckIn   -> insert or update a weekly check-in
 *   getWhoopDaily         -> all daily whoop entries
 *   upsertWhoopDaily      -> insert or update a daily whoop entry by date
 *   getZone2Log           -> all zone 2 sessions
 *   logZone2              -> append a zone 2 session
 *   getRecoveryLog        -> all recovery sessions
 *   logRecovery           -> append a recovery session
 *   summary               -> dashboard summary (current week, last whoop, totals)
 */

const SHEET_ID = ''; // leave blank if script is bound to the sheet
const API_KEY = 'CHANGE_ME_TO_LONG_RANDOM_STRING';

const SHEETS = {
  CATALOG: 'ExerciseCatalog',
  WORKOUT: 'WorkoutLog',
  WEEKLY: 'WeeklyCheckIn',
  WHOOP: 'WhoopDaily',
  ZONE2: 'Zone2Log',
  RECOVERY: 'RecoveryLog',
  CONFIG: 'Config'
};

// ============================================================
// ENTRY POINTS
// ============================================================

function doGet(e) {
  return handleRequest_(e.parameter || {});
}

function doPost(e) {
  let params = {};
  try {
    if (e.postData && e.postData.contents) {
      params = JSON.parse(e.postData.contents);
    } else if (e.parameter) {
      params = e.parameter;
    }
  } catch (err) {
    return jsonResponse_({ ok: false, error: 'Invalid JSON: ' + err.message });
  }
  return handleRequest_(params);
}

function handleRequest_(params) {
  if (params.apiKey !== API_KEY) {
    return jsonResponse_({ ok: false, error: 'Unauthorized' });
  }

  const action = params.action;
  let payload = params.payload;
  if (typeof payload === 'string') {
    try { payload = JSON.parse(payload); } catch (e) { /* leave as-is */ }
  }
  payload = payload || {};

  try {
    let result;
    switch (action) {
      case 'getCatalog':           result = getCatalog_(); break;
      case 'getConfig':            result = getConfig_(); break;
      case 'getWorkoutLog':        result = getWorkoutLog_(payload); break;
      case 'getRecentSets':        result = getRecentSets_(payload); break;
      case 'logWorkoutSet':        result = logWorkoutSet_(payload); break;
      case 'logWorkoutSession':    result = logWorkoutSession_(payload); break;
      case 'deleteWorkoutSet':     result = deleteWorkoutSet_(payload); break;
      case 'getWeeklyCheckIns':    result = getWeeklyCheckIns_(); break;
      case 'upsertWeeklyCheckIn':  result = upsertWeeklyCheckIn_(payload); break;
      case 'getWhoopDaily':        result = getWhoopDaily_(payload); break;
      case 'upsertWhoopDaily':     result = upsertWhoopDaily_(payload); break;
      case 'getZone2Log':          result = getZone2Log_(); break;
      case 'logZone2':             result = logZone2_(payload); break;
      case 'getRecoveryLog':       result = getRecoveryLog_(); break;
      case 'logRecovery':          result = logRecovery_(payload); break;
      case 'summary':              result = summary_(); break;
      default:
        return jsonResponse_({ ok: false, error: 'Unknown action: ' + action });
    }
    return jsonResponse_({ ok: true, data: result });
  } catch (err) {
    return jsonResponse_({ ok: false, error: err.message, stack: err.stack });
  }
}

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// CORE HELPERS
// ============================================================

function ss_() {
  return SHEET_ID ? SpreadsheetApp.openById(SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
}

function sheet_(name) {
  const sh = ss_().getSheetByName(name);
  if (!sh) throw new Error('Sheet not found: ' + name);
  return sh;
}

function readTable_(name) {
  const sh = sheet_(name);
  const range = sh.getDataRange();
  const values = range.getValues();
  if (values.length < 1) return { headers: [], rows: [] };
  const headers = values[0].map(h => String(h));
  const rows = [];
  for (let i = 1; i < values.length; i++) {
    const obj = { _row: i + 1 };
    let hasAny = false;
    for (let j = 0; j < headers.length; j++) {
      const v = values[i][j];
      obj[headers[j]] = v;
      if (v !== '' && v !== null) hasAny = true;
    }
    if (hasAny) rows.push(obj);
  }
  return { headers, rows };
}

function appendRow_(name, headerOrderedValues) {
  sheet_(name).appendRow(headerOrderedValues);
}

function appendObject_(name, obj) {
  const sh = sheet_(name);
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  const row = headers.map(h => {
    if (h === 'id' && (obj[h] === undefined || obj[h] === '')) return Utilities.getUuid();
    return obj[h] !== undefined ? obj[h] : '';
  });
  sh.appendRow(row);
  return row;
}

function findRowByCol_(name, col, value) {
  const sh = sheet_(name);
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  const colIdx = headers.indexOf(col);
  if (colIdx < 0) return -1;
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return -1;
  const colVals = sh.getRange(2, colIdx + 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < colVals.length; i++) {
    if (String(colVals[i][0]) === String(value)) return i + 2;
  }
  return -1;
}

function updateRowByObject_(name, rowIndex, obj) {
  const sh = sheet_(name);
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  const current = sh.getRange(rowIndex, 1, 1, headers.length).getValues()[0];
  const updated = headers.map((h, i) => obj[h] !== undefined ? obj[h] : current[i]);
  sh.getRange(rowIndex, 1, 1, headers.length).setValues([updated]);
  return updated;
}

function isoDate_(d) {
  if (!d) return '';
  if (d instanceof Date) return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return String(d);
}

// ============================================================
// CATALOG / CONFIG
// ============================================================

function getCatalog_() {
  const t = readTable_(SHEETS.CATALOG);
  return t.rows.map(r => ({
    phase: r.phase,
    day: r.day,
    order: Number(r.order),
    exercise: r.exercise,
    sets: Number(r.sets),
    reps: r.reps,
    note: r.note
  }));
}

function getConfig_() {
  const t = readTable_(SHEETS.CONFIG);
  const out = {};
  t.rows.forEach(r => { out[r.key] = r.value; });
  return out;
}

// ============================================================
// WORKOUT LOG
// ============================================================

function getWorkoutLog_(filter) {
  filter = filter || {};
  const t = readTable_(SHEETS.WORKOUT);
  let rows = t.rows;
  if (filter.phase) rows = rows.filter(r => r.phase === filter.phase);
  if (filter.day) rows = rows.filter(r => r.day === filter.day);
  if (filter.week !== undefined) rows = rows.filter(r => Number(r.week) === Number(filter.week));
  if (filter.exercise) rows = rows.filter(r => r.exercise === filter.exercise);
  if (filter.date) rows = rows.filter(r => isoDate_(r.date) === filter.date);
  return rows.map(normalizeWorkoutRow_).sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

function normalizeWorkoutRow_(r) {
  return {
    id: r.id,
    date: isoDate_(r.date),
    week: Number(r.week) || null,
    phase: r.phase,
    day: r.day,
    exercise: r.exercise,
    set_number: Number(r.set_number) || null,
    weight: r.weight === '' ? null : Number(r.weight),
    reps: r.reps === '' ? null : Number(r.reps),
    whoop: r.whoop === '' ? null : Number(r.whoop),
    sleep_hrs: r.sleep_hrs === '' ? null : Number(r.sleep_hrs),
    session_notes: r.session_notes || ''
  };
}

function getRecentSets_(payload) {
  if (!payload.exercise) throw new Error('exercise required');
  const t = readTable_(SHEETS.WORKOUT);
  const filtered = t.rows
    .filter(r => r.exercise === payload.exercise)
    .map(normalizeWorkoutRow_)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const limit = Number(payload.limit || 10);
  return filtered.slice(0, limit);
}

function logWorkoutSet_(payload) {
  if (!payload.date || !payload.exercise) throw new Error('date and exercise required');
  payload.id = payload.id || Utilities.getUuid();
  appendObject_(SHEETS.WORKOUT, payload);
  return payload;
}

function logWorkoutSession_(payload) {
  // payload: { date, week, phase, day, whoop, sleep_hrs, session_notes, sets: [{exercise, set_number, weight, reps}] }
  if (!Array.isArray(payload.sets) || !payload.sets.length) throw new Error('sets required');
  const written = [];
  payload.sets.forEach(s => {
    const row = {
      id: Utilities.getUuid(),
      date: payload.date,
      week: payload.week,
      phase: payload.phase,
      day: payload.day,
      exercise: s.exercise,
      set_number: s.set_number,
      weight: s.weight,
      reps: s.reps,
      whoop: payload.whoop,
      sleep_hrs: payload.sleep_hrs,
      session_notes: payload.session_notes
    };
    appendObject_(SHEETS.WORKOUT, row);
    written.push(row);
  });
  return { count: written.length, sets: written };
}

function deleteWorkoutSet_(payload) {
  if (!payload.id) throw new Error('id required');
  const rowIdx = findRowByCol_(SHEETS.WORKOUT, 'id', payload.id);
  if (rowIdx < 0) throw new Error('Set not found');
  sheet_(SHEETS.WORKOUT).deleteRow(rowIdx);
  return { deleted: payload.id };
}

// ============================================================
// WEEKLY CHECK-IN
// ============================================================

function getWeeklyCheckIns_() {
  const t = readTable_(SHEETS.WEEKLY);
  return t.rows.map(r => ({
    week: Number(r.week),
    date: isoDate_(r.date),
    weight_lbs: r.weight_lbs === '' ? null : Number(r.weight_lbs),
    body_fat_pct: r.body_fat_pct === '' ? null : Number(r.body_fat_pct),
    avg_whoop: r.avg_whoop === '' ? null : Number(r.avg_whoop),
    avg_sleep_hrs: r.avg_sleep_hrs === '' ? null : Number(r.avg_sleep_hrs),
    stress_1_10: r.stress_1_10 === '' ? null : Number(r.stress_1_10),
    notes: r.notes || ''
  }));
}

function upsertWeeklyCheckIn_(payload) {
  if (payload.week === undefined) throw new Error('week required');
  const rowIdx = findRowByCol_(SHEETS.WEEKLY, 'week', payload.week);
  if (rowIdx > 0) {
    return updateRowByObject_(SHEETS.WEEKLY, rowIdx, payload);
  } else {
    appendObject_(SHEETS.WEEKLY, payload);
    return payload;
  }
}

// ============================================================
// WHOOP DAILY
// ============================================================

function getWhoopDaily_(payload) {
  payload = payload || {};
  const t = readTable_(SHEETS.WHOOP);
  let rows = t.rows.map(r => ({
    date: isoDate_(r.date),
    recovery_pct: r.recovery_pct === '' ? null : Number(r.recovery_pct),
    sleep_hrs: r.sleep_hrs === '' ? null : Number(r.sleep_hrs),
    hrv: r.hrv === '' ? null : Number(r.hrv),
    rhr: r.rhr === '' ? null : Number(r.rhr),
    strain: r.strain === '' ? null : Number(r.strain),
    status: r.status,
    notes: r.notes || ''
  }));
  rows.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  if (payload.limit) rows = rows.slice(0, Number(payload.limit));
  return rows;
}

function upsertWhoopDaily_(payload) {
  if (!payload.date) throw new Error('date required');
  // derive status if missing
  if (!payload.status && payload.recovery_pct !== undefined && payload.recovery_pct !== null) {
    const r = Number(payload.recovery_pct);
    if (r >= 70) payload.status = 'GREEN';
    else if (r >= 33) payload.status = 'YELLOW';
    else if (r >= 20) payload.status = 'RED';
    else payload.status = 'SKIP';
  }
  const rowIdx = findRowByCol_(SHEETS.WHOOP, 'date', payload.date);
  if (rowIdx > 0) {
    return updateRowByObject_(SHEETS.WHOOP, rowIdx, payload);
  } else {
    appendObject_(SHEETS.WHOOP, payload);
    return payload;
  }
}

// ============================================================
// ZONE 2
// ============================================================

function getZone2Log_() {
  const t = readTable_(SHEETS.ZONE2);
  return t.rows.map(r => ({
    date: isoDate_(r.date),
    week: Number(r.week) || null,
    modality: r.modality,
    duration_min: r.duration_min === '' ? null : Number(r.duration_min),
    avg_hr: r.avg_hr === '' ? null : Number(r.avg_hr),
    notes: r.notes || ''
  })).sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

function logZone2_(payload) {
  if (!payload.date) throw new Error('date required');
  appendObject_(SHEETS.ZONE2, payload);
  return payload;
}

// ============================================================
// RECOVERY
// ============================================================

function getRecoveryLog_() {
  const t = readTable_(SHEETS.RECOVERY);
  return t.rows.map(r => ({
    date: isoDate_(r.date),
    week: Number(r.week) || null,
    foam_rolling: !!r.foam_rolling,
    cold_tub: !!r.cold_tub,
    hot_tub: !!r.hot_tub,
    legs_up_wall: !!r.legs_up_wall,
    box_breathing: !!r.box_breathing,
    protein_carbs: !!r.protein_carbs,
    time_spent_min: r.time_spent_min === '' ? null : Number(r.time_spent_min),
    notes: r.notes || ''
  })).sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

function logRecovery_(payload) {
  if (!payload.date) throw new Error('date required');
  appendObject_(SHEETS.RECOVERY, payload);
  return payload;
}

// ============================================================
// SUMMARY
// ============================================================

function summary_() {
  const config = getConfig_();
  const blockStart = config.block_start_date ? new Date(config.block_start_date) : new Date();
  const today = new Date();
  const dayMs = 1000 * 60 * 60 * 24;
  const daysIn = Math.floor((today - blockStart) / dayMs);
  const currentWeek = Math.max(1, Math.min(8, Math.floor(daysIn / 7) + 1));
  const currentPhase = currentWeek <= 4 ? 'P1' : 'P2';

  const whoop = getWhoopDaily_({});
  const lastWhoop = whoop[0] || null;

  const workouts = readTable_(SHEETS.WORKOUT).rows;
  const weeklyVolume = {};
  workouts.forEach(r => {
    const w = Number(r.week);
    const wt = Number(r.weight);
    const reps = Number(r.reps);
    if (!isNaN(w) && !isNaN(wt) && !isNaN(reps)) {
      weeklyVolume[w] = (weeklyVolume[w] || 0) + (wt * reps);
    }
  });

  const checkIns = getWeeklyCheckIns_();

  return {
    currentWeek,
    currentPhase,
    blockStart: config.block_start_date,
    blockEnd: config.block_end_date,
    lastWhoop,
    weeklyVolume,
    checkIns,
    totalSetsLogged: workouts.length,
    config
  };
}
