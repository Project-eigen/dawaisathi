# DawaiSathi — Medicine Photo Reader (PWA)

Snap a photo of a prescription, medicine strip, bottle label, or doctor's note and get
**every medicine with its dosage frequency** extracted automatically. Because AI can misread
names and handwriting, every field is **editable** — you review and correct the list before
trusting it.

Installable as a **PWA** (works offline for the shell, "Add to Home Screen" on mobile).

## How it works

1. You take/upload a photo in the browser.
2. The image is sent to a server route (`/api/analyze`) that calls **Google Gemini** vision
   (free tier) and asks for structured JSON: name, strength, form, frequency, timing, duration,
   notes, and a confidence level per medicine.
3. The result is shown in an editable review screen with confidence badges and warnings so you
   can fix anything wrong, add missed medicines, or remove false positives.
4. Copy the corrected list when you're happy with it.

> ⚠️ This is **not medical advice**. AI output can be wrong. Always confirm with the actual
> prescription and a pharmacist or doctor.

## Tech

- Next.js 15 (App Router) + React 19 + TypeScript
- Google Gemini `gemini-2.0-flash` (free tier) for vision + structured extraction
- PWA via web manifest + a small network-first service worker
- Deployed on Vercel

## Local setup

```bash
npm install
cp .env.example .env.local   # then paste your free Gemini key
npm run icons                # generate PWA icons (one-time)
npm run dev
```

Get a free Gemini API key (no credit card) at <https://aistudio.google.com/apikey> and put it in
`.env.local`:

```
GEMINI_API_KEY=your_key_here
```

## Deploy

Set `GEMINI_API_KEY` in your Vercel project's **Environment Variables**, then deploy. The app
runs entirely on Vercel (the API route is a serverless function).
