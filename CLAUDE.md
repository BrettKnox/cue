# Cue

## Why
Live transcription and recall for conversations, built for people who were present but
cannot rely on remembering — memory and processing differences, hearing loss, ADHD, or
just a long meeting. Cue listens, writes down what is said, and afterwards tells you what
the conversation was about and what you agreed to. It is also the marketable/portfolio
piece: assistive tech is a real need with thin competition on the accessibility framing.

## What — module map
Expo SDK 56 / RN 0.85 / React 19, TypeScript, react-navigation bottom tabs (no expo-router).
Matches the house pattern in `Code/VScode/pawpoint`.

- `src/transcribe.ts` — `useTranscription()`, the whole speech layer. Wraps
  `expo-speech-recognition` (Android `SpeechRecognizer` / iOS `Speech` / Web Speech API):
  **no model download, no server, no per-minute cost.** `continuous: true` is best-effort on
  both platforms, so the hook **restarts itself on `end` while the user still wants to
  record** — that auto-restart is the load-bearing detail, don't remove it. `no-speech`
  errors are swallowed (they fire constantly in a quiet room).
- `src/db.ts` — expo-sqlite, WAL. `conversations` + `utterances`. Only **finalised**
  utterances are stored; interim results change under you. `removeConversation`/`wipe`
  exist because the user must be able to delete what was recorded.
- `src/llm.ts` — one call, OpenAI-compatible, DeepSeek by default. Returns
  `{title, summary, commitments}`. `parseRecap` tolerates providers that ignore
  `response_format` and wrap the JSON in prose.
- `src/theme.ts` — the type scale, 8dp spacing, `TAP = 48`, and **separate light/dark
  palettes** with a real `onAccent` per mode. Components never write a raw fontSize or hex.
- `src/screens/LiveScreen.tsx` — the loop. `src/screens/HistoryScreen.tsx` — past
  conversations + delete.

## How
```bash
npm install
npm run typecheck
npx expo start          # dev client or Expo Go
```
LLM config is injected by `app.config.js` from the environment; nothing is committed:
`CUE_LLM_API_KEY`, `CUE_LLM_BASE_URL` (default `https://api.deepseek.com/v1`),
`CUE_LLM_MODEL` (default `deepseek-v4-flash`). With no key the app still transcribes and
stores; it just says summaries are unavailable.

## Hard rules
- **Speech recognition needs a dev build, not Expo Go** — it is a native module with a
  config plugin. `npx expo run:android` or an EAS dev build.
- **Default to open models.** DeepSeek or a local Ollama (`http://<host>:11434/v1`), never
  a hardcoded proprietary provider. The backend must stay one env var away from swapping.
- **The key currently ships inside the bundle.** Acceptable for dogfooding and internal
  track only. Put a proxy in front before any public release — see the `ponytail:` note in
  `app.config.js`.
- **Accessibility is the product, not a checkbox.** 48dp targets, 12sp text floor, both
  palettes audited, every interactive element named. Benchmark: the core flow should be
  completable with the screen off.
- Transcripts stay on the device. Only the text sent for a summary leaves, and only when
  the user stops a recording.
