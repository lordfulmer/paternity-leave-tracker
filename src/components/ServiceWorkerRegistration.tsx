"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return; // dev mode skips SW for clean reloads
    navigator.serviceWorker.register("/sw.js").catch(() => { /* ignore */ });
  }, []);
  return null;
}
