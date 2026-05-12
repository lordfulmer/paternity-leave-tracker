"use client";

import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { haptic } from "@/lib/haptics";

const DELETE_THRESHOLD = -90;

export default function SwipeRow({
  children,
  onDelete,
  className = "",
}: {
  children: React.ReactNode;
  onDelete: () => void;
  className?: string;
}) {
  const x = useMotionValue(0);
  const deleteOpacity = useTransform(x, [-90, -30, 0], [1, 0.5, 0]);
  const [confirming, setConfirming] = useState(false);

  function handleDragEnd(_: any, info: PanInfo) {
    if (info.offset.x < DELETE_THRESHOLD) {
      haptic("warn");
      setConfirming(true);
      x.set(-90);
    } else {
      x.set(0);
      setConfirming(false);
    }
  }

  function confirmDelete(e: React.MouseEvent) {
    e.stopPropagation();
    haptic("error");
    onDelete();
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <motion.div
        style={{ opacity: deleteOpacity }}
        className="absolute inset-y-0 right-0 flex items-center px-5 bg-whoop-red"
      >
        <button onClick={confirmDelete} className="text-white">
          <Trash2 className="w-5 h-5" />
        </button>
      </motion.div>
      <motion.div
        drag="x"
        dragConstraints={{ left: -120, right: 0 }}
        dragElastic={0.2}
        style={{ x }}
        onDragEnd={handleDragEnd}
        className="bg-bg-card relative"
      >
        {children}
      </motion.div>
    </div>
  );
}
