"use client";

export type Reminder = {
  id: string;
  patient_id?: string;
  name: string;
  strength?: string;
  frequency?: string;
  times: string[]; // "HH:MM" 24h
  timing?: string;
  notes?: string;
  tz?: string; // IANA timezone, e.g. "Asia/Kolkata" — used by the server cron
  active: boolean;
};

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) return "denied";
  if (Notification.permission === "granted") return "granted";
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

// This device's timezone, attached to reminders so the cron knows when "08:00"
// actually is for this user.
export function deviceTz(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

// Registers this browser for Web Push and stores the subscription server-side,
// so reminders can fire even when the app/tab is closed (delivered by the cron).
// No-op (returns false) when push isn't configured or the user isn't signed in.
export async function subscribeToPush(): Promise<boolean> {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!key) return false;
  if (typeof window === "undefined") return false;
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    const sub =
      existing ||
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      }));
    const json = sub.toJSON();
    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: sub.endpoint, keys: json.keys }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function show(title: string, body: string, tag: string) {
  try {
    const reg = await navigator.serviceWorker?.ready;
    if (reg) {
      await reg.showNotification(title, {
        body,
        tag,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
      });
      return;
    }
  } catch {
    /* fall through */
  }
  try {
    new Notification(title, { body, tag, icon: "/icons/icon-192.png" });
  } catch {
    /* ignore */
  }
}

function firedKey(id: string, time: string) {
  const d = new Date();
  const day = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  return `dawaisathi:fired:${day}:${id}:${time}`;
}

// Checks the reminder list against the current minute and fires any due ones.
// Designed to be called on an interval while the app is open/installed.
export function checkDue(reminders: Reminder[]) {
  if (typeof window === "undefined" || Notification?.permission !== "granted") return;
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const current = `${hh}:${mm}`;

  for (const r of reminders) {
    if (!r.active) continue;
    for (const t of r.times || []) {
      if (t !== current) continue;
      const key = firedKey(r.id, t);
      if (localStorage.getItem(key)) continue;
      localStorage.setItem(key, "1");
      const detail = [r.strength, r.timing].filter(Boolean).join(" · ");
      show(
        `💊 Time for ${r.name}`,
        detail ? `${detail}` : "Tap to open DawaiSathi",
        `${r.id}:${t}`
      );
    }
  }
}
