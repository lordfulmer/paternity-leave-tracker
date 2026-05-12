"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { flushQueue, queueSize } from "@/lib/offline";
import { haptic } from "@/lib/haptics";

export default function OfflineBanner() {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    setOnline(navigator.onLine);
    setPending(queueSize());

    const goOnline = async () => {
      setOnline(true);
      const size = queueSize();
      if (size > 0) {
        toast.loading(`Syncing ${size} pending writes...`, { id: "sync" });
        const { flushed, failed } = await flushQueue();
        setPending(queueSize());
        toast.dismiss("sync");
        if (flushed > 0) {
          haptic("success");
          toast.success(`Synced ${flushed} writes`);
        }
        if (failed > 0) toast.error(`${failed} failed - will retry`);
      }
    };
    const goOffline = () => {
      setOnline(false);
      haptic("warn");
    };

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    // Poll queue every 5s while mounted to catch background changes
    const interval = setInterval(() => setPending(queueSize()), 5000);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      clearInterval(interval);
    };
  }, []);

  const showBanner = !online || pending > 0;

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          className={`fixed top-0 left-0 right-0 z-50 px-4 py-2 text-xs font-medium text-center ${
            online ? "bg-whoop-yellow text-bg" : "bg-whoop-red text-white"
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            {online ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                {pending} pending {pending === 1 ? "write" : "writes"}...
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5" />
                Offline — {pending > 0 ? `${pending} queued` : "writes will sync when back"}
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
