"use client";

import { useEffect, useRef, useState } from "react";
import { useReminders } from "@/lib/useReminders";
import {
  checkDue,
  deviceTz,
  requestNotificationPermission,
  subscribeToPush,
  type Reminder,
} from "@/lib/notify";

const PRESETS: { label: string; time: string }[] = [
  { label: "Morning", time: "08:00" },
  { label: "Noon", time: "14:00" },
  { label: "Night", time: "21:00" },
];

export default function RemindersView({
  patientId,
  readOnlyHint,
}: {
  patientId?: string;
  readOnlyHint?: string;
}) {
  const { mode, reminders, add, update, remove } = useReminders({ patientId });
  const [perm, setPerm] = useState<NotificationPermission>("default");

  // Draft for the add form.
  const [name, setName] = useState("");
  const [strength, setStrength] = useState("");
  const [frequency, setFrequency] = useState("");
  const [timing, setTiming] = useState("");
  const [times, setTimes] = useState<string[]>([]);
  const [newTime, setNewTime] = useState("08:00");

  useEffect(() => {
    if ("Notification" in window) setPerm(Notification.permission);
  }, []);

  // Fire due reminders while the app is open.
  const remindersRef = useRef<Reminder[]>([]);
  remindersRef.current = reminders;
  useEffect(() => {
    const tick = () => checkDue(remindersRef.current);
    tick();
    const id = setInterval(tick, 20000);
    return () => clearInterval(id);
  }, []);

  const enable = async () => {
    const p = await requestNotificationPermission();
    setPerm(p);
    // In cloud mode (user or guest, DB connected) register for server push so
    // reminders fire even with the app closed (delivered by the cron job).
    if (p === "granted" && mode === "cloud") subscribeToPush();
  };

  const addTime = (t: string) => {
    if (t && !times.includes(t)) setTimes((p) => [...p, t].sort());
  };

  const submit = async () => {
    if (!name.trim()) return;
    await add({ name: name.trim(), strength, frequency, timing, times, notes: "", tz: deviceTz() });
    setName("");
    setStrength("");
    setFrequency("");
    setTiming("");
    setTimes([]);
  };

  return (
    <main className="wrap">
      <header className="app">
        <div className="logo" aria-hidden>
          ⏰
        </div>
        <div>
          <h1>Reminders</h1>
          <p>{readOnlyHint || "Get notified when it's time for each dose"}</p>
        </div>
      </header>

      {mode === "local" && (
        <div className="banner warn" style={{ marginBottom: 12 }}>
          <span>📱</span>
          <span>Saved on this device only — not backed up. Sign in from the Account tab to keep these safe and share with family.</span>
        </div>
      )}
      {mode === "cloud" && (
        <div className="banner ok" style={{ marginBottom: 12 }}>
          <span>☁️</span>
          <span>Saved to your account — synced across devices and shareable with family.</span>
        </div>
      )}

      {perm !== "granted" && (
        <div className="card notif-card">
          <div>
            <strong>Turn on dose alerts</strong>
            <p>Allow notifications so DawaiSathi can remind you at each time.</p>
          </div>
          <button className="btn-primary" onClick={enable}>
            {perm === "denied" ? "Blocked — enable in settings" : "Enable"}
          </button>
        </div>
      )}

      {/* Add reminder */}
      <div className="card" style={{ marginTop: 14 }}>
        <h2 className="card-title">Add a reminder</h2>
        <div className="field">
          <label>Medicine</label>
          <input value={name} placeholder="e.g. Metformin" onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="grid" style={{ marginTop: 10 }}>
          <div className="field">
            <label>Strength / dose</label>
            <input value={strength} placeholder="500 mg" onChange={(e) => setStrength(e.target.value)} />
          </div>
          <div className="field">
            <label>Timing</label>
            <input value={timing} placeholder="after food" onChange={(e) => setTiming(e.target.value)} />
          </div>
          <div className="field full">
            <label>Frequency note</label>
            <input
              value={frequency}
              placeholder="e.g. Twice a day / 1-0-1"
              onChange={(e) => setFrequency(e.target.value)}
            />
          </div>
        </div>

        <div className="field full" style={{ marginTop: 10 }}>
          <label>Reminder times</label>
          <div className="time-row">
            <input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} />
            <button className="btn-ghost" onClick={() => addTime(newTime)}>
              + Add time
            </button>
            {PRESETS.map((p) => (
              <button key={p.time} className="chip" onClick={() => addTime(p.time)}>
                {p.label}
              </button>
            ))}
          </div>
          {times.length > 0 && (
            <div className="time-chips">
              {times.map((t) => (
                <span key={t} className="time-chip">
                  {t}
                  <button onClick={() => setTimes((p) => p.filter((x) => x !== t))} aria-label="Remove">
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <button className="btn-primary" style={{ marginTop: 14, width: "100%" }} onClick={submit}>
          Add reminder
        </button>
      </div>

      {/* List */}
      <div className="section-title">
        <h2>Your medicines</h2>
        <span className="count">{reminders.length}</span>
      </div>

      {reminders.length === 0 && (
        <div className="card empty">No reminders yet. Add one above, or scan a prescription first.</div>
      )}

      {reminders.map((r) => (
        <div className={"med reminder" + (r.active ? "" : " inactive")} key={r.id}>
          <div className="reminder-head">
            <div>
              <div className="reminder-name">
                {r.name} {r.strength && <span className="reminder-strength">{r.strength}</span>}
              </div>
              {(r.frequency || r.timing) && (
                <div className="reminder-sub">{[r.frequency, r.timing].filter(Boolean).join(" · ")}</div>
              )}
            </div>
            <label className="switch" title="Active">
              <input
                type="checkbox"
                checked={r.active}
                onChange={(e) => update(r.id, { active: e.target.checked })}
              />
              <span className="slider" />
            </label>
          </div>

          <div className="reminder-times">
            {(r.times || []).length === 0 ? (
              <span className="muted-sm">No times set</span>
            ) : (
              (r.times || []).map((t) => (
                <span key={t} className="time-chip static">
                  ⏰ {t}
                </span>
              ))
            )}
          </div>

          <div className="med-foot">
            <button className="link-danger" onClick={() => remove(r.id)}>
              Remove
            </button>
          </div>
        </div>
      ))}

      <p className="disclaimer">
        Alerts fire while the app is open or installed to your home screen. For the most reliable
        reminders, install DawaiSathi (Add to Home Screen) and keep notifications enabled.
      </p>
    </main>
  );
}
