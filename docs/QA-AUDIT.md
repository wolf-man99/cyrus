# CYRUS QA audit

Scope: the whole app after stages 2–7 (Track, Reflect, assistant interface, Supabase, AI, voice). The audit covers functional, design, technical and UX checks. Nothing was redesigned; fixes were limited to what the audit found.

## How it was tested

| Area | Method | Result |
|---|---|---|
| Database, RLS, storage policies, migrations | `npm run test:db`: every migration on a local Postgres 16 with Supabase-style `auth` and `storage` stubs. Two users and an anonymous role try to read, write and link each other's rows | Pass |
| Domain logic, assistant tool loop, Edge Function, voice detection | `npm test`: 70 unit tests | Pass |
| Today, Track (7 domains), Reflect | `npm run e2e` in demo mode | Pass |
| Auth (sign up, sign in, wrong password, reset request) | Browser suite with Supabase Auth responses mocked | Pass |
| Assistant: retrieval, data entry, confirmation, decline, memory, persistence | Real app in Supabase mode against mocked Supabase REST and a scripted model | Pass |
| Voice: mic, recording upload, transcription, spoken reply, interrupt | Chromium fake microphone, mocked backend | Pass |
| New account (no data), AI not configured | Mocked empty backend | Pass |
| Layout | 12 routes at 375 px, 393 px and 1440 px: horizontal overflow and console errors | No overflow, no errors |

**Not tested:** a live Supabase project, real OpenAI responses, and real iPhone Safari. See *Remaining limitations*.

## 1. Issues identified and 2. fixed

| # | Issue | Fix |
|---|---|---|
| 1 | Phones had no way to sign out or change units and currency | Profile sheet with sign-out, from Today's top bar and the desktop side rail |
| 2 | Reflect showed goal progress from the goal's start value ("Emergency fund: 0 → 7,900") because earlier history wasn't loaded | Summary loads earlier progress; with no earlier record it says "now 7,900" instead of guessing |
| 3 | Same baseline bug in the assistant's weekly/monthly review tool | Same fix |
| 4 | Cyrus screen: with captions, a confirmation card and the keyboard open, the orb didn't shrink and the status line overlapped the transcript | The orb now takes only the remaining height |
| 5 | The message box kept its text until Cyrus finished replying | Clears as soon as the message is accepted |
| 6 | "0 vs previous" was shown in green as if it were an improvement | No change now reads as neutral |
| 7 | Domain stat labels truncated on phones ("Workouts · last 30 da…") | Date range moved into one section caption |
| 8 | Domain names in the weekly rating step truncated on small phones | Names wrap instead |
| 9 | Demo journal entries repeated the same text; "Updated 3 Days Ago" capitalised mid-sentence | Fixed |
| 10 | Demo sample data was shipped to real accounts | Loaded only in demo mode (−9 KB gzip) |
| 11 | The Edge Function had no rate limit, so one signed-in user could run up OpenAI costs | Per-user limit (`RATE_LIMIT_PER_MINUTE`, default 40/min) |

## 3. Remaining limitations

- **No live end-to-end run yet.** The Supabase repository is type-checked and its main request shapes (inserts, updates, conversation storage) are verified against mocked REST, and the schema is verified on real Postgres. But no run has gone through a real Supabase project, Storage upload or OpenAI. Real model behaviour (choosing the right tool, tone) also needs tuning with real conversations.
- **iPhone Safari not tested on a device.** Microphone recording (Safari records `audio/mp4`), audio unlock for spoken replies, safe areas and Home Screen install were only checked in Chromium's iPhone emulation.
- **Mixed currencies are summed as if they were one.** Each expense keeps its own currency (e.g. a ₹500 entry), but totals, savings rate and net worth add amounts without converting.
- **Dates use the device's time zone.** The profile time zone is only passed to the assistant.
- **No offline writes.** The app shell works offline, but logging needs a connection.
- **Limited editing.** Tasks can't be edited or deleted in the UI (only completed), and log entries can be deleted from History but not edited.
- **Rate limit is per function instance**, not global.
- **Summaries are computed in the browser.** Fine for one person's data; years of history may eventually need server-side aggregation.

## 4. Security concerns

- **`ALLOWED_ORIGINS` defaults to `*`.** Set it to the app's domain in production.
- **Third-party processing.** Messages, transcribed speech and the data tools read are sent to OpenAI. Tell users, and review the account's data-retention settings.
- **Prompt injection through stored text.** A task title or note could contain instructions. Impact is limited: the assistant has no delete tools, edits to existing records need confirmation, and all inputs are validated. New log entries are created without confirmation, so the worst case is unwanted entries.
- **Auth hardening is a Supabase setting.** Turn on email confirmation and leaked-password protection, and consider MFA.
- **Session tokens live in localStorage** (standard for SPAs). No user content is rendered as HTML. Add a Content-Security-Policy and security headers at the host to reduce XSS risk further.
- **Verified:** per-user isolation on every table and storage folder, no ownership spoofing, no cross-user links, anon role sees nothing, the OpenAI key never reaches the client, the Edge Function rejects anon-key-only calls and hides upstream errors.

## 5. Recommended next improvements

1. **Staging run:** connect a staging Supabase project and OpenAI key, walk through every flow, and tune the system prompt on real conversations.
2. **Device pass on iPhone:** Safari and Home Screen, voice in particular.
3. **Multi-currency:** group totals by currency or convert to the profile currency.
4. **Edit and delete tasks**, and edit log entries.
5. **Lower voice latency:** stream text-to-speech, then move to a realtime voice API behind the existing service interfaces.
6. **Offline queue** for quick logs.
7. **Security headers** (CSP, HSTS) at the host, and a shared rate-limit store.
8. **Native iOS shell with App Intents** for Siri, using the same Edge Function and tool contract.
