"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import RemindersView from "./RemindersView";

type CaringFor = { patientId: string; name: string | null; code: string };

// Picks the right reminders list for the current actor (Clerk user OR guest):
// a patient sees their own; a family member sees the patient they're caring for.
// Falls back to RemindersView's local mode when there's no database.
export default function RemindersScreen() {
  const [ready, setReady] = useState(false);
  const [role, setRole] = useState<"patient" | "family" | null>(null);
  const [caringFor, setCaringFor] = useState<CaringFor[]>([]);
  const [selected, setSelected] = useState<string | undefined>(undefined);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        setRole(d.role);
        setCaringFor(d.caringFor || []);
        if (d.role === "family" && d.caringFor?.[0]) setSelected(d.caringFor[0].patientId);
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  if (!ready) return <main className="wrap" />;

  if (role === "family") {
    if (caringFor.length === 0) {
      return (
        <main className="wrap">
          <header className="app">
            <div className="logo" aria-hidden>
              ⏰
            </div>
            <div>
              <h1>Reminders</h1>
              <p>Family account</p>
            </div>
          </header>
          <div className="card empty">
            You&apos;re not linked to a patient yet. Go to the{" "}
            <Link href="/account" className="inline-link">
              Account tab
            </Link>{" "}
            and enter your patient&apos;s code to see and manage their reminders.
          </div>
        </main>
      );
    }
    const current = caringFor.find((c) => c.patientId === selected) || caringFor[0];
    return (
      <>
        {caringFor.length > 1 && (
          <div className="wrap" style={{ paddingBottom: 0 }}>
            <div className="field">
              <label>Viewing patient</label>
              <select value={selected} onChange={(e) => setSelected(e.target.value)}>
                {caringFor.map((c) => (
                  <option key={c.patientId} value={c.patientId}>
                    {c.name || c.code}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
        <RemindersView
          patientId={current.patientId}
          readOnlyHint={`Managing ${current.name || current.code}'s reminders`}
        />
      </>
    );
  }

  // Patient (default) or local-only → their own list.
  return <RemindersView />;
}
