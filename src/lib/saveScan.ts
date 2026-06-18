"use client";

const LOCAL_KEY = "dawaisathi:reminders:v1";

export type ScanMed = {
  name: string;
  strength?: string;
  frequency?: string;
  timing?: string;
  notes?: string;
};

// Saves reviewed medicines as reminders. Uses the cloud (Neon) when the user is
// signed in and the DB is configured; otherwise falls back to on-device storage.
export async function saveScanToReminders(meds: ScanMed[]): Promise<"cloud" | "local"> {
  let cloud = false;
  try {
    const probe = await fetch("/api/reminders");
    cloud = probe.ok;
  } catch {
    cloud = false;
  }

  if (cloud) {
    for (const m of meds) {
      await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...m, times: [] }),
      });
    }
    return "cloud";
  }

  let existing: unknown[] = [];
  try {
    existing = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
  } catch {
    existing = [];
  }
  const additions = meds.map((m, i) => ({
    id: "loc-" + Date.now() + "-" + i,
    name: m.name,
    strength: m.strength || "",
    frequency: m.frequency || "",
    timing: m.timing || "",
    notes: m.notes || "",
    times: [] as string[],
    active: true,
  }));
  localStorage.setItem(LOCAL_KEY, JSON.stringify([...existing, ...additions]));
  return "local";
}
