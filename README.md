# CYRUS

**Your personal intelligence system.** A mobile-first personal operating system for improving every area of life (physical, mental, intellectual, financial, social, career and entrepreneurship), with an integrated AI assistant, also called CYRUS.

> Simple to use. Powerful under the hood.

Design language: **Orbit × Yap**, in the *Ion core / Volt orb* palette. Blue-tinted graphite surfaces and electric blue for actions; the assistant orb and the Today planet glow in electric green, teal and blue. The chrome stays quiet so each screen has one bright element: the planet on Today, the orb on Cyrus.

## What's in the app

| Section | What it does |
|---|---|
| **Today** | Greeting, a progress planet for the day, priorities, one-tap habits with streaks, tasks and commitments, upcoming items, quick logging (weight, workout, expense, task), profile and settings |
| **Track** | Seven life domains on one shared layout: quick logging, key metrics, a progress chart with a date filter, goals (add, edit, update progress, complete, archive), domain collections and a filterable history. Health report uploads, mood check-ins, reading progress, investments and net worth, monthly money summaries, speaking practice, projects, skills, ventures, experiments and revenue |
| **Reflect** | Daily, weekly and monthly reviews: one short prompt at a time, context from your own records, domain ratings, linked goals, drafts kept on the device, edit any past reflection, live weekly and monthly summaries |
| **Cyrus** | Full-screen voice assistant with six orb states (idle, listening, thinking, speaking, interrupted, error). Answers from your data, logs and updates things in natural language, asks before consequential changes, remembers the conversation. Tap or hold to talk, interrupt anytime, or type |

## Run it

```bash
npm install
npm run dev
```

With no backend configured, CYRUS runs in **demo mode**: three months of realistic sample data, a persistent "Demo mode · nothing is saved" label, and changes that reset on reload. The assistant's interface works and the microphone drives the orb, but there is **no AI**: typed messages get a clearly labelled *demo response*, and voice isn't sent anywhere.

## Connect the backend

### 1. Supabase: accounts, database, storage

1. Create a Supabase project.
2. Apply the schema with `supabase db push`, or run the files in `supabase/migrations/` in order in the SQL editor. This creates every table with **Row Level Security**, the private `health-reports` storage bucket and its policies.
3. In **Authentication → URL configuration**, add your app URL (e.g. `http://localhost:5173`) to the redirect URLs. It is used for confirmation and password-reset links.
4. Recommended in **Authentication → Providers → Email**: keep "Confirm email" on and enable leaked-password protection.
5. Copy `.env.example` to `.env.local`:

```bash
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon / publishable key>
```

The anon key is designed to be public. Every row is restricted to its owner (`user_id = auth.uid()`), and `user_id` is set by the database, so a client can't write rows for anyone else. No service-role key is used anywhere.

### 2. Cyrus AI: OpenAI, server-side only

The OpenAI key **never** reaches the browser. It's an Edge Function secret:

```bash
supabase secrets set OPENAI_API_KEY=sk-...
supabase functions deploy cyrus
```

Optional secrets:

| Secret | Default | Purpose |
|---|---|---|
| `OPENAI_CHAT_MODEL` | `gpt-4o-mini` | Reasoning and tool use |
| `OPENAI_TRANSCRIBE_MODEL` | `gpt-4o-mini-transcribe` | Speech to text |
| `OPENAI_TTS_MODEL` | `gpt-4o-mini-tts` | Text to speech |
| `OPENAI_TTS_VOICE` | `sage` | Voice |
| `ALLOWED_ORIGINS` | `*` | Comma-separated CORS allow-list. **Set this in production** |
| `RATE_LIMIT_PER_MINUTE` | `40` | Requests per user per minute |

Model names change over time; set these to current models your account can use. The Cyrus screen always shows whether a real model is answering: **Connected**, **AI unavailable** (backend up, key missing or unreachable) or **Demo · AI not connected**.

## Install on iPhone

Deploy the build over HTTPS, open it in Safari, then **Share → Add to Home Screen**. CYRUS launches full-screen with its own icon and caches the app shell for offline launch. Data and AI requests are never cached.

The PWA listens only while you hold or tap the microphone. There is no background listening or wake word; browsers don't allow it. "Hey Siri" can open CYRUS through an iOS Shortcut that opens `https://<your-app>/cyrus`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Type-check and production build (with service worker) |
| `npm test` | Unit tests: domain logic, the assistant's tool loop, the Edge Function handler, voice activity detection (Vitest) |
| `npm run test:db` | Applies every migration to a throwaway local Postgres and checks Row Level Security, ownership, constraints and data carry-over (needs PostgreSQL 15+ installed) |
| `npm run e2e` | Browser suites: every screen in demo mode, the assistant and voice against a mocked Supabase, new-account empty states, layout at three screen sizes (needs Playwright with Chromium) |
| `npm run icons` | Re-render app icons from `public/icons/favicon.svg` |

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): how the pieces fit, the data model, the assistant and security
- [docs/QA-AUDIT.md](docs/QA-AUDIT.md): the latest audit, with what was fixed and what's left
