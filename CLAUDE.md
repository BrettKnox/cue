# Cue

## Why
Live transcription and recall for conversations, built for people who were present but
cannot rely on remembering — memory and processing differences, hearing loss, ADHD, or
just a long meeting. Cue listens, writes down what is said, and afterwards tells you what
the conversation was about, what you agreed to, and who was there. It is also the
marketable portfolio piece: assistive tech is a real need with thin competition on the
accessibility framing.

## The two promises the code has to keep
1. **Audio stays on the phone by default, and the default is the promise.** Say it that way
   in anything public: the unconditional version was in six public places until 2026-09-10
   and it is false for a user who turns the switch off. `src/transcribe.ts` forces the
   offline recogniser
   (`com.google.android.as`) and, when `onDeviceOnly` is on — the default — **refuses to
   start** rather than silently falling back to Google's cloud recogniser. Android's
   default recogniser uploads audio; asking for offline is not optional decoration. The
   Live screen shows which engine is actually in use.
2. **Transcript text leaves at two moments and never otherwise.** Stopping a recording
   sends that transcript once so the recap can be written (`LiveScreen.end` calls
   `runRecap` **unconditionally** while `summaries` is on), and asking a question about a
   saved conversation sends it again. Nothing is uploaded in the background, and Settings
   turns summaries off entirely. The onboarding, the privacy policy, the site copy and the
   Play data-safety form all have to keep saying exactly this. **Corrected 2026-09-09**:
   this section, `llm.ts`, `settingsShape.ts`, the Settings toggle, the onboarding slide
   and the live privacy page all previously said the send happened only on an explicit
   request, which is not what `end()` does. Read the call site, not the comment.

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
`CUE_PROXY_TOKEN`, which live in a **gitignored `.env`** that Expo loads at bundle time.
Nothing secret is committed, and **the OpenRouter key must never appear in the app or its
environment** — it lives only as a Worker secret. With no proxy set the app still
transcribes, stores and searches; it just says summaries are unavailable.

**Deployed proxy:** `https://cue-llm-proxy.wukoric.workers.dev` (live 2026-08-22). Verified:
no token/wrong token 401, wrong path 404, bad body 400, GET 405, and a real recap round-trips
in ~5.6 s for ~$0.00013 on `deepseek/deepseek-v4-flash`.

Deploying it again, or from another machine, hits three things worth knowing:
`wrangler login` OAuth failed with `request_forbidden` on this account (it asks for a very
large scope set), so use an **account API token** in `CLOUDFLARE_API_TOKEN` instead — the
"Edit Cloudflare Workers" template is enough. Such a token returns 401 from
`/user/tokens/verify` (that endpoint is user-tokens only) while working perfectly, so test it
against `/accounts/{id}/workers/scripts` instead. And the account needs a registered
`workers.dev` subdomain before the first deploy; ours is `wukoric`.

**Config changes need a REBUILD, not a dev-server restart.** Cue has no `expo-updates`, so
`Constants.expoConfig` is read from `assets/app.config` **embedded in the APK at build time**,
not from metro's manifest. Editing `app.config.js` or `.env` and restarting `expo start` looks
like it should work and silently does not — the app keeps the values it was built with. This
cost a debugging round: the proxy was live and the manifest served the right values while the
app still reported "No summary service is set up for this build". Verify with
`unzip -p android/app/build/outputs/apk/debug/app-debug.apk assets/app.config`.

## Verifying
`python tools/audit.py` builds the web export and drives it across **3 widths x 2 schemes
x 2 accents x every screen — 54 states**, asserting 48dp targets, 4.5:1 contrast against
the real backdrop, a 12px text floor, accessible names, and no horizontal overflow. It is
proven to fail: with `TAP` dropped to 32 and both muted greys lightened, the same 54 states
produce **528 findings** (reproduced 2026-09-09; the older "558" cited a break whose
parameters were never written down, so nobody could re-run it). It also caught a real
regression when the tab bar's padding ate into its own touch target. Every run now writes
`docs/audit-result.json`, so the number in the README is checkable instead of remembered.

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
- Transcripts stay on the device unless summaries are on, and summaries ship ON, so
  stopping a recording sends that transcript. The old version of this line said "unless the
  user asks for a summary", which is the same false claim this file was corrected for on
  2026-09-09 and which survived here because nobody re-read the rules section.
