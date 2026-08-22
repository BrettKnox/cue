# Cue

## Why
Live transcription and recall for conversations, built for people who were present but
cannot rely on remembering — memory and processing differences, hearing loss, ADHD, or
just a long meeting. Cue listens, writes down what is said, and afterwards tells you what
the conversation was about, what you agreed to, and who was there. It is also the
marketable portfolio piece: assistive tech is a real need with thin competition on the
accessibility framing.

## The two promises the code has to keep
1. **Audio never leaves the phone.** `src/transcribe.ts` forces the offline recogniser
   (`com.google.android.as`) and, when `onDeviceOnly` is on — the default — **refuses to
   start** rather than silently falling back to Google's cloud recogniser. Android's
   default recogniser uploads audio; asking for offline is not optional decoration. The
   Live screen shows which engine is actually in use.
2. **Transcript text leaves only when the user asks.** Recap and Ask send text to Cue's
   proxy on an explicit action. Nothing is uploaded in the background, and Settings turns
   summaries off entirely. The onboarding, the privacy policy, the site copy and the Play
   data-safety form all have to keep saying exactly this.

## What — module map
Expo SDK 56 / RN 0.85 / React 19, TypeScript, react-navigation bottom tabs with a native
stack per tab (**not** expo-router). Matches the house pattern in `Code/VScode/pawpoint`.

- `src/transcribe.ts` — `useTranscription()`, the whole speech layer. Wraps
  `expo-speech-recognition`. **The auto-restart on `end` is load-bearing**: `continuous`
  is best-effort and both platforms stop on a long silence. `no-speech` errors are
  swallowed (they fire constantly in a quiet room). Also emits input level for the meter.
- `src/db.ts` — expo-sqlite, WAL. Conversations, utterances, people, links, settings. Only
  **finalised** utterances are stored; interim results change under you. Deleting a person
  never deletes a conversation.
- `src/sql.ts` — schema and queries as plain strings, **import-free on purpose** so
  `checks.ts` runs the real SQL against `node:sqlite`. A test that retypes a query only
  proves the copy works.
- `src/searchTerm.ts` — LIKE escaping. Without it a user typing `100%` matches every
  utterance ever recorded. `sql.ts` spells the escape char out; `checks.ts` asserts the two
  never drift apart.
- `src/recap.ts` — the recap shape and its tolerant parser (also import-free).
- `src/settingsShape.ts` (pure: defaults + `merge`) and `src/settings.ts` (the live store).
  **Privacy defaults are the safe ones** and a check asserts that.
- `src/llm.ts` — recap and ask, through the proxy. No provider key is ever in the app.
- `src/theme.ts` — type scale, 8dp spacing, `TAP = 48`, **two accents x two schemes**, each
  with its own `onAccent` role rather than a global white.
- `src/ui.tsx` — the shared `Button`, `Chip`, `Toggle`, `Card`, `Note`, `H1`. Fix sizing
  and colour here, not per screen: one audit found 72 of 89 undersized targets came from a
  single style.
- `src/screens/` — Live, History (search + list), Conversation (detail, Ask, share,
  people), People, Person, Settings, Onboarding.
- `proxy/worker.js` — the Cloudflare Worker holding the OpenRouter key.

## How
```bash
npm install
npm run check       # parser, LIKE escaping, real SQL, people queries, settings
npm run typecheck
npx expo run:android
```
The proxy endpoint is injected by `app.config.js` from `CUE_PROXY_URL` and
`CUE_PROXY_TOKEN`. Nothing secret is committed, and **the OpenRouter key must never appear
in the app or its environment** — it lives only as a Worker secret. With no proxy set the
app still transcribes, stores and searches; it just says summaries are unavailable.

## Verifying
`python tools/audit.py` builds the web export and drives it across **3 widths x 2 schemes
x 2 accents x every screen — 54 states**, asserting 48dp targets, 4.5:1 contrast against
the real backdrop, a 12px text floor, accessible names, and no horizontal overflow. It is
proven to fail: breaking the button height and the muted colour produced 558 findings, and
it caught a real regression when the tab bar's padding ate into its own touch target.

Web is a **test lane only**. TalkBack, real OS font scaling, the native recogniser and the
airplane-mode proof all need the device.

Two build deps exist purely because this project was hand-scaffolded rather than made with
`create-expo-app`: `babel-preset-expo` (without it metro dies with a misleading
`transformFile of undefined`) and `metro.config.js` adding `wasm` to `assetExts`
(expo-sqlite's web build is WebAssembly). Do not "tidy" either away.

## Hard rules
- **Speech recognition needs a dev build, not Expo Go** — native module with a config
  plugin.
- **Default to open models.** DeepSeek or a local Ollama, never a hardcoded proprietary
  provider. The backend stays swappable behind the proxy.
- **Never weaken a check to make it pass.** Every check here has been shown failing on
  broken logic at least once; that is what makes it evidence.
- **Accessibility is the product, not a checkbox.** Re-run the audit after any UI change.
  Benchmark: the core flow should be completable with the screen off.
- Transcripts stay on the device unless the user asks for a summary.
