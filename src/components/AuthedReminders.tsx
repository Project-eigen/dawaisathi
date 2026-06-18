"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import RemindersView from "./RemindersView";

type CaringFor = { patientId: string; name: string | null; code: string };

export default function AuthedReminders() {
  const { isLoaded, isSignedIn } = useUser();
  const [role, setRole] = useState<"patient" | "family" | null>(null);
  const [caringFor, setCaringFor] = useState<CaringFor[]>([]);
  const [selected, setSelected] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!isSignedIn) return;
    fetch("/api/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        setRole(d.role);
        setCaringFor(d.caringFor || []);
        if (d.role === "family" && d.caringFor?.[0]) setSelected(d.caringFor[0].patientId);
      })
      .catch(() => {});
  }, [isSignedIn]);

  if (!isLoaded) return <main className="wrap" />;

  // Signed out → still usable in local mode, with a nudge to sign in.
  if (!isSignedIn) return <RemindersView signedIn={false} />;

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
          signedIn
          patientId={current.patientId}
          readOnlyHint={`Managing ${current.name || current.code}'s reminders`}
        />
      </>
    );
  }

  // Patient (default) → their own list.
  return <RemindersView signedIn />;
}
