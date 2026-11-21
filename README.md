# CYRUS

**Your personal intelligence system.** A mobile-first personal operating system for improving every area of life (physical, mental, intellectual, financial, social, career and entrepreneurship), with an integrated AI assistant, also called CYRUS.

> Simple to use. Powerful under the hood.

Design language: **Orbit × Yap**. Deep cosmic backgrounds, dark purple surfaces, a glowing planet for daily progress, and a full-screen energy orb for the assistant.

---

## Quick start (demo mode)

```bash
npm install
npm run dev
```

Open http://localhost:5173. With no backend configured, CYRUS runs in **demo mode**:

- Sample data generated for today. Changes live only in the current tab and **reset on reload**.
- A persistent "Demo mode · nothing is saved" label, and save confirmations that say "not saved".
- The Cyrus assistant interface is fully interactive (the mic really listens and drives the orb), but **no AI is connected**. Nothing is sent anywhere and no reply is simulated. A visual *preview* control lets you step through the orb's six states, and it is labelled as a preview.

## Connect a real backend

### 1. Supabase (auth, database, storage)

1. Create a Supabase project.
2. Apply the schema: `supabase db push`, or paste `supabase/migrations/20261121000000_cyrus_init.sql` into the SQL editor. It creates all tables, enables **Row Level Security** on every user-owned table, and creates the private `health-reports` storage bucket.
3. In **Authentication → URL configuration**, add your app URL (e.g. `http://localhost:5173`) as a redirect URL. Sign-in is a passwordless email link.
4. Copy `.env.example` to `.env.local` and fill in:

```bash
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon / publishable key>
```

The anon key is designed to be public. RLS restricts every row to its owner (`user_id = auth.uid()`), and `user_id` is set server-side by default, so a client cannot write rows for anyone else.

### 2. Cyrus AI (OpenAI, server-side only)

The OpenAI key **never** reaches the browser. It lives in an Edge Function secret:

```bash
supabase secrets set OPENAI_API_KEY=sk-...
supabase functions deploy cyrus
```

Optional settings (all server-side):

| Secret | Default | Purpose |
|---|---|---|
| `OPENAI_CHAT_MODEL` | `gpt-4o-mini` | Conversation model |
| `OPENAI_TRANSCRIBE_MODEL` | `gpt-4o-mini-transcribe` | Speech to text |
| `OPENAI_TTS_MODEL` | `gpt-4o-mini-tts` | Text to speech |
| `OPENAI_TTS_VOICE` | `sage` | Voice |
| `ALLOWED_ORIGINS` | `*` | Comma-separated CORS allow-list, e.g. `https://cyrus.example.com` |

Model names change over time, so set these to whichever current models your account has access to.

The function rejects any request that isn't from a signed-in user. The Cyrus screen shows **Connected**, **AI unavailable** (backend up, key missing or unreachable) or **Demo · AI not connected**, so you can always tell whether a real model is answering.

## Install on iPhone (PWA)

Build and deploy (`npm run build`, serve `dist/` over HTTPS), open it in Safari, then **Share → Add to Home Screen**. CYRUS launches full-screen with its own icon, respects the notch and home indicator, and caches the app shell for offline launch. Data and AI requests are never cached.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Type-check and production build (with service worker) |
| `npm run preview` | Serve the production build locally |
| `npm test` | Unit tests (Vitest) |
| `npm run typecheck` | TypeScript only |
| `npm run icons` | Re-render PNG app icons from `public/icons/favicon.svg` (needs Playwright) |

## Build status

The build follows the phased strategy in the product spec.

| Area | Status |
|---|---|
| Design system & tokens | ✅ `src/styles/index.css` (CSS tokens), `src/design/tokens.ts` |
| Navigation & reusable components | ✅ Tab bar (mobile), side rail (desktop), sheets, fields, chips, states |
| **Today** dashboard | ✅ Greeting, progress planet, priorities, habits (one tap), tasks & commitments, upcoming, quick logs for weight / workout / expense / task, Cyrus entry points |
| Architecture | ✅ Repository layer (Supabase + demo), React Query, zod validation, RLS schema, AI service layer, edge function, PWA |
| **Cyrus** interface | ✅ Full-screen orb with 6 states, push-to-talk, interrupt, end, text input, captions, history. AI responses require the connected backend |
| **Track** | 🟡 All 7 domains with Overview · Goals · Activities · Progress · History. Physical (weight, workouts) and Financial (expenses) show real data. Other domains show goals, with activity logging in the next phase |
| **Reflect** | 🟡 Daily / weekly / monthly templates and history storage in place. Writing reviews is the next phase |
| Assistant actions (log, plan, analyse) | 🟡 Capability registry defined (`src/services/ai/capabilities.ts`), not yet enabled |

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how the pieces fit together.
