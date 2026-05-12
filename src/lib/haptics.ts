// Haptic feedback helpers. Uses navigator.vibrate (Android/Chrome) which works as
// fallback on iOS Safari Web Apps via taptic patterns. iOS PWAs added vibration
// support; if unavailable, this no-ops gracefully.

type HapticPattern = "tap" | "success" | "warn" | "error" | "tick";

const patterns: Record<HapticPattern, number | number[]> = {
  tap: 10,
  tick: 6,
  success: [10, 40, 20],
  warn: [20, 60, 20],
  error: [40, 60, 40, 60, 40],
};

export function haptic(pattern: HapticPattern = "tap") {
  if (typeof window === "undefined") return;
  try {
    if ("vibrate" in navigator) {
      navigator.vibrate(patterns[pattern]);
    }
  } catch {
    // ignore
  }
}
