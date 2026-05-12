"use client";

import useSWR from "swr";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { fetcher, postAction } from "@/lib/fetcher";
import type { WorkoutSet, Phase } from "@/types";
import { phaseColor, phaseLabel } from "@/lib/helpers";
import { haptic } from "@/lib/haptics";
import PageHeader from "@/components/PageHeader";
import SwipeRow from "@/components/SwipeRow";

interface SessionGroup {
  key: string;
  date: string;
  phase: Phase;
  day: string;
  week: number | null;
  whoop: number | null;
  sleep: number | null;
  notes: string;
  sets: WorkoutSet[];
  totalVolume: number;
}

export default function HistoryPage() {
  const { data: log, mutate } = useSWR<WorkoutSet[]>("/api/sheets/getWorkoutLog", fetcher);

  const sessions: SessionGroup[] = [];
  const map = new Map<string, SessionGroup>();
  (log ?? []).forEach(s => {
    const key = `${s.date}|${s.phase}|${s.day}`;
    let g = map.get(key);
    if (!g) {
      g = {
        key,
        date: s.date,
        phase: s.phase,
        day: s.day,
        week: s.week,
        whoop: s.whoop,
        sleep: s.sleep_hrs,
        notes: s.session_notes,
        sets: [],
        totalVolume: 0,
      };
      map.set(key, g);
      sessions.push(g);
    }
    g.sets.push(s);
    g.totalVolume += (s.weight ?? 0) * (s.reps ?? 0);
  });
  sessions.sort((a, b) => b.date.localeCompare(a.date));

  async function deleteSession(s: SessionGroup) {
    if (!confirm(`Delete entire ${s.date} session (${s.sets.length} sets)?`)) return;
    haptic("warn");
    const promise = Promise.all(s.sets.map(set => postAction("deleteWorkoutSet", { id: set.id })));
    toast.promise(promise, {
      loading: "Deleting...",
      success: () => { haptic("success"); return "Session deleted"; },
      error: e => { haptic("error"); return e.message; },
    });
    await promise.catch(() => {});
    mutate();
  }

  async function deleteSet(id: string) {
    haptic("warn");
    const promise = postAction("deleteWorkoutSet", { id });
    toast.promise(promise, {
      loading: "Deleting...",
      success: () => { haptic("success"); return "Set deleted"; },
      error: e => { haptic("error"); return e.message; },
    });
    await promise.catch(() => {});
    mutate();
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <PageHeader title="History" subtitle={`${sessions.length} sessions · swipe left to delete`} />

      {sessions.length === 0 && (
        <div className="card p-6 text-center text-ink-muted">
          No sessions logged yet. Hit the Log tab to start.
        </div>
      )}

      <div className="space-y-3">
        {sessions.map(s => {
          const grouped: Record<string, WorkoutSet[]> = {};
          s.sets.forEach(set => {
            if (!grouped[set.exercise]) grouped[set.exercise] = [];
            grouped[set.exercise].push(set);
          });
          return (
            <SwipeRow key={s.key} onDelete={() => deleteSession(s)} className="rounded-lg border border-border">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-semibold">
                      Day {s.day} <span className={`text-xs ml-1 ${phaseColor(s.phase)}`}>{phaseLabel(s.phase)}</span>
                    </div>
                    <div className="text-xs text-ink-muted mt-0.5">
                      {s.date} · Wk {s.week ?? "—"}
                    </div>
                  </div>
                  <div className="text-right text-xs tabular-nums">
                    <div className="font-bold text-ink">{s.totalVolume.toLocaleString()}</div>
                    <div className="text-ink-dim">lbs volume</div>
                  </div>
                </div>

                {(s.whoop != null || s.sleep != null) && (
                  <div className="flex gap-3 text-xs text-ink-muted mb-3">
                    {s.whoop != null && <span>Whoop {s.whoop}%</span>}
                    {s.sleep != null && <span>Sleep {s.sleep}h</span>}
                  </div>
                )}

                <div className="space-y-2.5">
                  {Object.entries(grouped).map(([ex, sets]) => (
                    <div key={ex}>
                      <div className="text-xs font-medium text-ink mb-1">{ex}</div>
                      <div className="flex flex-wrap gap-1.5">
                        {sets.sort((a, b) => (a.set_number ?? 0) - (b.set_number ?? 0)).map(set => (
                          <button
                            key={set.id}
                            onClick={() => {
                              if (confirm(`Delete ${set.weight}×${set.reps}?`)) deleteSet(set.id);
                            }}
                            className="text-xs bg-bg-elevated px-2 py-1 rounded border border-border tabular-nums hover:border-whoop-red/50 hover:text-whoop-red transition-colors"
                            title="Tap to delete"
                          >
                            {set.weight}×{set.reps}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {s.notes && (
                  <div className="text-xs text-ink-dim mt-3 pt-3 border-t border-border italic">
                    {s.notes}
                  </div>
                )}
              </motion.div>
            </SwipeRow>
          );
        })}
      </div>
    </motion.div>
  );
}
