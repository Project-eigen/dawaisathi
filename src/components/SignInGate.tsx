"use client";

import { useEffect, useState } from "react";
import { SignInButton, SignUpButton, useUser } from "@clerk/nextjs";

const CHOSE_GUEST = "dawaisathi:guest-chosen:v1";

// First-run gate (only mounted when Clerk is configured). Shows sign-in up front
// with a clear guest bypass. Once you sign in or choose guest, it stays out of
// the way. Choosing guest mints the guest cookie so your data has a home.
export default function SignInGate() {
  const { isLoaded, isSignedIn } = useUser();
  const [choseGuest, setChoseGuest] = useState(true); // assume dismissed until storage says otherwise

  useEffect(() => {
    try {
      setChoseGuest(!!localStorage.getItem(CHOSE_GUEST));
    } catch {
      setChoseGuest(true);
    }
  }, []);

  if (!isLoaded) return null;
  if (isSignedIn || choseGuest) return null;

  const continueAsGuest = async () => {
    try {
      await fetch("/api/guest", { method: "POST" });
    } catch {
      /* DB may be off; local mode still works */
    }
    try {
      localStorage.setItem(CHOSE_GUEST, "1");
    } catch {
      /* ignore */
    }
    setChoseGuest(true);
  };

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gate-title"
      style={{ zIndex: 1000 }}
    >
      <div className="modal-card">
        <div className="modal-logo" aria-hidden>
          ⚕
        </div>
        <h2 id="gate-title">Welcome to DawaiSathi</h2>
        <p className="modal-lead">
          Sign in to keep your medicines and reminders safe and recover them on any device — or
          continue as a guest and sign in later. Either way your data follows you.
        </p>

        <div className="btn-row" style={{ justifyContent: "stretch", marginTop: 8 }}>
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

        <button className="btn-ghost modal-go" style={{ marginTop: 10 }} onClick={continueAsGuest}>
          Continue without signing in
        </button>

        <p className="modal-disclaimer" style={{ marginTop: 12 }}>
          As a guest you can scan, set reminders, and even create a family group — it&apos;s saved to
          this device&apos;s identity and moves into your account when you sign in.
        </p>
      </div>
    </div>
  );
}
