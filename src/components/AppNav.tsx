"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "Scan", icon: "📷" },
  { href: "/reminders", label: "Reminders", icon: "⏰" },
  { href: "/account", label: "Account", icon: "👤" },
];

export default function AppNav() {
  const path = usePathname();
  return (
    <nav className="bottom-nav" aria-label="Primary">
      {tabs.map((t) => {
        const active = t.href === "/" ? path === "/" : path.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} className={"nav-tab" + (active ? " active" : "")}>
            <span className="nav-icon" aria-hidden>
              {t.icon}
            </span>
            <span className="nav-label">{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
