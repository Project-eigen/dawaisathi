"use client";

import ProfilePanel from "./ProfilePanel";

// Account-agnostic account screen. `authControls` is the optional Clerk sign-in
// layer, passed in only when Clerk is configured.
export default function AccountScreen({ authControls }: { authControls?: React.ReactNode }) {
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

      {authControls}
      <ProfilePanel />
    </main>
  );
}
