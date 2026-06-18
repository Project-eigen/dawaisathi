import { neon } from "@neondatabase/serverless";

export const dbConfigured = !!process.env.DATABASE_URL;

export function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return neon(url);
}

let ensured = false;

// Idempotent schema creation — runs once per warm serverless instance.
export async function ensureSchema() {
  if (ensured) return;
  const sql = getSql();

  await sql`
    CREATE TABLE IF NOT EXISTS profiles (
      clerk_id      text PRIMARY KEY,
      role          text NOT NULL DEFAULT 'patient',
      display_name  text,
      patient_code  text UNIQUE,
      created_at    timestamptz NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS reminders (
      id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_id  text NOT NULL,
      name        text NOT NULL,
      strength    text DEFAULT '',
      frequency   text DEFAULT '',
      times       text[] NOT NULL DEFAULT '{}',
      timing      text DEFAULT '',
      notes       text DEFAULT '',
      active      boolean NOT NULL DEFAULT true,
      created_by  text,
      created_at  timestamptz NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS caregiver_links (
      id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      family_id   text NOT NULL,
      patient_id  text NOT NULL,
      created_at  timestamptz NOT NULL DEFAULT now(),
      UNIQUE (family_id, patient_id)
    )
  `;

  ensured = true;
}

// Short, human-friendly share code a patient gives to a family member.
export function makePatientCode(seed: string) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += alphabet[hash % alphabet.length];
    hash = Math.floor(hash / alphabet.length) + (i + 1) * 97;
  }
  return code;
}
