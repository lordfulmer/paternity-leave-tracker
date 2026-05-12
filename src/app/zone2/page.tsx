"use client";

import { useState } from "react";
import useSWR from "swr";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { Save } from "lucide-react";
import { fetcher, postAction } from "@/lib/fetcher";
import { haptic } from "@/lib/haptics";
import type { Zone2Session, SummaryData } from "@/types";
import { todayIso } from "@/lib/helpers";
import PageHeader from "@/components/PageHeader";

const MODALITIES = [
  "Stroller walk",
  "Treadmill incline walk",
  "Stationary bike",
  "Elliptical",
  "Easy jog",
  "Other",
];

export default function Zone2Page() {
  const { data: summary } = useSWR<SummaryData>("/api/sheets/summary", fetcher);
  const { data: log, mutate } = useSWR<Zone2Session[]>("/api/sheets/getZone2Log", fetcher);

  const [date, setDate] = useState(todayIso());
  const [modality, setModality] = useState(MODALITIES[0]);
  const [duration, setDuration] = useState("");
  const [hr, setHr] = useState("");
  const [notes, setNotes] = useState("");

  async function save() {
    if (!duration) {
      haptic("error");
      toast.error("Duration required");
      return;
    }
    haptic("tap");
    const payload: Partial<Zone2Session> = {
      date,
      week: summary?.currentWeek ?? null,
      modality,
      duration_min: Number(duration),
      avg_hr: hr ? Number(hr) : null,
      notes,
    };
    const promise = postAction("logZone2", payload);
    toast.promise(promise, {
      loading: "Saving...",
      success: () => { haptic("success"); return "Zone 2 logged"; },
      error: e => { haptic("error"); return e.message; },
    });
    await promise.catch(() => {});
    mutate();
    setDuration(""); setHr(""); setNotes("");
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <PageHeader title="Zone 2" subtitle="HR 60-70% max · 30-45 min" />

      <div className="card p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="label">Date</div>
            <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div>
            <div className="label">Duration (min)</div>
            <input type="number" inputMode="numeric" className="input" placeholder="30" value={duration} onChange={e => setDuration(e.target.value)} />
          </div>
        </div>
        <div>
          <div className="label">Modality</div>
          <div className="grid grid-cols-2 gap-2">
            {MODALITIES.map(m => (
              <button
                key={m}
                onClick={() => setModality(m)}
                className={`btn ${modality === m ? "btn-primary" : "btn-ghost"}`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="label">Avg HR (bpm)</div>
          <input type="number" inputMode="numeric" className="input" placeholder="130" value={hr} onChange={e => setHr(e.target.value)} />
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
            Recent sessions
          </div>
          <div className="space-y-2">
            {log.slice(0, 8).map((s, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <div className="text-sm font-medium">{s.modality}</div>
                  <div className="text-xs text-ink-dim">{s.date} · Wk {s.week ?? "—"}</div>
                </div>
                <div className="text-right text-xs tabular-nums">
                  <div className="text-ink">{s.duration_min} min</div>
                  {s.avg_hr && <div className="text-ink-muted">{s.avg_hr} bpm</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
