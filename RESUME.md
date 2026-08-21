# Cue — resume brief

Written 2026-08-21 by the session that built this. Read `CLAUDE.md` first; it is the
authority on the module map and hard rules. This file only covers **where the work stopped
and what to do next**, and should be deleted once the app is confirmed working on a phone.

## The one thing that matters

Cue has never run on a real phone. Everything below the transcription layer is verified in
the browser test lane; **the native speech recogniser has never been exercised.** Until it
is, the core feature is unproven. Do that first.

## State at handoff

Done and verified: the app builds for web with zero console errors, renders in light and
dark with both accents, all four accent x scheme permutations pass 48dp + 4.5:1, transcript
search works with LIKE escaping (checked against real SQLite via `node:sqlite`), and
`npm run check` + `npm run typecheck` are green. Icon, adaptive icon and splash exist.
Five commits, working tree clean.

Not done: **transcription on device**, people/relationship notes, onboarding, EAS config,
and the LLM key proxy (the key currently ships inside the bundle — dogfood only).

## Where the Android build stopped

`npx expo run:android` was mid-Gradle-build when the session's weekly token limit ran out.
Prebuild had already succeeded and `android/` exists. Two failures were hit and fixed, so do
not re-hit them:

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

1. `adb devices` — the phone is a Galaxy S24 Ultra (`SM_S928U`) on wireless debugging at
   `10.0.0.238`. **The pairing will very likely be dead** (it does not survive a phone reboot
   or a long sleep). If so, stop and ask the user for a fresh pairing code and both ports from
   Developer options > Wireless debugging; you cannot recover this without them.
2. Build and install: from `C:\Users\bman0\Code\Cue`, run `npx expo run:android`. Expect
   several minutes. Output is buffered, so poll `android/app/build/intermediates` and the java
   process CPU for progress rather than the log.
3. Give it a working LLM key so summaries do something. The user's `OPENROUTER_API_KEY` is
   already in their user environment and `deepseek/deepseek-v4-flash` is confirmed live on
   OpenRouter. Metro reads `app.config.js` at bundle time, so the key must be in the
   environment when the dev server starts:
   `CUE_LLM_BASE_URL=https://openrouter.ai/api/v1 CUE_LLM_MODEL=deepseek/deepseek-v4-flash CUE_LLM_API_KEY=$OPENROUTER_API_KEY npx expo start --dev-client`
   Never print the key.
4. Verify what you can without the user: launch the app, `adb exec-out screencap -p > shot.png`
   and look at it, tap Listen with `adb shell input tap`, accept the microphone permission,
   and watch `adb logcat` for the recogniser starting. Confirm no crash.
5. **Stop there and hand back.** Only the user can speak into the phone, so only they can
   confirm words actually appear. Tell them plainly what you verified and what needs their
   voice.

## Rules that are easy to get wrong

- Do not "tidy away" `babel-preset-expo` or the `wasm` line in `metro.config.js`. Both exist
  because this project was hand-scaffolded; removing either breaks the build.
- Do not weaken a check to make it pass. The search check is meant to fail if LIKE escaping
  breaks — that was demonstrated deliberately.
- Default to open models. Never wire in a proprietary provider as the default backend.
- Accessibility is the product. Re-run the four-way audit after any palette or layout change;
  the script pattern is in the scratchpad and described in CLAUDE.md.
