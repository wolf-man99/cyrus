# CYRUS architecture

```
src/
  app/            App root, router, providers (auth, data, toasts)
  config/         Browser-safe env (VITE_* only)
  styles/         Tailwind v4 design tokens (@theme), base styles, planet and orb CSS
  domain/         Pure logic: types, zod schemas, goals, habits, finance, series, period summaries,
                  life-domain config, reflection templates (unit tested)
  data/
    repository.ts   The persistence contract everything depends on
    supabase/       Supabase implementation (Row Level Security does the access control)
    demo/           In-memory implementation with generated sample history (demo mode only)
    hooks/          React Query hooks; one generic mutation hook invalidates affected data
    operations.ts   Multi-step operations shared by UI and assistant
  services/
    assistant/      Speech-to-text, reasoner and text-to-speech contracts; proxy and demo
                    implementations; tool registry; the agent loop (engine.ts)
    audio/          Microphone capture, speech playback, voice activity detection
  components/       UI kit, layout, charts, brand, the Cyrus orb
  features/         today · track · reflect · cyrus · auth · profile
supabase/
  migrations/       Schema, RLS, storage policies (applied in order)
  functions/cyrus/  Edge Function: handler.ts (testable), prompt.ts, index.ts (Deno entry)
  tests/            Local Postgres stubs, fixtures and RLS tests
e2e/                Browser suites (Playwright)
```

## Data model

| Table | Holds |
|---|---|
| `profiles` | Name, weight unit, currency, time zone (created by a trigger at sign-up) |
| `tasks` | Tasks; a due time makes a commitment; future dates are "upcoming" |
| `habits`, `habit_logs` | Habits and one row per day done |
| `goals` | Per-domain goals with start, current and target values, category and status (active, paused, completed, archived) |
| `activity_logs` | Everything done in a domain: meditation, journal, focus, reading, notes, social time, speaking practice, achievements, milestones, revenue, and goal-progress history (written by a trigger) |
| `domain_metrics` | Numeric series: mood and energy (1–5), body measurements, savings and debt balances |
| `weight_logs`, `workouts` | Weight; workouts with optional exercises |
| `expenses`, `income`, `investments` | Money in, money out, holdings and their current value |
| `learning_resources`, `skills`, `projects` | Books and courses with progress; skills with current and target level; career projects and business ideas, ventures and experiments |
| `health_reports` | Metadata for files in the private `health-reports` bucket (`<user_id>/<file>`) |
| `reflections`, `reflection_goals` | Daily, weekly and monthly reflections with domain ratings, and the goals they mention |
| `conversations`, `messages` | Assistant memory, including the actions taken in each reply |

Every user-owned table has `user_id default auth.uid()`, RLS policies scoped to the owner, CHECK constraints mirroring the zod schemas, and indexes on `(user_id, time)`. Composite foreign keys (`(id, user_id)`) make it impossible to link to another user's habit, goal, reflection or conversation, even with a guessed id.

## Data flow

```
UI ─▶ React Query hook ─▶ Repository ─┬─ Supabase (RLS)   real accounts
                                      └─ Demo (in memory)  demo mode only, loaded on demand
```

All writes are validated with the zod schemas in `domain/schemas.ts`, and again by Postgres. Toggles are optimistic. `useSaveFeedback` never says "saved" in demo mode.

## The assistant

```
             ┌──────────── client ────────────┐            ┌──── Edge Function ────┐
mic ─▶ MicrophoneCapture ─▶ SpeechToText ──────┼──/transcribe──▶ OpenAI STT
                                               │
text ─▶ engine.runTurn ◀──▶ Reasoner ──────────┼──/chat────────▶ system prompt + OpenAI chat (tools)
            │ tool calls                       │
            ▼                                  │
        tools.ts ─▶ Repository (user's own RLS session)
            │ confirm() for consequential changes
            ▼
        reply ─▶ TextToSpeech ─────────────────┼──/speech──────▶ OpenAI TTS
                  └▶ SpeechPlayer ─▶ orb level │
```

- **Three separate services.** Speech recognition, reasoning and speech generation each sit behind their own interface and endpoint, so any one can move to a realtime voice API, an on-device model or a native iOS bridge without touching the others.
- **Tools run on the client, through the Repository.** The model never gets database credentials; every read and write uses the signed-in user's session, so Row Level Security applies, and inputs pass the same validation as the UI. 27 tools cover retrieval, data entry, updates and analysis (`get_period_review` reuses the same summary logic as Reflect).
- **Action safety.** Tools that change existing records or are hard to undo (`update_task`, `create_goal`, `update_goal`, `save_reflection`) wait for explicit confirmation: tap, or say "yes" or "no". There are no delete tools. Every change appears as a receipt under the reply and is stored with the message.
- **Honesty rules** live in the server-side system prompt: use tools for facts, never invent data, say when something isn't recorded, treat conversation memory as memory rather than records, challenge weak reasoning, and ask when a request is ambiguous.
- **Memory.** Conversations and messages are stored; the most recent conversation resumes for 12 hours, and earlier ones can be reopened. The last 20 turns are sent as context.
- **States.** `conversationMachine.ts` is a pure reducer for the six visual states, plus pausing for confirmation. The orb reads live levels from the microphone or speech playback and writes transforms directly to the DOM each frame.

### Voice

Tap the mic and speak; voice activity detection ends the turn after a pause (or tap again). Holding the mic is push-to-talk. Tapping during a reply interrupts it immediately. The app checks microphone permission up front, explains how to fix a block, and falls back to typing. Offline and network failures show a clear error with **Try again**. Audio is sent for transcription only and is never stored.

### Extending

- **Realtime voice:** implement `Reasoner` + `SpeechToText` + `TextToSpeech` over a WebRTC realtime session; the engine, tools and orb stay as they are.
- **Native iOS / Siri:** an App Intents extension can call the same Edge Function and the same tool contract. Until then, an iOS Shortcut opening `/cyrus` gives "Hey Siri, talk to Cyrus". No always-on listening exists in the PWA.
- **New tools:** add an entry to `services/assistant/tools.ts` with a zod schema; it is sent to the model automatically.
- **New domain features:** add an activity kind to `features/track/activityKinds.ts`, or a module slot in `features/track/domains/`.

## Security model

| Concern | How it's handled |
|---|---|
| Data isolation | RLS on every table (verified by `npm run test:db`), `user_id` defaulted server-side, composite foreign keys |
| Files | Private bucket, per-user folders enforced by storage policies, 5-minute signed URLs, type and size checks before upload |
| Secrets | Only the Supabase URL and anon key are in the bundle; the OpenAI key is an Edge Function secret; no service-role key in the app |
| Edge Function | Requires a real user session (anon key alone is rejected), validates every request, caps sizes, rate-limits per user, restricts CORS to `ALLOWED_ORIGINS`, never returns upstream error details |
| Assistant | No elevated access; confirmations for consequential changes; no delete capability; all inputs validated |
| Client | No HTML rendering of user content; React escapes everything |
