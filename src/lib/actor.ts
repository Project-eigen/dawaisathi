import { cookies } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { randomUUID } from "crypto";
import { authEnabled } from "./config";
import { ensureSchema, getSql } from "./db";

// An "actor" is whoever is making the request: either a signed-in Clerk user,
// or an anonymous guest identified only by an httpOnly cookie. Both are real,
// durable identities in the database — a guest can own reminders and run a
// family group exactly like a user. The cookie just stands in for an account
// until (and if) the person signs in.
const GUEST_COOKIE = "ds_guest";
const GUEST_PREFIX = "guest_";

export type Actor = { id: string; kind: "user" | "guest" };

async function clerkUserId(): Promise<string | null> {
  if (!authEnabled) return null;
  try {
    const { userId } = await auth();
    return userId ?? null;
  } catch {
    return null;
  }
}

// Current actor without creating anything. If the person is signed in AND still
// carries a guest cookie, their guest data is merged into the account here, once.
export async function getActor(): Promise<Actor | null> {
  const uid = await clerkUserId();
  const jar = await cookies();
  const guest = jar.get(GUEST_COOKIE)?.value || null;

  if (uid) {
    if (guest && guest.startsWith(GUEST_PREFIX)) {
      await mergeGuestInto(uid, guest).catch(() => {
        /* best-effort; data stays under the guest id if this fails */
      });
    }
    return { id: uid, kind: "user" };
  }
  if (guest) return { id: guest, kind: "guest" };
  return null;
}

// Like getActor, but mints a guest identity (sets the cookie) when there is no
// signed-in user and no existing guest cookie.
export async function ensureActor(): Promise<Actor> {
  const existing = await getActor();
  if (existing) return existing;

  const id = GUEST_PREFIX + randomUUID().replace(/-/g, "");
  const jar = await cookies();
  jar.set(GUEST_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });
  return { id, kind: "guest" };
}

// Reassigns everything a guest owns to their new account, then drops the guest
// cookie so this runs only once. Idempotent and safe to retry.
async function mergeGuestInto(userId: string, guestId: string) {
  await ensureSchema();
  const sql = getSql();

  // Reminders the guest owns or created.
  await sql`UPDATE reminders SET patient_id = ${userId} WHERE patient_id = ${guestId}`;
  await sql`UPDATE reminders SET created_by = ${userId} WHERE created_by = ${guestId}`;

  // Push devices registered while a guest.
  await sql`UPDATE push_subscriptions SET user_id = ${userId} WHERE user_id = ${guestId}`;

  // Caregiver links — drop any that would collide, then repoint the rest.
  await sql`
    DELETE FROM caregiver_links WHERE family_id = ${guestId}
      AND patient_id IN (SELECT patient_id FROM caregiver_links WHERE family_id = ${userId})
  `;
  await sql`UPDATE caregiver_links SET family_id = ${userId} WHERE family_id = ${guestId}`;
  await sql`
    DELETE FROM caregiver_links WHERE patient_id = ${guestId}
      AND family_id IN (SELECT family_id FROM caregiver_links WHERE patient_id = ${userId})
  `;
  await sql`UPDATE caregiver_links SET patient_id = ${userId} WHERE patient_id = ${guestId}`;

  // Profile: keep the user's if they already have one; otherwise adopt the
  // guest's row as-is so its share code (already given to family) keeps working.
  const userProf = (await sql`SELECT 1 FROM profiles WHERE clerk_id = ${userId}`) as unknown[];
  if (userProf.length === 0) {
    await sql`UPDATE profiles SET clerk_id = ${userId} WHERE clerk_id = ${guestId}`;
  } else {
    await sql`DELETE FROM profiles WHERE clerk_id = ${guestId}`;
  }

  const jar = await cookies();
  jar.delete(GUEST_COOKIE);
}
