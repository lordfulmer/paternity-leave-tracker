// Server-only helper to call the Apps Script web app
const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL!;
const API_KEY = process.env.APPS_SCRIPT_API_KEY!;

export async function callAppsScript<T = any>(
  action: string,
  payload: Record<string, any> = {}
): Promise<T> {
  if (!APPS_SCRIPT_URL || !API_KEY) {
    throw new Error("Missing APPS_SCRIPT_URL or APPS_SCRIPT_API_KEY env vars");
  }

  const res = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, payload, apiKey: API_KEY }),
    redirect: "follow",
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Apps Script HTTP ${res.status}: ${await res.text()}`);
  }

  const json = await res.json();
  if (!json.ok) {
    throw new Error(json.error || "Apps Script error");
  }
  return json.data as T;
}
