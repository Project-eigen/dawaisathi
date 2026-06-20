import webpush from "web-push";

// VAPID keys identify this server to the browser push services.
// Generate a pair once with:  npm run gen-vapid
const PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || "";
const PRIVATE = process.env.VAPID_PRIVATE_KEY || "";
const SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@dawaisathi.app";

// Push (and the cron reminder pipeline) only turn on once keys are present.
export const pushConfigured = !!PUBLIC && !!PRIVATE;

let configured = false;
function ensure() {
  if (configured || !pushConfigured) return;
  webpush.setVapidDetails(SUBJECT, PUBLIC, PRIVATE);
  configured = true;
}

export type StoredSub = { endpoint: string; p256dh: string; auth: string };
export type PushPayload = { title: string; body: string; tag?: string; url?: string };

// Sends one notification. `gone` is true when the subscription is dead
// (404/410) so the caller can delete it.
export async function sendPush(
  sub: StoredSub,
  payload: PushPayload
): Promise<{ ok: boolean; gone: boolean }> {
  ensure();
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload)
    );
    return { ok: true, gone: false };
  } catch (e: unknown) {
    const code = (e as { statusCode?: number })?.statusCode;
    return { ok: false, gone: code === 404 || code === 410 };
  }
}
