"use client";

import { useState } from "react";
import useSWR from "swr";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { Save } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { fetcher, postAction } from "@/lib/fetcher";
import { haptic } from "@/lib/haptics";
import type { WhoopDailyEntry } from "@/types";
import { todayIso, statusFromRecovery, statusGuidance } from "@/lib/helpers";
import PageHeader from "@/components/PageHeader";
import WhoopPill from "@/components/WhoopPill";

export default function WhoopPage() {
  const { data: entries, mutate } = useSWR<WhoopDailyEntry[]>("/api/sheets/getWhoopDaily", fetcher);

  const [date, setDate] = useState(todayIso());
  const [recovery, setRecovery] = useState("");
  const [sleep, setSleep] = useState("");
  const [hrv, setHrv] = useState("");
  const [rhr, setRhr] = useState("");
  const [strain, setStrain] = useState("");
  const [notes, setNotes] = useState("");

  const status = statusFromRecovery(recovery ? Number(recovery) : null);

  async function save() {
    if (!date || !recovery) {
      haptic("error");
      toast.error("Date and recovery % required");
      return;
    }
    haptic("tap");
    const payload: Partial<WhoopDailyEntry> = {
      date,
      recovery_pct: recovery ? Number(recovery) : null,
      sleep_hrs: sleep ? Number(sleep) : null,
      hrv: hrv ? Number(hrv) : null,
      rhr: rhr ? Number(rhr) : null,
      strain: strain ? Number(strain) : null,
      notes,
    };
    const promise = postAction("upsertWhoopDaily", payload);
    toast.promise(promise, {
      loading: "Saving...",
      success: () => { haptic("success"); return "Whoop saved"; },
      error: e => { haptic("error"); return e.message; },
    });
    await promise.catch(() => {});
    mutate();
    setRecovery(""); setSleep(""); setHrv(""); setRhr(""); setStrain(""); setNotes("");
  }

  const chartData = (entries ?? [])
    .slice(0, 14)
    .reverse()
    .map(e => ({ date: e.date.slice(5), recovery: e.recovery_pct }));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <PageHeader
        title="Whoop"
        subtitle="Daily recovery log"
        right={recovery ? <WhoopPill status={status} recovery={Number(recovery)} /> : undefined}
      />

      {recovery && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card p-4">
          <div className="text-xs uppercase tracking-wide text-ink-muted font-semibold mb-2">
            Today's guidance
          </div>
          <p className="text-sm">{statusGuidance(status)}</p>
        </motion.div>
      )}

      <div className="card p-4 space-y-4">
        <div>
          <div className="label">Date</div>
          <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="label">Recovery %</div>
            <input
              type="number"
              inputMode="numeric"
              className="input"
              placeholder="0-100"
              value={recovery}
              onChange={e => setRecovery(e.target.value)}
            />
          </div>
          <div>
            <div className="label">Sleep hrs</div>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              className="input"
              placeholder="0.0"
              value={sleep}
              onChange={e => setSleep(e.target.value)}
            />
          </div>
          <div>
            <div className="label">HRV</div>
            <input
              type="number"
              inputMode="numeric"
              className="input"
              placeholder="ms"
              value={hrv}
              onChange={e => setHrv(e.target.value)}
            />
          </div>
          <div>
            <div className="label">RHR</div>
            <input
              type="number"
              inputMode="numeric"
              className="input"
              placeholder="bpm"
              value={rhr}
              onChange={e => setRhr(e.target.value)}
            />
          </div>
          <div className="col-span-2">
            <div className="label">Day strain</div>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              className="input"
              placeholder="0-21"
              value={strain}
              onChange={e => setStrain(e.target.value)}
            />
          </div>
        </div>
        <div>
          <div className="label">Notes</div>
          <textarea
            className="input min-h-[60px] resize-none"
            placeholder="Wakeups, stress, etc."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>
        <button onClick={save} className="btn btn-primary w-full">
          <Save className="w-4 h-4" /> Save
        </button>
      </div>

      {chartData.length > 1 && (
        <div className="card p-4">
          <div className="text-xs uppercase tracking-wide text-ink-muted font-semibold mb-3">
            Last 14 days
          </div>
          <div className="h-40">
            <ResponsiveContainer>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="2 4" stroke="#1F2937" vertical={false} />
                <XAxis dataKey="date" stroke="#64748B" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748B" fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ background: "#1A2233", border: "1px solid #1F2937", borderRadius: 10 }}
                />
                <Line type="monotone" dataKey="recovery" stroke="#10B981" strokeWidth={2} dot={{ fill: "#10B981", r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Recent entries */}
      {entries && entries.length > 0 && (
        <div className="card p-4">
          <div className="text-xs uppercase tracking-wide text-ink-muted font-semibold mb-3">
            Recent
          </div>
          <div className="space-y-2">
            {entries.slice(0, 7).map(e => (
              <div key={e.date} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <div className="text-sm font-medium">{e.date}</div>
                  {e.notes && <div className="text-xs text-ink-dim mt-0.5">{e.notes}</div>}
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-ink-muted tabular-nums">{e.sleep_hrs ?? "—"}h</span>
                  <WhoopPill status={statusFromRecovery(e.recovery_pct)} recovery={e.recovery_pct} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
