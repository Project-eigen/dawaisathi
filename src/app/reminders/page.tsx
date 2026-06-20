import RemindersScreen from "@/components/RemindersScreen";

// Works for everyone: signed-in users and cookie-identified guests both get
// cloud reminders when a database is connected; otherwise on-device local mode.
export default function RemindersPage() {
  return <RemindersScreen />;
}
