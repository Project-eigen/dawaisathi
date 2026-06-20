# DawaiSathi

Snap a photo of a prescription or medicine strip and get every medicine with its
dosage frequency, extracted by AI into an **editable** list. Save them as dose
**reminders** (with notifications) and share a patient's list with family.

Installable as a **PWA**.

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript
- Google Gemini (vision) for the photo reading
- Clerk (auth) + Neon Postgres (shared reminders) — both optional
- Web Push + an external cron for reminders that fire while the app is closed

The app degrades gracefully: with no keys it still scans and keeps reminders on the
device. Each capability turns on when its keys are present.

## Setup

```bash
npm install
cp .env.example .env.local   # fill in the keys you want
npm run icons                # generate PWA icons (one-time)
npm run dev
```

## Environment variables

| Variable | Required for | Notes |
| --- | --- | --- |
| `GEMINI_API_KEY` | Photo scanning | Free key: https://aistudio.google.com/apikey |
| `GEMINI_MODEL` | — | Optional override. Default `gemini-2.5-flash`. |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Login | From https://dashboard.clerk.com |
| `CLERK_SECRET_KEY` | Login | "" |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` / `_SIGN_UP_URL` | — | Default `/sign-in`, `/sign-up`. |
| `DATABASE_URL` | Cloud reminders, family sharing | Neon Postgres connection string. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Push reminders | Run `npm run gen-vapid`. |
| `VAPID_PRIVATE_KEY` | Push reminders | "" |
| `VAPID_SUBJECT` | Push reminders | `mailto:` or site URL. |
| `CRON_SECRET` | Push reminders | Long random string the scheduler must send. |

Push reminders need Clerk + Neon configured too.

## Reminders via cron-job.org

`/api/cron/reminders` checks every reminder against the current time (in each
reminder's own timezone) and pushes a notification for any that are due. Drive it
from a free scheduler such as [cron-job.org](https://cron-job.org):

1. `npm run gen-vapid` and put the keys + a `CRON_SECRET` in your environment.
2. Create a cronjob:
   - **URL:** `https://<your-app>/api/cron/reminders`
   - **Schedule:** every 1 minute
   - **Header:** `Authorization: Bearer <CRON_SECRET>` (or use `?secret=<CRON_SECRET>`)
3. On the device, open **Reminders** and enable notifications once (registers the
   browser for push). Web Push requires a production build / HTTPS.

The endpoint fires each reminder at most once per minute and notifies the patient
and any linked family members.

## Deploy

Set the variables you need in your Vercel project and deploy. Point cron-job.org at
the deployed `/api/cron/reminders` URL.
