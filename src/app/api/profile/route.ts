import { NextRequest, NextResponse } from "next/server";
import { dbConfigured, ensureSchema, getSql, makePatientCode } from "@/lib/db";
import { ensureActor } from "@/lib/actor";

export const runtime = "nodejs";

function preflight() {
  if (!dbConfigured) return NextResponse.json({ error: "db_disabled" }, { status: 503 });
  return null;
}

type Role = "patient" | "family";

async function loadProfile(userId: string) {
  const sql = getSql();
  await ensureSchema();
  const rows = (await sql`SELECT * FROM profiles WHERE clerk_id = ${userId}`) as Record<string, unknown>[];
  let profile = rows[0];

  if (!profile) {
    const code = makePatientCode(userId);
    const inserted = (await sql`
      INSERT INTO profiles (clerk_id, role, patient_code)
      VALUES (${userId}, 'patient', ${code})
      ON CONFLICT (clerk_id) DO NOTHING
      RETURNING *
    `) as Record<string, unknown>[];
    profile = inserted[0] || (await sql`SELECT * FROM profiles WHERE clerk_id = ${userId}`)[0];
  }

  // Who is this user currently caring for (if family)?
  const links = (await sql`
    SELECT l.patient_id, p.display_name, p.patient_code
    FROM caregiver_links l
    LEFT JOIN profiles p ON p.clerk_id = l.patient_id
    WHERE l.family_id = ${userId}
    ORDER BY l.created_at DESC
  `) as Record<string, unknown>[];

  return { profile, links };
}

export async function GET() {
  const pf = preflight();
  if (pf) return pf;
  const userId = (await ensureActor()).id;

  const { profile, links } = await loadProfile(userId);
  return NextResponse.json({
    role: profile.role,
    displayName: profile.display_name,
    patientCode: profile.patient_code,
    caringFor: links.map((l) => ({
      patientId: l.patient_id,
      name: l.display_name,
      code: l.patient_code,
    })),
  });
}

export async function POST(req: NextRequest) {
  const pf = preflight();
  if (pf) return pf;
  const userId = (await ensureActor()).id;

  const body = await req.json().catch(() => ({}));
  const role: Role = body.role === "family" ? "family" : "patient";
  const displayName: string = (body.displayName || "").toString().slice(0, 80);

  const sql = getSql();
  await ensureSchema();
  const code = makePatientCode(userId);
  await sql`
    INSERT INTO profiles (clerk_id, role, display_name, patient_code)
    VALUES (${userId}, ${role}, ${displayName}, ${code})
    ON CONFLICT (clerk_id)
    DO UPDATE SET role = ${role}, display_name = ${displayName}
  `;

  const { profile, links } = await loadProfile(userId);
  return NextResponse.json({
    role: profile.role,
    displayName: profile.display_name,
    patientCode: profile.patient_code,
    caringFor: links.map((l) => ({ patientId: l.patient_id, name: l.display_name, code: l.patient_code })),
  });
}
