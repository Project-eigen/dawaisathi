"use client";

import { SignInButton, SignUpButton, UserButton, useUser } from "@clerk/nextjs";
import { useCallback, useEffect, useState } from "react";

type CaringFor = { patientId: string; name: string | null; code: string };
type Profile = {
  role: "patient" | "family";
  displayName?: string;
  patientCode: string;
  caringFor: CaringFor[];
};

export default function AccountAuthed() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [dbDown, setDbDown] = useState(false);
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
        setProfile(await res.json());
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (isSignedIn) load();
  }, [isSignedIn, load]);

  const setRole = async (role: "patient" | "family") => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, displayName: user?.firstName || user?.fullName || "" }),
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

  return (
    <main className="wrap">
      <header className="app">
        <div className="logo" aria-hidden>
          👤
        </div>
        <div>
          <h1>Account</h1>
          <p>Patient &amp; family access</p>
        </div>
        {isSignedIn && (
          <div style={{ marginLeft: "auto" }}>
            <UserButton />
          </div>
        )}
      </header>

      {!isLoaded && <div className="card empty">Loading…</div>}

      {isLoaded && !isSignedIn && (
        <div className="card">
          <h2 className="card-title">Sign in to sync &amp; share</h2>
          <p className="muted">
            Create an account to back up your reminders and share them between a patient and a family
            member. There are two account types:
          </p>
          <ul className="role-list">
            <li>
              <b>🧑‍🦰 Patient</b> — scan medicines, set your own reminders, get a code to share.
            </li>
            <li>
              <b>👨‍👩‍👧 Family member</b> — link to a patient with their code and help manage their doses.
            </li>
          </ul>
          <div className="btn-row" style={{ justifyContent: "stretch" }}>
            <SignUpButton mode="modal">
              <button className="btn-primary" style={{ flex: 1 }}>
                Create account
              </button>
            </SignUpButton>
            <SignInButton mode="modal">
              <button className="btn-ghost" style={{ flex: 1 }}>
                Sign in
              </button>
            </SignInButton>
          </div>
        </div>
      )}

      {isLoaded && isSignedIn && dbDown && (
        <div className="banner warn" style={{ marginBottom: 12 }}>
          <span>🗄️</span>
          <span>
            Database not connected yet, so roles &amp; family sharing are paused. Reminders still work
            on this device. (Add <code>DATABASE_URL</code> to enable sharing.)
          </span>
        </div>
      )}

      {isLoaded && isSignedIn && !dbDown && profile && (
        <>
          <div className="card">
            <h2 className="card-title">I am a…</h2>
            <div className="role-toggle">
              <button
                className={"role-btn" + (profile.role === "patient" ? " on" : "")}
                disabled={busy}
                onClick={() => setRole("patient")}
              >
                🧑‍🦰 Patient
              </button>
              <button
                className={"role-btn" + (profile.role === "family" ? " on" : "")}
                disabled={busy}
                onClick={() => setRole("family")}
              >
                👨‍👩‍👧 Family member
              </button>
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
        </>
      )}

      {msg && (
        <div className="banner ok" style={{ marginTop: 12 }}>
          <span>✅</span>
          <span>{msg}</span>
        </div>
      )}
    </main>
  );
}
