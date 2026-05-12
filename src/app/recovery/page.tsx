"use client";

import { useState } from "react";
import useSWR from "swr";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { Save, Check } from "lucide-react";
import { fetcher, postAction } from "@/lib/fetcher";
import { haptic } from "@/lib/haptics";
import type { RecoverySession, SummaryData } from "@/types";
import { todayIso } from "@/lib/helpers";
import PageHeader from "@/components/PageHeader";

const ITEMS: { key: keyof Pick<RecoverySession, "foam_rolling" | "cold_tub" | "hot_tub" | "legs_up_wall" | "box_breathing" | "protein_carbs">; label: string; sub: string }[] = [
  { key: "foam_rolling",   label: "Foam rolling",     sub: "10 min · quads, hams, lats, T-spine" },
  { key: "cold_tub",       label: "Cold tub",         sub: "3-4 min · 50-59°F" },
  { key: "hot_tub",        label: "Hot tub",          sub: "10-15 min · 100-104°F" },
  { key: "legs_up_wall",   label: "Legs up the wall", sub: "5-10 min" },
  { key: "box_breathing",  label: "Box breathing",    sub: "5 min · 4/4/4/4" },
  { key: "protein_carbs",  label: "Protein + carbs",  sub: "Within 60 min · 40-50g protein" },
];

export default function RecoveryPage() {
  const { data: summary } = useSWR<SummaryData>("/api/sheets/summary", fetcher);
  const { data: log, mutate } = useSWR<RecoverySession[]>("/api/sheets/getRecoveryLog", fetcher);

  const [date, setDate] = useState(todayIso());
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [checks, setChecks] = useState<Record<string, boolean>>({});

  function toggle(key: string) {
    haptic("tick");
    setChecks(c => ({ ...c, [key]: !c[key] }));
  }

  async function save() {
    haptic("tap");
    const payload: any = {
      date,
      week: summary?.currentWeek ?? null,
      foam_rolling: !!checks.foam_rolling,
      cold_tub: !!checks.cold_tub,
      hot_tub: !!checks.hot_tub,
      legs_up_wall: !!checks.legs_up_wall,
      box_breathing: !!checks.box_breathing,
      protein_carbs: !!checks.protein_carbs,
      time_spent_min: time ? Number(time) : null,
      notes,
    };
    const promise = postAction("logRecovery", payload);
    toast.promise(promise, {
      loading: "Saving...",
      success: () => { haptic("success"); return "Recovery logged"; },
      error: e => { haptic("error"); return e.message; },
    });
    await promise.catch(() => {});
    mutate();
    setChecks({}); setTime(""); setNotes("");
  }

  const completedCount = Object.values(checks).filter(Boolean).length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <PageHeader title="Recovery" subtitle="Sunday protocol · 30-45 min" />

      <div className="card p-4">
        <div className="label">Date</div>
        <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} />
      </div>

      <div className="card p-2">
        <div className="px-2 py-2 flex items-center justify-between">
          <div className="text-xs uppercase tracking-wide text-ink-muted font-semibold">
            Protocol
          </div>
          <div className="text-xs text-ink-muted">{completedCount} / {ITEMS.length}</div>
        </div>
        <div className="space-y-1">
          {ITEMS.map(item => {
            const checked = !!checks[item.key];
            return (
              <button
                key={item.key}
                onClick={() => toggle(item.key)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-DEFAULT transition-colors ${
                  checked ? "bg-whoop-green/10" : "hover:bg-bg-elevated"
                }`}
              >
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                  checked ? "bg-whoop-green border-whoop-green" : "border-border"
                }`}>
                  {checked && <Check className="w-4 h-4 text-bg" strokeWidth={3} />}
                </div>
                <div className="flex-1 text-left">
                  <div className={`font-medium ${checked ? "text-whoop-green" : "text-ink"}`}>{item.label}</div>
                  <div className="text-xs text-ink-dim">{item.sub}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="card p-4 space-y-4">
        <div>
          <div className="label">Time spent (min)</div>
          <input type="number" inputMode="numeric" className="input" placeholder="30" value={time} onChange={e => setTime(e.target.value)} />
        </div>
        <div>
          <div className="label">Notes</div>
          <textarea className="input min-h-[60px] resize-none" value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
        <button onClick={save} className="btn btn-primary w-full">
          <Save className="w-4 h-4" /> Save session
        </button>
      </div>

      {log && log.length > 0 && (
        <div className="card p-4">
          <div className="text-xs uppercase tracking-wide text-ink-muted font-semibold mb-3">
            History
          </div>
          <div className="space-y-2">
            {log.slice(0, 8).map((s, i) => {
              const count = [s.foam_rolling, s.cold_tub, s.hot_tub, s.legs_up_wall, s.box_breathing, s.protein_carbs].filter(Boolean).length;
              return (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <div className="text-sm font-medium">{s.date}</div>
                    <div className="text-xs text-ink-dim">Wk {s.week ?? "—"}</div>
                  </div>
                  <div className="text-right text-xs tabular-nums">
                    <div className="text-ink">{count} / 6</div>
                    {s.time_spent_min && <div className="text-ink-muted">{s.time_spent_min} min</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}
