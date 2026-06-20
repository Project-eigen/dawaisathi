import type { Metadata, Viewport } from "next";
import "./globals.css";
import RegisterSW from "./register-sw";
import AppNav from "@/components/AppNav";
import OnboardingModal from "@/components/OnboardingModal";
import SignInGate from "@/components/SignInGate";
import { ClerkProvider } from "@clerk/nextjs";
import { authEnabled } from "@/lib/config";

export const metadata: Metadata = {
  title: "DawaiSathi — Read your medicines from a photo",
  description:
    "Snap a photo of a prescription or medicine strip and get every medicine with its dosage frequency. Review, fix, and set reminders. Patient & family accounts.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "DawaiSathi" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#0f766e",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const tree = (
    <html lang="en">
      <body>
        {authEnabled && <SignInGate />}
        <OnboardingModal />
        <div className="app-shell">{children}</div>
        <AppNav />
        <RegisterSW />
      </body>
    </html>
  );

  // Only mount ClerkProvider when keys exist, so the app builds/runs without them.
  return authEnabled ? <ClerkProvider>{tree}</ClerkProvider> : tree;
}
