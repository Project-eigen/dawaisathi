"use client";

import { authEnabled } from "@/lib/config";
import AccountAuthed from "@/components/AccountAuthed";

export default function AccountPage() {
  if (!authEnabled) {
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
        </header>
        <div className="card">
          <h2 className="card-title">Login isn&apos;t set up yet</h2>
          <p className="muted">
            Patient and family-member sign-in turns on once Clerk keys are added to the app. Until
            then, you can still scan medicines and keep reminders on this device.
          </p>
        </div>
      </main>
    );
  }
  return <AccountAuthed />;
}
