"use client";

import { authEnabled } from "@/lib/config";
import RemindersView from "@/components/RemindersView";
import AuthedReminders from "@/components/AuthedReminders";

export default function RemindersPage() {
  // With Clerk configured we can sync/share; otherwise on-device local reminders.
  return authEnabled ? <AuthedReminders /> : <RemindersView signedIn={false} />;
}
