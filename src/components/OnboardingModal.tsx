"use client";

import { useEffect, useState } from "react";

const PERMANENT_KEY = "dawaisathi:intro:v2"; // "don't show again"
const SESSION_KEY = "dawaisathi:intro:session"; // suppress for this visit

// One-time intro. Shows on first visit only — never again across page changes
// in the same visit, and never again at all if "Don't show this again" is kept.
export default function OnboardingModal() {
  const [open, setOpen] = useState(false);
  const [dontShow, setDontShow] = useState(true);

  useEffect(() => {
    try {
      if (localStorage.getItem(PERMANENT_KEY)) return;
      if (sessionStorage.getItem(SESSION_KEY)) return;
      setOpen(true);
    } catch {
      /* storage blocked — just skip the intro */
    }
  }, []);

  const dismiss = () => {
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
      if (dontShow) localStorage.setItem(PERMANENT_KEY, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="intro-title">
      <div className="modal-card">
        <div className="modal-logo" aria-hidden>
          ⚕
        </div>
        <h2 id="intro-title">Welcome to DawaiSathi</h2>
        <p className="modal-lead">Your medicine companion. Here&apos;s what you can do:</p>

        <ul className="modal-list">
          <li>
            <span aria-hidden>📷</span> <b>Scan</b> a prescription or strip — get every medicine and
            how often to take it.
          </li>
          <li>
            <span aria-hidden>✏️</span> <b>Review &amp; fix</b> anything the AI reads wrong before you
            trust it.
          </li>
          <li>
            <span aria-hidden>⏰</span> <b>Reminders</b> that notify you when it&apos;s time for a dose.
          </li>
          <li>
            <span aria-hidden>👨‍👩‍👧</span> <b>Patient &amp; family</b> accounts so a relative can help
            keep track.
          </li>
        </ul>

        <p className="modal-disclaimer">
          AI can make mistakes — this is not medical advice. Always confirm with a pharmacist or
          doctor.
        </p>

        <label className="modal-check">
          <input type="checkbox" checked={dontShow} onChange={(e) => setDontShow(e.target.checked)} />
          Don&apos;t show this again
        </label>

        <button className="btn-primary modal-go" onClick={dismiss}>
          Get started
        </button>
      </div>
    </div>
  );
}
