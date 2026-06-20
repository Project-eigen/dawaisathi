import { NextRequest, NextResponse } from "next/server";
import { dbConfigured, ensureSchema, getSql } from "@/lib/db";
import { ensureActor } from "@/lib/actor";

export const runtime = "nodejs";

// Family member links to a patient using the patient's share code.
export async function POST(req: NextRequest) {
  if (!dbConfigured) return NextResponse.json({ error: "db_disabled" }, { status: 503 });

  const userId = (await ensureActor()).id;

  const body = await req.json().catch(() => ({}));
  const code = (body.code || "").toString().trim().toUpperCase();
  if (!code) return NextResponse.json({ error: "Enter a patient code." }, { status: 400 });

  const sql = getSql();
  await ensureSchema();

  const found = (await sql`SELECT clerk_id FROM profiles WHERE patient_code = ${code}`) as Record<
    string,
    unknown
  >[];
  if (!found[0]) return NextResponse.json({ error: "No patient found with that code." }, { status: 404 });

  const patientId = found[0].clerk_id as string;
  if (patientId === userId)
    return NextResponse.json({ error: "That is your own code." }, { status: 400 });

  await sql`
    INSERT INTO caregiver_links (family_id, patient_id)
    VALUES (${userId}, ${patientId})
    ON CONFLICT (family_id, patient_id) DO NOTHING
  `;

  return NextResponse.json({ ok: true, patientId });
}

// Unlink.
export async function DELETE(req: NextRequest) {
  if (!dbConfigured) return NextResponse.json({ error: "db_disabled" }, { status: 503 });
  const userId = (await ensureActor()).id;

  const patientId = new URL(req.url).searchParams.get("patientId");
  if (!patientId) return NextResponse.json({ error: "Missing patientId." }, { status: 400 });

  const sql = getSql();
  await ensureSchema();
  await sql`DELETE FROM caregiver_links WHERE family_id = ${userId} AND patient_id = ${patientId}`;
  return NextResponse.json({ ok: true });
}
