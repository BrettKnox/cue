# Cue — resume brief

Written 2026-08-21 by the session that built this. Read `CLAUDE.md` first; it is the
authority on the module map and hard rules. This file only covers **where the work stopped
and what to do next**, and should be deleted once the app is confirmed working on a phone.

## The one thing that matters

**The app is BUILT, INSTALLED and RUNNING on the phone** (`com.wukoric.cue`, Galaxy S24 Ultra,
verified by screenshot 2026-08-21 18:51 — dark theme, correct layout, tab bar, Listen button).
Tapping Listen correctly raised Android's "Allow Cue to record audio?" dialog, which proves the
native speech module is wired and `requestPermissionsAsync()` fires.

The earlier session STOPPED at that dialog on purpose: granting microphone permission is the
user's decision, not something to click through while he is asleep. **Do not tap Allow for him.**
The remaining unknown is whether spoken words actually become text, and only he can test that.

## State at handoff

Done and verified: the app builds for web with zero console errors, renders in light and
dark with both accents, all four accent x scheme permutations pass 48dp + 4.5:1, transcript
search works with LIKE escaping (checked against real SQLite via `node:sqlite`), and
`npm run check` + `npm run typecheck` are green. Icon, adaptive icon and splash exist.
Five commits, working tree clean.

Not done: **transcription on device**, people/relationship notes, onboarding, EAS config,
and the LLM key proxy (the key currently ships inside the bundle — dogfood only).

## The Android build (done — kept for the next machine or a clean rebuild)

The debug APK built and installed (54 MB, in `android/app/build/outputs/apk/debug/`). Two
failures were hit on the way; do not re-hit them:

1. **`ANDROID_HOME` is not set on this machine.** Gradle fails with "SDK location not found".
   Already fixed by `android/local.properties` containing
   `sdk.dir=C\:/Users/bman0/AppData/Local/Android/Sdk`. That file is gitignored with the rest
   of `android/`, so if you re-run `expo prebuild --clean` you must write it again.
2. **Pairing leaves two adb entries** — an mDNS name and the IP. With both present,
   `expo run:android` blocks forever on an interactive "select a device" prompt that a
   background process can never answer, producing zero output and looking like a hang.
   Run `adb devices`, `adb disconnect <the mDNS one>`, leave exactly one. Do **not** pass
   `--device <ip:port>`; expo matches names, not serials, and errors "Could not find device".

## Do this, in order

1. Give it a working LLM key so summaries do something. The user's `OPENROUTER_API_KEY` is
   already in their user environment and `deepseek/deepseek-v4-flash` is confirmed live on
   OpenRouter. Metro reads `app.config.js` at bundle time, so the key must be in the
   environment when the dev server starts:
   `CUE_LLM_BASE_URL=https://openrouter.ai/api/v1 CUE_LLM_MODEL=deepseek/deepseek-v4-flash CUE_LLM_API_KEY=$OPENROUTER_API_KEY npx expo start --dev-client`
   Never print the key.
2. Build the two remaining software features, in this order: **people/relationship notes**
   (a `people` table, notes attached to a conversation) and then **onboarding** (one screen
   saying what Cue records and that transcripts stay on the device). Re-run the four-way
   accent x scheme audit after any UI change.
3. Do not re-verify the device build unless something changed — it is already proven. If you
   do need the phone and the adb pairing is dead (it does not survive a reboot or long sleep),
   ask the user for a fresh pairing code and both ports from Developer options > Wireless
   debugging. You cannot recover it without them.
4. **Hand back honestly.** Only the user can grant the mic permission and speak into the phone.
   Tell him plainly: tap Listen, choose "While using the app", say a few sentences, tap Stop.

## Rules that are easy to get wrong

- Do not "tidy away" `babel-preset-expo` or the `wasm` line in `metro.config.js`. Both exist
  because this project was hand-scaffolded; removing either breaks the build.
- Do not weaken a check to make it pass. The search check is meant to fail if LIKE escaping
  breaks — that was demonstrated deliberately.
- Default to open models. Never wire in a proprietary provider as the default backend.
- Accessibility is the product. Re-run the four-way audit after any palette or layout change;
  the script pattern is in the scratchpad and described in CLAUDE.md.
