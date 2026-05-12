"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { Save } from "lucide-react";
import { fetcher, postAction } from "@/lib/fetcher";
import { haptic } from "@/lib/haptics";
import type { WeeklyCheckIn, SummaryData } from "@/types";
import { todayIso } from "@/lib/helpers";
import PageHeader from "@/components/PageHeader";

export default function CheckInPage() {
  const { data: summary } = useSWR<SummaryData>("/api/sheets/summary", fetcher);
  const { data: checkIns, mutate } = useSWR<WeeklyCheckIn[]>("/api/sheets/getWeeklyCheckIns", fetcher);

  const [week, setWeek] = useState<number>(1);
  const [date, setDate] = useState(todayIso());
  const [weight, setWeight] = useState("");
  const [bf, setBf] = useState("");
  const [whoop, setWhoop] = useState("");
  const [sleep, setSleep] = useState("");
  const [stress, setStress] = useState("");
  const [notes, setNotes] = useState("");

  // Default to current week
  useEffect(() => {
    if (summary?.currentWeek) setWeek(summary.currentWeek);
  }, [summary]);

  // Pre-fill if check-in exists for selected week
  useEffect(() => {
    const existing = checkIns?.find(c => c.week === week);
    if (existing) {
      setDate(existing.date || todayIso());
      setWeight(existing.weight_lbs != null ? String(existing.weight_lbs) : "");
      setBf(existing.body_fat_pct != null ? String(existing.body_fat_pct) : "");
      setWhoop(existing.avg_whoop != null ? String(existing.avg_whoop) : "");
      setSleep(existing.avg_sleep_hrs != null ? String(existing.avg_sleep_hrs) : "");
      setStress(existing.stress_1_10 != null ? String(existing.stress_1_10) : "");
      setNotes(existing.notes || "");
    } else {
      setDate(todayIso());
      setWeight(""); setBf(""); setWhoop(""); setSleep(""); setStress(""); setNotes("");
    }
  }, [week, checkIns]);

  async function save() {
    haptic("tap");
    const payload: Partial<WeeklyCheckIn> = {
      week,
      date,
      weight_lbs: weight ? Number(weight) : null,
      body_fat_pct: bf ? Number(bf) : null,
      avg_whoop: whoop ? Number(whoop) : null,
      avg_sleep_hrs: sleep ? Number(sleep) : null,
      stress_1_10: stress ? Number(stress) : null,
      notes,
    };
    const promise = postAction("upsertWeeklyCheckIn", payload);
    toast.promise(promise, {
      loading: "Saving...",
      success: () => { haptic("success"); return "Check-in saved"; },
      error: e => { haptic("error"); return e.message; },
    });
    await promise.catch(() => {});
    mutate();
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <PageHeader title="Weekly check-in" subtitle="Once per week" />

      <div className="card p-4">
        <div className="label">Week</div>
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 8 }, (_, i) => i + 1).map(w => (
            <button
              key={w}
              onClick={() => setWeek(w)}
              className={`btn ${week === w ? "btn-primary" : "btn-ghost"} ${w > 4 ? (week === w ? "" : "border-phase-two/40") : ""}`}
            >
              {w}
            </button>
          ))}
        </div>
        <div className="text-xs text-ink-dim mt-2">
          Wks 1-4 = Phase 1 · Wks 5-8 = Phase 2
        </div>
      </div>

      <div className="card p-4 space-y-4">
        <div>
          <div className="label">Date</div>
          <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="label">Weight (lbs)</div>
            <input type="number" inputMode="decimal" step="0.1" className="input" placeholder="184.0" value={weight} onChange={e => setWeight(e.target.value)} />
          </div>
          <div>
            <div className="label">Body fat %</div>
            <input type="number" inputMode="decimal" step="0.1" className="input" placeholder="12.0" value={bf} onChange={e => setBf(e.target.value)} />
          </div>
          <div>
            <div className="label">Avg Whoop</div>
            <input type="number" inputMode="numeric" className="input" placeholder="50" value={whoop} onChange={e => setWhoop(e.target.value)} />
          </div>
          <div>
            <div className="label">Avg sleep</div>
            <input type="number" inputMode="decimal" step="0.1" className="input" placeholder="6.5" value={sleep} onChange={e => setSleep(e.target.value)} />
          </div>
          <div className="col-span-2">
            <div className="label">Stress (1-10)</div>
            <input type="number" inputMode="numeric" min={1} max={10} className="input" placeholder="5" value={stress} onChange={e => setStress(e.target.value)} />
          </div>
        </div>
        <div>
          <div className="label">Notes</div>
          <textarea className="input min-h-[80px] resize-none" placeholder="How the week went..." value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
        <button onClick={save} className="btn btn-primary w-full">
          <Save className="w-4 h-4" /> Save check-in
        </button>
      </div>

      {checkIns && checkIns.some(c => c.weight_lbs != null) && (
        <div className="card p-4">
          <div className="text-xs uppercase tracking-wide text-ink-muted font-semibold mb-3">
            All weeks
          </div>
          <div className="space-y-2">
            {checkIns.map(c => (
              <div key={c.week} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <div className="text-sm font-medium">Week {c.week}</div>
                  <div className="text-xs text-ink-dim">{c.date || "Not logged"}</div>
                </div>
                <div className="text-right text-xs tabular-nums">
                  {c.weight_lbs != null && <div className="text-ink">{c.weight_lbs} lbs</div>}
                  {c.body_fat_pct != null && <div className="text-ink-muted">{c.body_fat_pct}% BF</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
