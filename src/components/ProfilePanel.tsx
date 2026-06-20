"use client";

import { useCallback, useEffect, useState } from "react";

type CaringFor = { patientId: string; name: string | null; code: string };
type Profile = {
  role: "patient" | "family";
  displayName?: string;
  patientCode: string;
  caringFor: CaringFor[];
};

// Role, share code, and family linking. Identity comes from the server (Clerk
// user or guest cookie), so this works the same whether or not you're signed in.
export default function ProfilePanel() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [dbDown, setDbDown] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/profile");
      if (res.status === 503) {
        setDbDown(true);
        return;
      }
      if (res.ok) {
        setDbDown(false);
        const d: Profile = await res.json();
        setProfile(d);
        setDisplayName(d.displayName || "");
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (role: "patient" | "family") => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, displayName }),
      });
      if (res.status === 503) setDbDown(true);
      else if (res.ok) setProfile(await res.json());
    } finally {
      setBusy(false);
    }
  };

  const link = async () => {
    setMsg(null);
    const res = await fetch("/api/link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const d = await res.json().catch(() => ({}));
    if (res.ok) {
      setCode("");
      setMsg("Linked! Open the Reminders tab to manage their medicines.");
      load();
    } else {
      setMsg(d.error || "Could not link.");
    }
  };

  const unlink = async (patientId: string) => {
    await fetch(`/api/link?patientId=${patientId}`, { method: "DELETE" });
    load();
  };

  const copyCode = async () => {
    if (!profile) return;
    try {
      await navigator.clipboard.writeText(profile.patientCode);
      setMsg("Code copied — share it with your family member.");
    } catch {
      /* ignore */
    }
  };

  if (dbDown) {
    return (
      <div className="banner warn" style={{ marginBottom: 12 }}>
        <span>🗄️</span>
        <span>
          Family sharing needs a database. Reminders still work on this device. (Add{" "}
          <code>DATABASE_URL</code> to enable groups &amp; sharing.)
        </span>
      </div>
    );
  }

  if (!profile) return <div className="card empty">Loading…</div>;

  return (
    <>
      <div className="card">
        <h2 className="card-title">I am a…</h2>
        <div className="role-toggle">
          <button
            className={"role-btn" + (profile.role === "patient" ? " on" : "")}
            disabled={busy}
            onClick={() => save("patient")}
          >
            🧑‍🦰 Patient
          </button>
          <button
            className={"role-btn" + (profile.role === "family" ? " on" : "")}
            disabled={busy}
            onClick={() => save("family")}
          >
            👨‍👩‍👧 Family member
          </button>
        </div>
        <div className="field" style={{ marginTop: 12 }}>
          <label>Your name (optional)</label>
          <input
            value={displayName}
            placeholder="e.g. Asha"
            onChange={(e) => setDisplayName(e.target.value)}
            onBlur={() => displayName !== (profile.displayName || "") && save(profile.role)}
          />
        </div>
      </div>

      {profile.role === "patient" && (
        <div className="card" style={{ marginTop: 12 }}>
          <h2 className="card-title">Your share code</h2>
          <p className="muted">Give this to a family member so they can help track your meds.</p>
          <div className="code-box">
            <span className="code">{profile.patientCode}</span>
            <button className="btn-ghost" onClick={copyCode}>
              Copy
            </button>
          </div>
        </div>
      )}

      {profile.role === "family" && (
        <div className="card" style={{ marginTop: 12 }}>
          <h2 className="card-title">Link to a patient</h2>
          <p className="muted">Enter the code your patient shared with you.</p>
          <div className="time-row">
            <input
              value={code}
              placeholder="e.g. K7M2QP"
              maxLength={6}
              style={{ textTransform: "uppercase", letterSpacing: "0.15em", fontWeight: 700 }}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
            <button className="btn-primary" onClick={link} disabled={!code.trim()}>
              Link
            </button>
          </div>

          {profile.caringFor.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div className="muted-sm">Caring for:</div>
              {profile.caringFor.map((c) => (
                <div key={c.patientId} className="link-row">
                  <span>{c.name || c.code}</span>
                  <button className="link-danger" onClick={() => unlink(c.patientId)}>
                    Unlink
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {msg && (
        <div className="banner ok" style={{ marginTop: 12 }}>
          <span>✅</span>
          <span>{msg}</span>
        </div>
      )}
    </>
  );
}
