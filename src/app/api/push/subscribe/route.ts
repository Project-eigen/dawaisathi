import { NextRequest, NextResponse } from "next/server";
import { dbConfigured, ensureSchema, getSql } from "@/lib/db";
import { ensureActor } from "@/lib/actor";
import { pushConfigured } from "@/lib/push";

export const runtime = "nodejs";

function gate() {
  if (!dbConfigured) return NextResponse.json({ error: "db_disabled" }, { status: 503 });
  if (!pushConfigured) return NextResponse.json({ error: "push_disabled" }, { status: 503 });
  return null;
}

// Browser registers (or refreshes) its Web Push subscription so the cron job
// can reach this device when the app is closed.
export async function POST(req: NextRequest) {
  const g = gate();
  if (g) return g;
  const userId = (await ensureActor()).id;

  const body = await req.json().catch(() => ({}));
  const endpoint: string = (body.endpoint || "").toString();
  const keys = body.keys || {};
  if (!endpoint || !keys.p256dh || !keys.auth)
    return NextResponse.json({ error: "Invalid subscription." }, { status: 400 });

  await ensureSchema();
  const sql = getSql();
  await sql`
    INSERT INTO push_subscriptions (endpoint, user_id, p256dh, auth)
    VALUES (${endpoint}, ${userId}, ${keys.p256dh}, ${keys.auth})
    ON CONFLICT (endpoint)
    DO UPDATE SET user_id = ${userId}, p256dh = ${keys.p256dh}, auth = ${keys.auth}
  `;
  return NextResponse.json({ ok: true });
}

// Unsubscribe this device.
export async function DELETE(req: NextRequest) {
  const g = gate();
  if (g) return g;
  const userId = (await ensureActor()).id;

  const body = await req.json().catch(() => ({}));
  const endpoint = body.endpoint || new URL(req.url).searchParams.get("endpoint");
  if (!endpoint) return NextResponse.json({ error: "Missing endpoint." }, { status: 400 });

  await ensureSchema();
  const sql = getSql();
  await sql`DELETE FROM push_subscriptions WHERE endpoint = ${endpoint} AND user_id = ${userId}`;
  return NextResponse.json({ ok: true });
}
