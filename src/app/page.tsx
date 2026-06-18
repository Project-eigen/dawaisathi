"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { saveScanToReminders } from "@/lib/saveScan";

type Confidence = "high" | "medium" | "low";

type Medicine = {
  name: string;
  strength: string;
  form: string;
  frequency: string;
  timing: string;
  duration: string;
  notes: string;
  confidence: Confidence;
};

type AnalyzeResponse = {
  medicines?: Partial<Medicine>[];
  warnings?: string[];
  error?: string;
};

const EMPTY_MED: Medicine = {
  name: "",
  strength: "",
  form: "",
  frequency: "",
  timing: "",
  duration: "",
  notes: "",
  confidence: "medium",
};

function normalize(m: Partial<Medicine>): Medicine {
  return { ...EMPTY_MED, ...m, confidence: (m.confidence as Confidence) || "medium" };
}

type Stage = "idle" | "loading" | "review";

export default function Home() {
  const [stage, setStage] = useState<Stage>("idle");
  const [preview, setPreview] = useState<string | null>(null);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const analyze = useCallback(async (file: File) => {
    setError(null);
    setStage("loading");

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    setPreview(dataUrl);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
      });
      const data: AnalyzeResponse = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || "Something went wrong reading the image.");
        setStage("idle");
        return;
      }

      setMedicines((data.medicines || []).map(normalize));
      setWarnings(data.warnings || []);
      setStage("review");
    } catch {
      setError("Network error — check your connection and try again.");
      setStage("idle");
    }
  }, []);

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) analyze(file);
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) analyze(file);
  };

  const update = (i: number, key: keyof Medicine, value: string) => {
    setMedicines((prev) => prev.map((m, idx) => (idx === i ? { ...m, [key]: value } : m)));
  };

  const remove = (i: number) => setMedicines((prev) => prev.filter((_, idx) => idx !== i));
  const add = () => setMedicines((prev) => [...prev, { ...EMPTY_MED, confidence: "high" }]);

  const reset = () => {
    setStage("idle");
    setPreview(null);
    setMedicines([]);
    setWarnings([]);
    setError(null);
  };

  const copyList = async () => {
    const text = medicines
      .map((m, i) => {
        const bits = [
          `${i + 1}. ${m.name}${m.strength ? " " + m.strength : ""}`.trim(),
          m.frequency && `   Frequency: ${m.frequency}`,
          m.timing && `   Timing: ${m.timing}`,
          m.duration && `   Duration: ${m.duration}`,
          m.notes && `   Notes: ${m.notes}`,
        ].filter(Boolean);
        return bits.join("\n");
      })
      .join("\n\n");
    try {
      await navigator.clipboard.writeText(text || "No medicines.");
      alert("Copied your reviewed list to the clipboard.");
    } catch {
      alert("Could not copy automatically. Select the text manually.");
    }
  };

  const saveToReminders = async () => {
    const valid = medicines.filter((m) => m.name.trim());
    if (valid.length === 0) {
      alert("Add at least one medicine first.");
      return;
    }
    setSaving(true);
    try {
      const where = await saveScanToReminders(
        valid.map((m) => ({
          name: m.name,
          strength: m.strength,
          frequency: m.frequency,
          timing: m.timing,
          notes: m.notes,
        }))
      );
      router.push("/reminders");
      if (where === "local") {
        // Reminders tab will show them in on-device mode.
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="wrap">
      <header className="app">
        <div className="logo" aria-hidden>
          ⚕
        </div>
        <div>
          <h1>DawaiSathi</h1>
          <p>Photo → medicines &amp; how often to take them</p>
        </div>
      </header>

      {error && (
        <div className="banner error" role="alert" style={{ marginBottom: 14 }}>
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {stage === "idle" && (
        <>
          <div
            className={"dropzone" + (dragging ? " drag" : "")}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            <div className="big-icon" aria-hidden>
              📷
            </div>
            <h2>Snap or upload a medicine photo</h2>
            <p>Prescription, strip, bottle label, or a doctor&apos;s note.</p>
            <div className="btn-row">
              <button className="btn-primary" onClick={() => cameraRef.current?.click()}>
                Take a photo
              </button>
              <button className="btn-ghost" onClick={() => fileRef.current?.click()}>
                Choose from gallery
              </button>
            </div>
          </div>

          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={onPick}
          />
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPick} />

          <p className="disclaimer">
            Results are AI-generated and may be wrong. Always review against the actual prescription
            and confirm with a pharmacist or doctor. Not medical advice.
          </p>
        </>
      )}

      {stage === "loading" && (
        <div className="card">
          <div className="spinner" />
          <p className="loading-text">Reading your photo and extracting medicines…</p>
          {preview && (
            <div className="preview">
              <img src={preview} alt="Your uploaded medicine" />
            </div>
          )}
        </div>
      )}

      {stage === "review" && (
        <>
          {warnings.length > 0 && (
            <div className="banner warn" style={{ marginBottom: 14 }}>
              <span>🔍</span>
              <div>
                <strong>Double-check these:</strong>
                <ul>
                  {warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div className="banner warn" style={{ marginBottom: 14 }}>
            <span>✏️</span>
            <span>
              The AI may misread names or doses — especially handwriting. Edit any field below to fix
              it before you rely on this list.
            </span>
          </div>

          <div className="section-title">
            <h2>Medicines</h2>
            <span className="count">
              {medicines.length} {medicines.length === 1 ? "item" : "items"}
            </span>
          </div>

          {medicines.length === 0 && (
            <div className="card empty">
              No medicines were detected. Add one manually, or go back and try a clearer photo.
            </div>
          )}

          {medicines.map((m, i) => (
            <div className="med" key={i}>
              <div className="med-head">
                <input
                  className="name"
                  value={m.name}
                  placeholder="Medicine name"
                  onChange={(e) => update(i, "name", e.target.value)}
                />
                <select
                  value={m.confidence}
                  onChange={(e) => update(i, "confidence", e.target.value)}
                  className={"badge " + m.confidence}
                  aria-label="Confidence"
                  style={{ border: "none" }}
                >
                  <option value="high">high</option>
                  <option value="medium">medium</option>
                  <option value="low">low</option>
                </select>
              </div>

              <div className="grid">
                <div className="field">
                  <label>Strength / dose</label>
                  <input
                    value={m.strength}
                    placeholder="e.g. 500 mg"
                    onChange={(e) => update(i, "strength", e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Form</label>
                  <input
                    value={m.form}
                    placeholder="tablet, syrup…"
                    onChange={(e) => update(i, "form", e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Frequency</label>
                  <input
                    className="freq"
                    value={m.frequency}
                    placeholder="e.g. Twice a day / 1-0-1"
                    onChange={(e) => update(i, "frequency", e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Timing</label>
                  <input
                    value={m.timing}
                    placeholder="after food…"
                    onChange={(e) => update(i, "timing", e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Duration</label>
                  <input
                    value={m.duration}
                    placeholder="e.g. 5 days"
                    onChange={(e) => update(i, "duration", e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Notes</label>
                  <input
                    value={m.notes}
                    placeholder="anything else"
                    onChange={(e) => update(i, "notes", e.target.value)}
                  />
                </div>
              </div>

              <div className="med-foot">
                <button className="link-danger" onClick={() => remove(i)}>
                  Remove
                </button>
              </div>
            </div>
          ))}

          <div className="actions">
            <button className="btn-ghost" onClick={add}>
              + Add medicine
            </button>
            <button className="btn-ghost" onClick={copyList}>
              Copy list
            </button>
            <button className="btn-primary" onClick={saveToReminders} disabled={saving}>
              {saving ? "Saving…" : "⏰ Save to Reminders"}
            </button>
            <button className="btn-ghost" onClick={reset}>
              Scan another
            </button>
          </div>

          <p className="disclaimer">
            This reviewed list is only as accurate as your corrections. Confirm dosing with a
            pharmacist or doctor before taking anything. Not medical advice.
          </p>
        </>
      )}
    </main>
  );
}
