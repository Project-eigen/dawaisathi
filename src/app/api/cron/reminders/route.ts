import { NextRequest, NextResponse } from "next/server";
import { dbConfigured, ensureSchema, getSql } from "@/lib/db";
import { pushConfigured, sendPush } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Called every minute by an external scheduler (cron-job.org). Finds reminders
// due "right now" in each reminder's own timezone, fires each at most once per
// minute, and pushes a notification to the patient and any linked family.
//
// cron-job.org setup:
//   URL     : https://<your-app>/api/cron/reminders
//   Schedule: every 1 minute
//   Header  : Authorization: Bearer <CRON_SECRET>   (or ?secret=<CRON_SECRET>)

function authorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // not configured -> refuse rather than run open
  const header = req.headers.get("authorization") || "";
  const bearer = header.replace(/^Bearer\s+/i, "").trim();
  const q = new URL(req.url).searchParams.get("secret");
  return bearer === secret || q === secret;
}

async function run(req: NextRequest) {
  if (!dbConfigured) return NextResponse.json({ error: "db_disabled" }, { status: 503 });
  if (!pushConfigured) return NextResponse.json({ error: "push_disabled" }, { status: 503 });
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await ensureSchema();
  const sql = getSql();

  // Match the current HH:MM against each reminder's times[] in its own tz.
  const due = (await sql`
    SELECT id, patient_id, name, strength, timing,
           to_char(now() AT TIME ZONE COALESCE(NULLIF(tz, ''), 'UTC'), 'YYYY-MM-DD"T"HH24:MI') AS fire_key
    FROM reminders
    WHERE active = true
      AND to_char(now() AT TIME ZONE COALESCE(NULLIF(tz, ''), 'UTC'), 'HH24:MI') = ANY(times)
  `) as Array<{
    id: string;
    patient_id: string;
    name: string;
    strength: string;
    timing: string;
    fire_key: string;
  }>;

  let fired = 0;
  let sent = 0;

  for (const r of due) {
    // Claim this fire; if another call already claimed it, skip.
    const claim = (await sql`
      INSERT INTO reminder_fires (reminder_id, fire_key)
      VALUES (${r.id}, ${r.fire_key})
      ON CONFLICT DO NOTHING
      RETURNING reminder_id
    `) as unknown[];
    if (claim.length === 0) continue;
    fired++;

    const subs = (await sql`
      SELECT endpoint, p256dh, auth FROM push_subscriptions
      WHERE user_id = ${r.patient_id}
         OR user_id IN (SELECT family_id FROM caregiver_links WHERE patient_id = ${r.patient_id})
    `) as Array<{ endpoint: string; p256dh: string; auth: string }>;

    const detail = [r.strength, r.timing].filter(Boolean).join(" · ");
    const payload = {
      title: `💊 Time for ${r.name}`,
      body: detail || "Tap to open DawaiSathi",
      tag: `${r.id}:${r.fire_key}`,
      url: "/reminders",
    };

    for (const s of subs) {
      const res = await sendPush(s, payload);
      if (res.ok) sent++;
      else if (res.gone) await sql`DELETE FROM push_subscriptions WHERE endpoint = ${s.endpoint}`;
    }
  }

  // Keep the dedupe log small.
  await sql`DELETE FROM reminder_fires WHERE created_at < now() - interval '2 days'`;

  return NextResponse.json({ ok: true, checked: due.length, fired, sent });
}

export const GET = run;
export const POST = run;
