"use client";

import { useCallback, useEffect, useState } from "react";
import type { Reminder } from "./notify";

const LOCAL_KEY = "dawaisathi:reminders:v1";

type Mode = "loading" | "cloud" | "local";

function loadLocal(): Reminder[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
  } catch {
    return [];
  }
}
function saveLocal(list: Reminder[]) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
}
function uid() {
  return "loc-" + Math.abs(Date.now() ^ (performance.now() * 1000)).toString(36);
}

/**
 * Reminders adapter:
 *  - When signed in + Neon configured -> cloud (shared with family).
 *  - Otherwise -> on-device localStorage (still drives notifications).
 *
 * `patientId` lets a family member load a specific patient's list.
 */
export function useReminders(opts: { signedIn: boolean; patientId?: string }) {
  const { signedIn, patientId } = opts;
  const [mode, setMode] = useState<Mode>("loading");
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [dbMissing, setDbMissing] = useState(false);

  const refresh = useCallback(async () => {
    if (signedIn) {
      try {
        const url = patientId ? `/api/reminders?patientId=${patientId}` : "/api/reminders";
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setReminders(data.reminders || []);
          setMode("cloud");
          setDbMissing(false);
          return;
        }
        if (res.status === 503) setDbMissing(true);
      } catch {
        /* fall back to local */
      }
    }
    setReminders(loadLocal());
    setMode("local");
  }, [signedIn, patientId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const add = useCallback(
    async (r: Omit<Reminder, "id" | "active"> & { active?: boolean }) => {
      if (mode === "cloud") {
        const res = await fetch("/api/reminders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...r, patientId }),
        });
        if (res.ok) {
          const data = await res.json();
          setReminders((prev) => [...prev, data.reminder]);
          return;
        }
      }
      const next = [...reminders, { ...r, id: uid(), active: r.active ?? true } as Reminder];
      setReminders(next);
      saveLocal(next);
    },
    [mode, patientId, reminders]
  );

  const update = useCallback(
    async (id: string, patch: Partial<Reminder>) => {
      if (mode === "cloud" && !id.startsWith("loc-")) {
        await fetch(`/api/reminders?id=${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
      }
      const next = reminders.map((r) => (r.id === id ? { ...r, ...patch } : r));
      setReminders(next);
      if (mode !== "cloud") saveLocal(next);
    },
    [mode, reminders]
  );

  const remove = useCallback(
    async (id: string) => {
      if (mode === "cloud" && !id.startsWith("loc-")) {
        await fetch(`/api/reminders?id=${id}`, { method: "DELETE" });
      }
      const next = reminders.filter((r) => r.id !== id);
      setReminders(next);
      if (mode !== "cloud") saveLocal(next);
    },
    [mode, reminders]
  );

  return { mode, reminders, dbMissing, add, update, remove, refresh };
}
