"use client";

import { SignInButton, SignUpButton, UserButton, useUser } from "@clerk/nextjs";

// The sign-in layer that sits on top of the (account-agnostic) profile panel.
// Only mounted when Clerk is configured. Signing in here triggers the
// guest→account merge on the next API call, so nothing the guest built is lost.
export default function ClerkAccountControls() {
  const { isLoaded, isSignedIn } = useUser();
  if (!isLoaded) return null;

  if (isSignedIn) {
    return (
      <div className="card" style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <UserButton />
        <div>
          <strong>Signed in</strong>
          <p className="muted-sm">Your reminders and family group are backed up and recover on any device.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="card-title">Secure your data</h2>
      <p className="muted">
        You&apos;re using DawaiSathi as a guest on this device. Sign in to back up your reminders and
        family group and recover them anywhere — everything you&apos;ve already added comes with you.
      </p>
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
  );
}
