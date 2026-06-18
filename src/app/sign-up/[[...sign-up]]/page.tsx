"use client";

import { SignUp } from "@clerk/nextjs";
import { authEnabled } from "@/lib/config";

export default function SignUpPage() {
  return (
    <main className="wrap center-screen">
      {authEnabled ? (
        <SignUp />
      ) : (
        <div className="card">Sign-up isn&apos;t configured yet. Add Clerk keys to enable accounts.</div>
      )}
    </main>
  );
}
