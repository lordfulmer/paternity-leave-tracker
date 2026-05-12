"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Pause, Play, Plus, Minus } from "lucide-react";
import { haptic } from "@/lib/haptics";

const PRESETS = [60, 90, 120, 180];

export default function RestTimer({
  initialSeconds = 90,
  onClose,
}: {
  initialSeconds?: number;
  onClose: () => void;
}) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [total, setTotal] = useState(initialSeconds);
  const [running, setRunning] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const firedRef = useRef(false);

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) {
          if (!firedRef.current) {
            firedRef.current = true;
            haptic("success");
            // double-buzz to be unmissable
            setTimeout(() => haptic("success"), 300);
          }
          return 0;
        }
        // 10s warning tick
        if (s === 11) haptic("tick");
        return s - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  const setPreset = (p: number) => {
    haptic("tap");
    firedRef.current = false;
    setSeconds(p);
    setTotal(p);
    setRunning(true);
  };

  const adjust = (delta: number) => {
    haptic("tick");
    firedRef.current = false;
    setSeconds(s => Math.max(0, s + delta));
    setTotal(t => Math.max(0, t + delta));
  };

  const mm = Math.floor(seconds / 60);
  const ss = (seconds % 60).toString().padStart(2, "0");
  const progress = total > 0 ? (seconds / total) * 100 : 0;
  const done = seconds === 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-bg/95 backdrop-blur-md flex items-center justify-center p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="card-elev p-6 w-full max-w-sm relative"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={() => { haptic("tap"); onClose(); }}
          className="absolute top-3 right-3 text-ink-muted hover:text-ink p-2"
          aria-label="Close timer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="text-xs uppercase tracking-wider text-ink-muted font-semibold mb-2">
            {done ? "Rest complete" : "Rest"}
          </div>
          <div className={`text-7xl font-bold tabular-nums tracking-tight ${
            done ? "text-whoop-green" : seconds <= 10 ? "text-whoop-yellow" : "text-ink"
          }`}>
            {mm}:{ss}
          </div>
        </div>

        {/* Progress ring */}
        <div className="relative h-2 bg-bg rounded-full overflow-hidden mb-6">
          <motion.div
            className={`absolute inset-y-0 left-0 ${done ? "bg-whoop-green" : "bg-accent"}`}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        {/* Adjust */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <button onClick={() => adjust(-15)} className="btn btn-ghost px-4">
            <Minus className="w-4 h-4" /> 15s
          </button>
          <button
            onClick={() => { haptic("tap"); setRunning(r => !r); }}
            className="btn btn-primary w-14 h-14 rounded-full"
          >
            {running ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>
          <button onClick={() => adjust(15)} className="btn btn-ghost px-4">
            <Plus className="w-4 h-4" /> 15s
          </button>
        </div>

        {/* Presets */}
        <div className="grid grid-cols-4 gap-2">
          {PRESETS.map(p => (
            <button
              key={p}
              onClick={() => setPreset(p)}
              className={`btn ${total === p ? "btn-primary" : "btn-ghost"} text-xs px-2`}
            >
              {p < 60 ? `${p}s` : `${p / 60}m`}
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
