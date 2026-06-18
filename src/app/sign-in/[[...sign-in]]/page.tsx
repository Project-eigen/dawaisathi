"use client";

import { SignIn } from "@clerk/nextjs";
import { authEnabled } from "@/lib/config";

export default function SignInPage() {
  return (
    <main className="wrap center-screen">
      {authEnabled ? (
        <SignIn />
      ) : (
        <div className="card">Login isn&apos;t configured yet. Add Clerk keys to enable sign-in.</div>
      )}
    </main>
  );
}
