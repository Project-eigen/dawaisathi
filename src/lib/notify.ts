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
