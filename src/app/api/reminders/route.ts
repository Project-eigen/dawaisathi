import { NextRequest, NextResponse } from "next/server";
import { dbConfigured, ensureSchema, getSql } from "@/lib/db";
import { ensureActor } from "@/lib/actor";

export const runtime = "nodejs";

function gate() {
  if (!dbConfigured) return NextResponse.json({ error: "db_disabled" }, { status: 503 });
  return null;
}

// A user can access their own reminders (patient) or those of a patient they are linked to (family).
async function canAccess(userId: string, patientId: string) {
  if (userId === patientId) return true;
  const sql = getSql();
  const rows = (await sql`
    SELECT 1 FROM caregiver_links WHERE family_id = ${userId} AND patient_id = ${patientId} LIMIT 1
  `) as unknown[];
  return rows.length > 0;
}

export async function GET(req: NextRequest) {
  const g = gate();
  if (g) return g;
  const userId = (await ensureActor()).id;

  await ensureSchema();
  const patientId = new URL(req.url).searchParams.get("patientId") || userId;
  if (!(await canAccess(userId, patientId)))
    return NextResponse.json({ error: "No access to that patient." }, { status: 403 });

  const sql = getSql();
  const rows = await sql`
    SELECT id, patient_id, name, strength, frequency, times, timing, notes, active
    FROM reminders WHERE patient_id = ${patientId} ORDER BY created_at ASC
  `;
  return NextResponse.json({ patientId, reminders: rows });
}

export async function POST(req: NextRequest) {
  const g = gate();
  if (g) return g;
  const userId = (await ensureActor()).id;

  await ensureSchema();
  const body = await req.json().catch(() => ({}));
  const patientId = (body.patientId || userId).toString();
  if (!(await canAccess(userId, patientId)))
    return NextResponse.json({ error: "No access to that patient." }, { status: 403 });

  const name = (body.name || "").toString().trim();
  if (!name) return NextResponse.json({ error: "Medicine name is required." }, { status: 400 });
  const times: string[] = Array.isArray(body.times) ? body.times.map(String) : [];
  const tz = (body.tz || "UTC").toString();

  const sql = getSql();
  const rows = await sql`
    INSERT INTO reminders (patient_id, name, strength, frequency, times, timing, notes, tz, created_by)
    VALUES (${patientId}, ${name}, ${body.strength || ""}, ${body.frequency || ""},
            ${times}, ${body.timing || ""}, ${body.notes || ""}, ${tz}, ${userId})
    RETURNING id, patient_id, name, strength, frequency, times, timing, notes, active
  `;
  return NextResponse.json({ reminder: rows[0] });
}

export async function PATCH(req: NextRequest) {
  const g = gate();
  if (g) return g;
  const userId = (await ensureActor()).id;

  await ensureSchema();
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
  const body = await req.json().catch(() => ({}));

  const sql = getSql();
  const owner = (await sql`SELECT patient_id FROM reminders WHERE id = ${id}`) as Record<string, unknown>[];
  if (!owner[0]) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (!(await canAccess(userId, owner[0].patient_id as string)))
    return NextResponse.json({ error: "No access." }, { status: 403 });

  const times: string[] | null = Array.isArray(body.times) ? body.times.map(String) : null;
  const rows = await sql`
    UPDATE reminders SET
      name = COALESCE(${body.name ?? null}, name),
      strength = COALESCE(${body.strength ?? null}, strength),
      frequency = COALESCE(${body.frequency ?? null}, frequency),
      times = COALESCE(${times}::text[], times),
      timing = COALESCE(${body.timing ?? null}, timing),
      notes = COALESCE(${body.notes ?? null}, notes),
      active = COALESCE(${typeof body.active === "boolean" ? body.active : null}, active)
    WHERE id = ${id}
    RETURNING id, patient_id, name, strength, frequency, times, timing, notes, active
  `;
  return NextResponse.json({ reminder: rows[0] });
}

export async function DELETE(req: NextRequest) {
  const g = gate();
  if (g) return g;
  const userId = (await ensureActor()).id;

  await ensureSchema();
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

  const sql = getSql();
  const owner = (await sql`SELECT patient_id FROM reminders WHERE id = ${id}`) as Record<string, unknown>[];
  if (!owner[0]) return NextResponse.json({ ok: true });
  if (!(await canAccess(userId, owner[0].patient_id as string)))
    return NextResponse.json({ error: "No access." }, { status: 403 });

  await sql`DELETE FROM reminders WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
