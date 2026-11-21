# CYRUS architecture

```
src/
  app/            App root, router, providers (auth, data, toasts)
  config/         Browser-safe env (VITE_* only, validated with zod)
  design/         JS mirror of design tokens
  styles/         Tailwind v4 + design tokens (@theme), base styles, orb/planet CSS
  domain/         Pure domain model: types, life-domain config, reflection templates,
                  zod schemas, habit streaks, progress maths (unit tested)
  data/
    repository.ts   The persistence contract the UI depends on
    supabase/       Supabase client + RLS-backed repository
    demo/           In-memory sample repository (demo mode, never persisted)
    hooks/          React Query hooks: queries, optimistic mutations, honest save feedback
  services/
    ai/             Assistant provider contract, demo + proxy providers, capability registry
    audio/          Microphone capture (push-to-talk + live level), speech playback
  components/
    ui/             Buttons, sheets, fields, chips, segmented control, states…
    layout/         App shell, bottom tab bar, desktop side rail, demo banner
    brand/          Planet, mini orb, wordmark
    orb/            The Cyrus energy orb
  features/
    today/ track/ reflect/ cyrus/ auth/
supabase/
  migrations/     Schema + Row Level Security + storage policies
  functions/cyrus Edge Function: OpenAI proxy (chat, transcribe, speech)
```

## Data flow

```
UI component ─▶ React Query hook ─▶ Repository (interface)
                                       ├─ SupabaseRepository ─▶ Postgres (RLS: user_id = auth.uid())
                                       └─ DemoRepository     ─▶ in-memory, resets on reload
```

- `DataProvider` picks the repository from the auth state and creates a fresh query cache per user, so cached data can never cross accounts.
- Every write is validated with the zod schemas in `domain/schemas.ts`. The same limits exist as Postgres `CHECK` constraints.
- Habit and task toggles are optimistic (one tap, instant) and roll back on error.
- `useSaveFeedback` never says "saved" in demo mode.

## Security

- **RLS everywhere.** Every user-owned table has select/insert/update/delete policies scoped to `auth.uid()`. `user_id` defaults to `auth.uid()`, so the client never sends ownership.
- **Composite foreign keys** (`habit_logs → habits`, `assistant_messages → assistant_conversations`) make it impossible to attach rows to someone else's records.
- **Storage.** `health-reports` is private, and objects must live under `<user_id>/…`.
- **API keys.** Only the Supabase URL and anon key are in the bundle. The OpenAI key is an Edge Function secret. The function verifies the user's JWT (the anon key alone is rejected), validates and size-limits input, and never forwards upstream error details to the client.

## The assistant

```
TalkButton ─▶ useCyrusConversation ─▶ AssistantProvider ─▶ /functions/v1/cyrus ─▶ OpenAI
                 │  (orchestration)        ├─ demo:  refuses everything (AssistantNotConnectedError)
                 │                         └─ proxy: transcribe · reply · speak
                 ├─ conversationMachine (pure reducer, unit tested)
                 ├─ MicrophoneCapture  → live input level
                 └─ SpeechPlayer       → live output level ─▶ CyrusOrb
```

**States.** `idle → listening → thinking → speaking → idle`. `interrupted` is reachable from listening, thinking or speaking, and `error` from anywhere. The reducer ignores events that are invalid for the current state, so a late reply after an interruption is dropped.

**Push-to-talk.** Hold the button (or Space / Enter) to talk and release to send. A quick tap latches the mic open, and a second tap sends. Pressing while Cyrus thinks or speaks interrupts immediately (barge-in).

**The orb** writes transforms straight to the DOM on each animation frame from a `getLevel()` callback, so React never re-renders per frame. It is compositor-only (transform and opacity on pre-blurred layers) and honours `prefers-reduced-motion`.

### Extending

- **Realtime voice.** Implement `AssistantProvider` with a WebRTC session to a realtime model. The conversation hook and orb only need `getLevel()` and the state events.
- **Assistant actions.** `services/ai/capabilities.ts` declares each capability with the same zod schema the UI uses and an `execute(repo, args)` that runs through the user's RLS-scoped repository. Enabling them means sending the enabled capabilities as OpenAI tools and executing returned tool calls client-side, with confirmation where `confirm: true`.
- **Siri.** The PWA exposes `/cyrus` as a manifest shortcut. An iOS Shortcut ("Open URL" → `https://<app>/cyrus`) can be triggered by "Hey Siri, talk to Cyrus" today. A native App Intents bridge can later target the same provider contract.
- **New domain modules.** Add a module to `features/track/modules/registry.ts`. The domain page picks it up, and sections without a module fall back to shared views.
