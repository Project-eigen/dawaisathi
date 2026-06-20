"use client";

import { authEnabled } from "@/lib/config";
import AccountScreen from "@/components/AccountScreen";
import ClerkAccountControls from "@/components/ClerkAccountControls";

export default function AccountPage() {
  // The profile/family UI works for guests too; Clerk sign-in is layered on
  // top only when it's configured.
  return <AccountScreen authControls={authEnabled ? <ClerkAccountControls /> : null} />;
}
