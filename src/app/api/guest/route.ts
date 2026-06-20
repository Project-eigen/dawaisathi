import { NextResponse } from "next/server";
import { dbConfigured } from "@/lib/db";
import { ensureActor, getActor } from "@/lib/actor";

export const runtime = "nodejs";

// Called when someone chooses "Continue as guest". Mints the guest cookie so the
// rest of the app has a stable identity to hang their data on. Harmless if the
// DB isn't configured — they just stay on-device until it is.
export async function POST() {
  if (!dbConfigured) return NextResponse.json({ ok: true, kind: "local" });
  const actor = await ensureActor();
  return NextResponse.json({ ok: true, kind: actor.kind });
}

// Current identity, if any (no side effects).
export async function GET() {
  const actor = await getActor();
  return NextResponse.json({ actor });
}
