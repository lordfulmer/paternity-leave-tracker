import { enqueue, isOnline } from "./offline";

export const fetcher = async <T = any>(url: string): Promise<T> => {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(await res.text());
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Request failed");
  return json.data as T;
};

export async function postAction<T = any>(
  action: string,
  payload: Record<string, any> = {}
): Promise<T> {
  if (!isOnline()) {
    enqueue(action, payload);
    throw new Error("Offline — queued for sync");
  }
  try {
    const res = await fetch(`/api/sheets/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await res.text());
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || "Request failed");
    return json.data as T;
  } catch (err) {
    if (!isOnline()) {
      enqueue(action, payload);
      throw new Error("Network failed — queued for sync");
    }
    throw err;
  }
}
