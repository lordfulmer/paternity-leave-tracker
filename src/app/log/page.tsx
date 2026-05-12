"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import useSWR from "swr";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { Plus, Save, X, Timer, Check } from "lucide-react";
import { fetcher, postAction } from "@/lib/fetcher";
import { haptic } from "@/lib/haptics";
import type { CatalogExercise, Phase, DayLetter, SummaryData, WorkoutSet } from "@/types";
import { phaseLabel, todayIso } from "@/lib/helpers";
import PageHeader from "@/components/PageHeader";
import Segmented from "@/components/Segmented";
import RestTimer from "@/components/RestTimer";

interface SetInput {
  weight: string;
  reps: string;
  done: boolean;
}

interface ExerciseState {
  sets: SetInput[];
  prevWeight?: number | null;
  prevReps?: number | null;
  lastSessionSets?: { weight: number; reps: number }[];
}

export default function LogPage() {
  const { data: summary } = useSWR<SummaryData>("/api/sheets/summary", fetcher);
  const { data: catalog, isLoading: catLoading } = useSWR<CatalogExercise[]>("/api/sheets/getCatalog", fetcher);

  const [phaseOverride, setPhaseOverride] = useState<Phase | null>(null);
  const [day, setDay] = useState<DayLetter>("A");
  const [date, setDate] = useState(todayIso());
  const [whoop, setWhoop] = useState<string>("");
  const [sleep, setSleep] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [showTimer, setShowTimer] = useState(false);
  const [timerStart, setTimerStart] = useState(90);

  const phase: Phase = phaseOverride ?? (summary?.currentPhase ?? "P1");
  const week = summary?.currentWeek ?? 1;

  useEffect(() => {
    if (summary?.lastWhoop && summary.lastWhoop.date === date) {
      if (summary.lastWhoop.recovery_pct != null) setWhoop(String(summary.lastWhoop.recovery_pct));
      if (summary.lastWhoop.sleep_hrs != null) setSleep(String(summary.lastWhoop.sleep_hrs));
    }
  }, [summary, date]);

  const exercises = useMemo(
    () => (catalog ?? []).filter(e => e.phase === phase && e.day === day).sort((a, b) => a.order - b.order),
    [catalog, phase, day]
  );

  const [exState, setExState] = useState<Record<string, ExerciseState>>({});

  // Refs for auto-focus chain: key = `${exercise}-${setIdx}-${field}`
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    const next: Record<string, ExerciseState> = {};
    exercises.forEach(ex => {
      next[ex.exercise] = exState[ex.exercise] ?? {
        sets: Array.from({ length: ex.sets }, () => ({ weight: "", reps: "", done: false })),
      };
    });
    setExState(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, day, catalog]);

  useEffect(() => {
    if (!exercises.length) return;
    Promise.all(
      exercises.map(ex =>
        fetch(`/api/sheets/getRecentSets?exercise=${encodeURIComponent(ex.exercise)}&limit=10`)
          .then(r => r.json())
          .then(j => {
            const recent = (j.data ?? []) as WorkoutSet[];
            if (!recent.length) return { ex: ex.exercise, last: undefined, lastSessionSets: [] };
            const latestDate = recent[0].date;
            const lastSessionSets = recent
              .filter(s => s.date === latestDate && s.weight != null && s.reps != null)
              .sort((a, b) => (a.set_number ?? 0) - (b.set_number ?? 0))
              .map(s => ({ weight: s.weight!, reps: s.reps! }));
            return { ex: ex.exercise, last: recent[0], lastSessionSets };
          })
          .catch(() => ({ ex: ex.exercise, last: undefined, lastSessionSets: [] }))
      )
    ).then(results => {
      setExState(prev => {
        const next = { ...prev };
        results.forEach(({ ex, last, lastSessionSets }) => {
          if (next[ex]) {
            next[ex] = {
              ...next[ex],
              prevWeight: last?.weight ?? null,
              prevReps: last?.reps ?? null,
              lastSessionSets,
            };
          }
        });
        return next;
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercises.length, phase, day]);

  const updateSet = useCallback((exercise: string, idx: number, field: "weight" | "reps", value: string) => {
    setExState(s => {
      const cur = s[exercise];
      if (!cur) return s;
      const sets = [...cur.sets];
      sets[idx] = { ...sets[idx], [field]: value };
      return { ...s, [exercise]: { ...cur, sets } };
    });
  }, []);

  const addSet = (exercise: string) => {
    haptic("tap");
    setExState(s => {
      const cur = s[exercise];
      if (!cur) return s;
      return { ...s, [exercise]: { ...cur, sets: [...cur.sets, { weight: "", reps: "", done: false }] } };
    });
  };

  const removeSet = (exercise: string, idx: number) => {
    haptic("warn");
    setExState(s => {
      const cur = s[exercise];
      if (!cur || cur.sets.length <= 1) return s;
      return { ...s, [exercise]: { ...cur, sets: cur.sets.filter((_, i) => i !== idx) } };
    });
  };

  // Mark set as "done" (visual feedback) and start rest timer
  const completeSet = (exercise: string, idx: number, restSec: number = 90) => {
    const cur = exState[exercise];
    if (!cur) return;
    const set = cur.sets[idx];
    if (!set || !set.weight || !set.reps) return;

    haptic("success");
    setExState(s => {
      const c = s[exercise];
      if (!c) return s;
      const sets = [...c.sets];
      sets[idx] = { ...sets[idx], done: true };
      return { ...s, [exercise]: { ...c, sets } };
    });

    // Start rest timer
    setTimerStart(restSec);
    setShowTimer(true);

    // Auto-focus next set's weight field, or next exercise's first set
    setTimeout(() => {
      const nextSetKey = `${exercise}-${idx + 1}-weight`;
      if (inputRefs.current[nextSetKey]) {
        inputRefs.current[nextSetKey]?.focus();
        return;
      }
      // Move to next exercise
      const exIdx = exercises.findIndex(e => e.exercise === exercise);
      if (exIdx >= 0 && exIdx < exercises.length - 1) {
        const next = exercises[exIdx + 1];
        const k = `${next.exercise}-0-weight`;
        inputRefs.current[k]?.focus();
      }
    }, 100);
  };

  // Auto-focus from weight to reps on Tab/Enter
  const handleWeightKey = (e: React.KeyboardEvent, exercise: string, idx: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const k = `${exercise}-${idx}-reps`;
      inputRefs.current[k]?.focus();
    }
  };

  const handleRepsKey = (e: React.KeyboardEvent, exercise: string, idx: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      completeSet(exercise, idx);
    }
  };

  const sessionSets = useMemo(() => {
    const out: { exercise: string; set_number: number; weight: number; reps: number }[] = [];
    exercises.forEach(ex => {
      const st = exState[ex.exercise];
      if (!st) return;
      st.sets.forEach((s, i) => {
        const wt = parseFloat(s.weight);
        const rp = parseInt(s.reps);
        if (!isNaN(wt) && !isNaN(rp) && rp > 0) {
          out.push({ exercise: ex.exercise, set_number: i + 1, weight: wt, reps: rp });
        }
      });
    });
    return out;
  }, [exState, exercises]);

  const totalVolume = useMemo(
    () => sessionSets.reduce((sum, s) => sum + s.weight * s.reps, 0),
    [sessionSets]
  );

  async function saveSession() {
    if (sessionSets.length === 0) {
      haptic("error");
      toast.error("Log at least one set");
      return;
    }
    haptic("tap");
    const payload = {
      date,
      week,
      phase,
      day,
      whoop: whoop ? Number(whoop) : null,
      sleep_hrs: sleep ? Number(sleep) : null,
      session_notes: notes,
      sets: sessionSets,
    };
    const promise = postAction("logWorkoutSession", payload);
    toast.promise(promise, {
      loading: "Saving session...",
      success: () => {
        haptic("success");
        return `Logged ${sessionSets.length} sets`;
      },
      error: e => {
        haptic("error");
        return e.message;
      },
    });
    await promise.catch(() => {});
    const cleared: Record<string, ExerciseState> = {};
    exercises.forEach(ex => {
      const cur = exState[ex.exercise];
      cleared[ex.exercise] = {
        ...cur,
        sets: Array.from({ length: ex.sets }, () => ({ weight: "", reps: "", done: false })),
      };
    });
    setExState(cleared);
    setNotes("");
  }

  if (catLoading) return <div className="text-ink-muted">Loading...</div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <PageHeader
        title="Log workout"
        subtitle={`Week ${week} · ${phaseLabel(phase)}`}
        right={
          <button
            onClick={() => { haptic("tap"); setShowTimer(true); }}
            className="btn btn-ghost px-3 py-2"
            aria-label="Open rest timer"
          >
            <Timer className="w-4 h-4" />
          </button>
        }
      />

      {/* Phase + Day + meta */}
      <div className="card p-4 space-y-4">
        <div>
          <div className="label">Phase</div>
          <Segmented<Phase>
            value={phase}
            onChange={v => setPhaseOverride(v)}
            options={[
              { value: "P1", label: "Phase 1" },
              { value: "P2", label: "Phase 2" },
            ]}
          />
        </div>
        <div>
          <div className="label">Day</div>
          <Segmented<DayLetter>
            value={day}
            onChange={setDay}
            options={[
              { value: "A", label: "Day A" },
              { value: "B", label: "Day B" },
              { value: "C", label: "Day C" },
            ]}
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <div className="label">Date</div>
            <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div>
            <div className="label">Whoop %</div>
            <input
              type="number"
              inputMode="numeric"
              className="input"
              placeholder="—"
              value={whoop}
              onChange={e => setWhoop(e.target.value)}
            />
          </div>
          <div>
            <div className="label">Sleep hrs</div>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              className="input"
              placeholder="—"
              value={sleep}
              onChange={e => setSleep(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Exercises */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {exercises.map((ex, i) => {
            const st = exState[ex.exercise];
            return (
              <motion.div
                key={`${phase}-${day}-${ex.exercise}`}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: i * 0.03 }}
                className="card p-4"
              >
                <div className="mb-3">
                  <div className="font-semibold text-ink leading-tight">{ex.exercise}</div>
                  <div className="text-xs text-ink-muted mt-1">
                    {ex.sets} × {ex.reps}
                  </div>
                  {st?.lastSessionSets && st.lastSessionSets.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                      <span className="text-[10px] text-ink-dim uppercase tracking-wide">Last:</span>
                      {st.lastSessionSets.map((s, i) => (
                        <span
                          key={i}
                          className="text-[11px] bg-bg-elevated border border-border px-1.5 py-0.5 rounded tabular-nums text-ink-muted"
                        >
                          {s.weight}×{s.reps}
                        </span>
                      ))}
                    </div>
                  )}
                  {ex.note && <div className="text-xs text-ink-dim mt-1 italic">{ex.note}</div>}
                </div>

                <div className="space-y-2">
                  {st?.sets.map((s, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold border ${
                        s.done ? "bg-whoop-green/20 border-whoop-green text-whoop-green" : "border-border text-ink-muted"
                      }`}>
                        {s.done ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                      </div>
                      <input
                        ref={el => { inputRefs.current[`${ex.exercise}-${idx}-weight`] = el; }}
                        type="number"
                        inputMode="decimal"
                        step="2.5"
                        placeholder="weight"
                        className={`input flex-1 ${s.done ? "opacity-60" : ""}`}
                        value={s.weight}
                        onChange={e => updateSet(ex.exercise, idx, "weight", e.target.value)}
                        onKeyDown={e => handleWeightKey(e, ex.exercise, idx)}
                        enterKeyHint="next"
                      />
                      <input
                        ref={el => { inputRefs.current[`${ex.exercise}-${idx}-reps`] = el; }}
                        type="number"
                        inputMode="numeric"
                        placeholder="reps"
                        className={`input flex-1 ${s.done ? "opacity-60" : ""}`}
                        value={s.reps}
                        onChange={e => updateSet(ex.exercise, idx, "reps", e.target.value)}
                        onKeyDown={e => handleRepsKey(e, ex.exercise, idx)}
                        enterKeyHint="done"
                      />
                      <button
                        onClick={() => completeSet(ex.exercise, idx)}
                        disabled={!s.weight || !s.reps}
                        className={`w-10 h-10 rounded-DEFAULT flex items-center justify-center transition-colors ${
                          s.done
                            ? "bg-whoop-green/20 text-whoop-green"
                            : "bg-accent text-white disabled:opacity-30 disabled:cursor-not-allowed"
                        }`}
                        aria-label="Complete set + start timer"
                      >
                        {s.done ? <Check className="w-4 h-4" /> : <Timer className="w-4 h-4" />}
                      </button>
                      {st.sets.length > 1 && (
                        <button
                          onClick={() => removeSet(ex.exercise, idx)}
                          className="text-ink-dim hover:text-whoop-red p-1.5"
                          aria-label="Remove set"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => addSet(ex.exercise)}
                  className="mt-3 text-xs text-accent flex items-center gap-1.5 font-medium"
                >
                  <Plus className="w-3.5 h-3.5" /> Add set
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <div className="card p-4">
        <div className="label">Session notes</div>
        <textarea
          className="input min-h-[80px] resize-none"
          placeholder="How it felt, anything to remember..."
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
      </div>

      {/* Sticky save bar */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-[88px] left-0 right-0 z-40 px-4"
      >
        <div className="max-w-2xl mx-auto card-elev p-3 shadow-lg flex items-center gap-3">
          <div className="text-xs text-ink-muted">
            <div className="font-semibold text-ink">{sessionSets.length} sets</div>
            <div className="tabular-nums">{totalVolume.toLocaleString()} lbs</div>
          </div>
          <button
            onClick={saveSession}
            disabled={sessionSets.length === 0}
            className="btn btn-primary flex-1 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            Save session
          </button>
        </div>
      </motion.div>

      <AnimatePresence>
        {showTimer && (
          <RestTimer
            initialSeconds={timerStart}
            onClose={() => setShowTimer(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
