"use client";

import useSWR from "swr";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Calendar, TrendingUp, Activity, Bed } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import { Heart } from "lucide-react";
import { fetcher } from "@/lib/fetcher";
import type { SummaryData } from "@/types";
import {
  phaseBg,
  phaseColor,
  phaseLabel,
  statusFromRecovery,
  statusGuidance,
} from "@/lib/helpers";
import PageHeader from "@/components/PageHeader";
import WhoopPill from "@/components/WhoopPill";

export default function HomePage() {
  const { data, error, isLoading } = useSWR<SummaryData>("/api/sheets/summary", fetcher, {
    refreshInterval: 30000,
  });

  if (isLoading) return <SkeletonHome />;
  if (error)
    return (
      <div className="card p-6">
        <p className="text-whoop-red font-medium">Connection error</p>
        <p className="text-sm text-ink-muted mt-1">{String(error.message)}</p>
        <p className="text-xs text-ink-dim mt-3">Check APPS_SCRIPT_URL and APPS_SCRIPT_API_KEY in .env.local</p>
      </div>
    );
  if (!data) return null;

  const status = statusFromRecovery(data.lastWhoop?.recovery_pct ?? null);
  const volumeData = Object.entries(data.weeklyVolume)
    .map(([wk, v]) => ({ week: `W${wk}`, volume: v }))
    .sort((a, b) => Number(a.week.slice(1)) - Number(b.week.slice(1)));
  const weightData = data.checkIns
    .filter(c => c.weight_lbs != null)
    .map(c => ({ week: `W${c.week}`, weight: c.weight_lbs }));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <PageHeader
        title={`Week ${data.currentWeek}`}
        subtitle={phaseLabel(data.currentPhase)}
        right={data.lastWhoop && <WhoopPill status={status} recovery={data.lastWhoop.recovery_pct} />}
      />

      {/* Today guidance */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className={`card p-5 border-2 ${phaseBg(data.currentPhase)}`}
      >
        <div className="flex items-center gap-2 mb-2">
          <Activity className={`w-4 h-4 ${phaseColor(data.currentPhase)}`} />
          <span className="text-xs uppercase tracking-wider text-ink-muted font-semibold">
            Training guidance
          </span>
        </div>
        <p className="text-sm leading-relaxed">{statusGuidance(status)}</p>
        <Link href="/log" className="btn btn-primary mt-4 w-full">
          Start session
          <ArrowRight className="w-4 h-4" />
        </Link>
      </motion.div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-3">
        <StatTile
          icon={<Calendar className="w-4 h-4" />}
          label="Week"
          value={`${data.currentWeek} / 8`}
          sub={data.currentPhase}
        />
        <StatTile
          icon={<Bed className="w-4 h-4" />}
          label="Last sleep"
          value={data.lastWhoop?.sleep_hrs?.toFixed(1) ?? "—"}
          sub="hours"
        />
        <StatTile
          icon={<Activity className="w-4 h-4" />}
          label="Sets logged"
          value={String(data.totalSetsLogged)}
          sub="this block"
        />
        <StatTile
          icon={<TrendingUp className="w-4 h-4" />}
          label="HRV"
          value={data.lastWhoop?.hrv ? String(data.lastWhoop.hrv) : "—"}
          sub="latest"
        />
      </div>

      {/* Charts */}
      {volumeData.length > 0 && (
        <ChartCard title="Weekly volume">
          <BarChart data={volumeData}>
            <CartesianGrid strokeDasharray="2 4" stroke="#1F2937" vertical={false} />
            <XAxis dataKey="week" stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ background: "#1A2233", border: "1px solid #1F2937", borderRadius: 10 }}
              labelStyle={{ color: "#F1F5F9" }}
            />
            <Bar dataKey="volume" fill="#3B82F6" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ChartCard>
      )}

      {weightData.length > 0 && (
        <ChartCard title="Bodyweight">
          <LineChart data={weightData}>
            <CartesianGrid strokeDasharray="2 4" stroke="#1F2937" vertical={false} />
            <XAxis dataKey="week" stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} domain={["dataMin - 2", "dataMax + 2"]} />
            <Tooltip
              contentStyle={{ background: "#1A2233", border: "1px solid #1F2937", borderRadius: 10 }}
              labelStyle={{ color: "#F1F5F9" }}
            />
            <Line type="monotone" dataKey="weight" stroke="#10B981" strokeWidth={2} dot={{ fill: "#10B981", r: 4 }} />
          </LineChart>
        </ChartCard>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/whoop" className="btn btn-ghost"><Heart className="w-4 h-4" />Log Whoop</Link>
        <Link href="/zone2" className="btn btn-ghost">Zone 2</Link>
        <Link href="/recovery" className="btn btn-ghost">Recovery</Link>
        <Link href="/check-in" className="btn btn-ghost">Weekly check-in</Link>
      </div>
    </motion.div>
  );
}

function StatTile({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 text-ink-muted text-xs uppercase tracking-wide font-semibold mb-2">
        {icon}
        {label}
      </div>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      {sub && <div className="text-xs text-ink-dim mt-0.5">{sub}</div>}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: any }) {
  return (
    <div className="card p-4">
      <div className="text-xs uppercase tracking-wide text-ink-muted font-semibold mb-3">{title}</div>
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function SkeletonHome() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-12 bg-bg-card rounded-lg" />
      <div className="h-32 bg-bg-card rounded-lg" />
      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map(i => <div key={i} className="h-24 bg-bg-card rounded-lg" />)}
      </div>
    </div>
  );
}
