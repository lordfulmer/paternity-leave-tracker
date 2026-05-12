// Offline write queue. Stores pending writes in localStorage and flushes when online.
// Reads are not queued (they fail loudly so SWR shows cached data).

const QUEUE_KEY = "paternity_offline_queue";

interface QueuedWrite {
  id: string;
  action: string;
  payload: Record<string, any>;
  ts: number;
  attempts: number;
}

function readQueue(): QueuedWrite[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeQueue(q: QueuedWrite[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
}

export function enqueue(action: string, payload: Record<string, any>) {
  const q = readQueue();
  q.push({
    id: crypto.randomUUID(),
    action,
    payload,
    ts: Date.now(),
    attempts: 0,
  });
  writeQueue(q);
  return q.length;
}

export function queueSize(): number {
  return readQueue().length;
}

export async function flushQueue(): Promise<{ flushed: number; failed: number }> {
  const q = readQueue();
  if (q.length === 0) return { flushed: 0, failed: 0 };
  const remaining: QueuedWrite[] = [];
  let flushed = 0;
  let failed = 0;
  for (const item of q) {
    try {
      const res = await fetch(`/api/sheets/${item.action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item.payload),
      });
      if (!res.ok) throw new Error(String(res.status));
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Failed");
      flushed++;
    } catch {
      failed++;
      if (item.attempts < 5) {
        remaining.push({ ...item, attempts: item.attempts + 1 });
      }
    }
  }
  writeQueue(remaining);
  return { flushed, failed };
}

export function isOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}
