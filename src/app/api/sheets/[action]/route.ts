import { NextRequest, NextResponse } from "next/server";
import { callAppsScript } from "@/lib/appsScript";

const READ_ACTIONS = new Set([
  "getCatalog",
  "getConfig",
  "getWorkoutLog",
  "getRecentSets",
  "getWeeklyCheckIns",
  "getWhoopDaily",
  "getZone2Log",
  "getRecoveryLog",
  "summary",
]);

const WRITE_ACTIONS = new Set([
  "logWorkoutSet",
  "logWorkoutSession",
  "deleteWorkoutSet",
  "upsertWeeklyCheckIn",
  "upsertWhoopDaily",
  "logZone2",
  "logRecovery",
]);

export async function GET(req: NextRequest, { params }: { params: { action: string } }) {
  const action = params.action;
  if (!READ_ACTIONS.has(action)) {
    return NextResponse.json({ ok: false, error: `Unknown read action: ${action}` }, { status: 400 });
  }
  const url = new URL(req.url);
  const payload: Record<string, any> = {};
  url.searchParams.forEach((v, k) => { payload[k] = v; });
  try {
    const data = await callAppsScript(action, payload);
    return NextResponse.json({ ok: true, data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { action: string } }) {
  const action = params.action;
  if (!READ_ACTIONS.has(action) && !WRITE_ACTIONS.has(action)) {
    return NextResponse.json({ ok: false, error: `Unknown action: ${action}` }, { status: 400 });
  }
  let payload: Record<string, any> = {};
  try { payload = await req.json(); } catch { /* empty body OK */ }
  try {
    const data = await callAppsScript(action, payload);
    return NextResponse.json({ ok: true, data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
