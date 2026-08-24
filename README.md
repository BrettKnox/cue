# Cue

**Live transcription and recall for conversations. The audio never leaves your phone.**

Cue writes down the conversation you are in, as it happens, and keeps it so you can read it
back later. It is built for the gap between hearing something and being able to retrieve it —
whether that gap comes from a memory or processing difference, from hearing loss, from ADHD,
or simply from a meeting that ran ninety minutes.

Expo SDK 56 · React Native 0.85 · React 19 · TypeScript · Android and iOS from one codebase.

---

## The constraint that shaped it

Refusing to send audio anywhere is easy to claim and easy to get wrong. **Android's default
speech recogniser streams audio to Google unless you explicitly ask for the offline engine.**

So Cue:

- requests the on-device recogniser (`com.google.android.as`) explicitly,
- **shows on screen which engine it actually got**, and
- **refuses to start recording** rather than silently falling back when the offline language
  model is missing.

A doctor's appointment should not reach a server because a language pack was not installed.
That refusal is the feature; the transcription is just the part you can see.

The only thing that ever leaves the device is transcript **text**, and only when you tap the
button asking for a summary or an answer. That request goes through a small Cloudflare Worker
that holds the API key, so **no provider credential ships inside the app** — anything in a JS
bundle is extractable from the APK. Turn summaries off in Settings and Cue makes no network
request at all.

## What it does

- **Live transcript** you can read while someone is still talking
- **Summary afterwards** — what it was about, and what you agreed to
- **Ask a question** about any past conversation, answered only from that transcript
- **Search** every word ever recorded
- **People** you talk to, with your own notes, linked to the conversations they appeared in
- Large-text mode, two audited colour schemes, and full screen-reader labelling

## Accessibility is the product, not a checklist

`tools/audit.py` builds the app, serves it, and drives it across **54 screen states** —
3 widths × 2 colour schemes × 2 accent palettes × every screen — asserting:

| Check | Threshold |
|---|---|
| Touch targets | ≥ 48 × 48 dp |
| Text contrast | ≥ 4.5:1 against the real composited backdrop |
| Large text | ≥ 3.0:1 |
| Font size | ≥ 12 px |
| Accessible names | every interactive element |
| Horizontal overflow | none, down to 360 dp |

Current result: **54 states, 0 failures.**

The audit is proven to fail, which is the only thing that makes a green result mean anything.
Deliberately shrinking a button and lightening the muted colour produced 558 findings. It also
caught a real regression: adding breathing room to the tab bar pushed its padding into its own
touch target and dropped it to 46 dp. That was invisible by eye.

## Tests that can't be gamed

The SQL lives in `src/sql.ts` as import-free strings so `src/checks.ts` can run the **real**
schema and the **real** queries against `node:sqlite` — a test that retypes a query only proves
the copy works. Every check here has been watched failing on broken logic at least once.

One example of what that catches: search wraps the term in `%…%`, so without escaping, anyone
searching for `100%` would match **every utterance ever recorded**. The escaping is enforced by
an `ESCAPE` clause and asserted against a real database.

```bash
npm run check       # parser, LIKE escaping, real SQL, people queries, settings
npm run typecheck
python tools/audit.py
```

## Running it

```bash
npm install
npx expo run:android      # a dev build — speech recognition is a native module, not Expo Go
```

Summaries need a proxy endpoint, supplied by environment at build time and never committed:

```bash
CUE_PROXY_URL=https://your-worker.workers.dev CUE_PROXY_TOKEN=… npx expo start --dev-client
```

Deploy the proxy yourself from `proxy/` — it holds the provider key as a Worker secret:

```bash
npx wrangler secret put OPENROUTER_API_KEY --config proxy/wrangler.jsonc
npx wrangler deploy --config proxy/wrangler.jsonc
```

Without a proxy configured the app still transcribes, stores and searches; it just says
summaries are unavailable.

## Recording other people

Laws about recording conversations differ by country and by state, and some require the consent
of everyone present. Cue does not check this for you.

## Privacy

[Privacy policy](https://brettknox.github.io/cue/privacy.html) · No accounts, no analytics, no
ads, no crash-reporting SDK, nothing collected.

---

Built by [Brett Knox](https://wukoric.com).
