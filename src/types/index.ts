export type Phase = "P1" | "P2";
export type DayLetter = "A" | "B" | "C";
export type WhoopStatus = "GREEN" | "YELLOW" | "RED" | "SKIP";

export interface CatalogExercise {
  phase: Phase;
  day: DayLetter;
  order: number;
  exercise: string;
  sets: number;
  reps: string;
  note: string;
}

export interface WorkoutSet {
  id: string;
  date: string;
  week: number | null;
  phase: Phase;
  day: DayLetter;
  exercise: string;
  set_number: number | null;
  weight: number | null;
  reps: number | null;
  whoop: number | null;
  sleep_hrs: number | null;
  session_notes: string;
}

export interface WeeklyCheckIn {
  week: number;
  date: string;
  weight_lbs: number | null;
  body_fat_pct: number | null;
  avg_whoop: number | null;
  avg_sleep_hrs: number | null;
  stress_1_10: number | null;
  notes: string;
}

export interface WhoopDailyEntry {
  date: string;
  recovery_pct: number | null;
  sleep_hrs: number | null;
  hrv: number | null;
  rhr: number | null;
  strain: number | null;
  status: WhoopStatus;
  notes: string;
}

export interface Zone2Session {
  date: string;
  week: number | null;
  modality: string;
  duration_min: number | null;
  avg_hr: number | null;
  notes: string;
}

export interface RecoverySession {
  date: string;
  week: number | null;
  foam_rolling: boolean;
  cold_tub: boolean;
  hot_tub: boolean;
  legs_up_wall: boolean;
  box_breathing: boolean;
  protein_carbs: boolean;
  time_spent_min: number | null;
  notes: string;
}

export interface SummaryData {
  currentWeek: number;
  currentPhase: Phase;
  blockStart: string;
  blockEnd: string;
  lastWhoop: WhoopDailyEntry | null;
  weeklyVolume: Record<string, number>;
  checkIns: WeeklyCheckIn[];
  totalSetsLogged: number;
  config: Record<string, string>;
}
