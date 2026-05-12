"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
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
  const [selectedExercise, setSelectedExercise] = useState<string>("");

  const exerciseNames = useMemo(() => {
    const names = new Set<string>();
    (log ?? []).forEach(s => names.add(s.exercise));
    return Array.from(names).sort();
  }, [log]);

  const activeExercise = selectedExercise || exerciseNames[0] || "";

  const progressData = useMemo(() => {
    if (!activeExercise || !log) return [];
    const byDate = new Map<string, { date: string; maxWeight: number }>();
    log
      .filter(s => s.exercise === activeExercise && s.weight != null)
      .forEach(s => {
        const entry = byDate.get(s.date);
        if (!entry) {
          byDate.set(s.date, { date: s.date, maxWeight: s.weight! });
        } else {
          entry.maxWeight = Math.max(entry.maxWeight, s.weight!);
        }
      });
    return Array.from(byDate.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-8)
      .map(d => ({ date: d.date.slice(5), maxWeight: d.maxWeight }));
  }, [log, activeExercise]);

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

      {/* Exercise progress chart */}
      {exerciseNames.length > 0 && (
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs uppercase tracking-wide text-ink-muted font-semibold shrink-0">
              Progress
            </div>
            <select
              value={activeExercise}
              onChange={e => setSelectedExercise(e.target.value)}
              className="input text-xs py-1 px-2 h-auto min-w-0 truncate"
            >
              {exerciseNames.map(ex => (
                <option key={ex} value={ex}>{ex}</option>
              ))}
            </select>
          </div>
          {progressData.length >= 2 ? (
            <>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={progressData}>
                    <CartesianGrid strokeDasharray="2 4" stroke="#1F2937" vertical={false} />
                    <XAxis dataKey="date" stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis
                      stroke="#64748B"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      domain={["dataMin - 5", "dataMax + 5"]}
                      unit=" lbs"
                    />
                    <Tooltip
                      contentStyle={{ background: "#1A2233", border: "1px solid #1F2937", borderRadius: 10 }}
                      labelStyle={{ color: "#F1F5F9" }}
                      formatter={(v: number) => [`${v} lbs`, "Top set"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="maxWeight"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      dot={{ fill: "#3B82F6", r: 4 }}
                      activeDot={{ r: 6, fill: "#3B82F6" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="text-[10px] text-ink-dim text-right">
                Heaviest set per session · last {progressData.length} sessions
              </div>
            </>
          ) : (
            <div className="text-sm text-ink-muted py-4 text-center">
              Log at least 2 sessions to see progress
            </div>
          )}
        </div>
      )}

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
