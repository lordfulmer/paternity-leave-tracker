"use client";

import { motion } from "framer-motion";
import { haptic } from "@/lib/haptics";

interface Option<T extends string> {
  value: T;
  label: string;
}

export default function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Option<T>[];
}) {
  return (
    <div className="relative bg-bg-elevated border border-border rounded-DEFAULT p-1 flex">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => {
            haptic("tap");
            onChange(opt.value);
          }}
          className={`relative flex-1 py-2 px-3 text-sm font-medium z-10 transition-colors ${
            value === opt.value ? "text-white" : "text-ink-muted"
          }`}
        >
          {opt.label}
          {value === opt.value && (
            <motion.div
              layoutId={`seg-${options.map(o => o.value).join("-")}`}
              className="absolute inset-0 bg-accent rounded -z-10"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
        </button>
      ))}
    </div>
  );
}
