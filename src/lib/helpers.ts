import type { Phase, WhoopStatus } from "@/types";

export function statusFromRecovery(recovery: number | null | undefined): WhoopStatus {
  if (recovery == null) return "YELLOW";
  if (recovery >= 70) return "GREEN";
  if (recovery >= 33) return "YELLOW";
  if (recovery >= 20) return "RED";
  return "SKIP";
}

export function statusColor(s: WhoopStatus) {
  return {
    GREEN: "text-whoop-green",
    YELLOW: "text-whoop-yellow",
    RED: "text-whoop-red",
    SKIP: "text-whoop-skip",
  }[s];
}

export function statusBg(s: WhoopStatus) {
  return {
    GREEN: "bg-whoop-green/15 border-whoop-green/40",
    YELLOW: "bg-whoop-yellow/15 border-whoop-yellow/40",
    RED: "bg-whoop-red/15 border-whoop-red/40",
    SKIP: "bg-whoop-skip/15 border-whoop-skip/40",
  }[s];
}

export function statusLabel(s: WhoopStatus) {
  return s.charAt(0) + s.slice(1).toLowerCase();
}

export function statusGuidance(s: WhoopStatus): string {
  return {
    GREEN: "Full session - chase progressive overload, hit top sets",
    YELLOW: "Full session, back off top sets ~10%, cut last set per exercise",
    RED: "RED DAY MEC: cut volume 40%, no PRs, minimum effective dose only",
    SKIP: "SKIP IT. 20-min walk + mobility. Train tomorrow.",
  }[s];
}

export function phaseLabel(p: Phase) {
  return p === "P1" ? "Phase 1 — Strength" : "Phase 2 — Hypertrophy";
}

export function phaseColor(p: Phase) {
  return p === "P1" ? "text-phase-one" : "text-phase-two";
}

export function phaseBg(p: Phase) {
  return p === "P1" ? "bg-phase-one/15 border-phase-one/40" : "bg-phase-two/15 border-phase-two/40";
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function computeWeek(blockStart: string | undefined): number {
  if (!blockStart) return 1;
  const start = new Date(blockStart);
  const today = new Date();
  const days = Math.floor((today.getTime() - start.getTime()) / 86400000);
  return Math.max(1, Math.min(8, Math.floor(days / 7) + 1));
}

export function computePhase(week: number): Phase {
  return week <= 4 ? "P1" : "P2";
}
