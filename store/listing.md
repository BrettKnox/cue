# Cue — Play Store listing

**Package** `com.wukoric.cue` · **Track** internal first · **Privacy policy**
https://wukoric.com/apps/cue/privacy

<!-- Give Play the canonical URL, not https://brettknox.github.io/cue/privacy.html. That page
     is now a meta-refresh redirect to this one, kept so old links still land, and a redirect
     is a bad thing to hand a crawler that has to read the policy to approve the app. -->

## Short description (80 char max)

Live transcription and recall. Audio stays on your phone by default.

<!-- 68 characters, counted 2026-09-10 with awk against the .txt, not by eye. Count before
     changing it; Play rejects 81. "by default" is load-bearing: the app ships a Settings
     switch that opts in to cloud recognition, so an unconditional claim here would be false
     for anyone who turns it off. -->

## Full description

Cue writes down the conversation you are in, as it happens, and keeps it so you can read
it back later.

It is built for the gap between hearing something and being able to retrieve it — whether
that gap comes from a memory or processing difference, from hearing loss, from ADHD, or
simply from a meeting that ran ninety minutes.

**Audio stays on your phone.** Cue uses your phone's own offline speech recogniser, so
nothing is uploaded and nothing is recorded to a file. If the offline recogniser is
unavailable, Cue refuses to start rather than quietly sending your conversation to a
server. There is one exception and it is yours to make: a phone that cannot transcribe
offline can use cloud recognition instead, by turning off "Keep audio on this device" in
Settings. That switch ships on, so the offline path is what you get unless you change it,
and while it is off the Live screen shows a red Cloud badge.

What it does:

• Live transcript you can read while someone is still talking
• A summary afterwards: what it was about, and what you agreed to
• Ask a question about any past conversation and get an answer from that transcript
• Search everything you have ever recorded
• People you talk to, with your own notes about them
• Large-text mode, high-contrast colours, and full screen-reader labelling

Summaries and questions are the only things that send anything off the device, and they send
text, never audio. When you stop a recording, Cue sends that transcript once to write the
recap. Asking a question about a saved conversation sends that conversation too. Nothing
else is ever sent, and you can turn summaries off completely in Settings, which makes the
app fully offline. There are no accounts, no analytics, and no ads.

You can delete any conversation, or everything at once, at any time.

Note: laws about recording conversations differ by country and state, and some require
everyone's consent. Please follow the rules where you are.

## Category and rating

- Category: Productivity (alternate: Medical / Accessibility if Play offers it)
- Content rating: Everyone (no user-generated public content, no ads, no purchases)
- Target audience: 13+
- Contains ads: No
- In-app purchases: No

## Data safety answers

**ANSWERED 2026-09-10, read off openrouter.ai/settings/privacy in the signed-in account.
The setting is NOT in Cue's favour, so the branch below that applies is "If it does not".**

| Toggle | State | What it means for Cue |
|---|---|---|
| Zero Data Retention, All other models | **OFF** | nothing stops routing to an endpoint that stores the transcript |
| ZDR, Anthropic / OpenAI / Google / SpaceXAI | **OFF** | irrelevant here, the model is DeepSeek |
| Allow **paid** endpoints that train on request data | **OFF** | good, and it is the one that covers Cue |
| Allow **free** endpoints that train on request data | **ON** | does not reach Cue: `worker.js` pins `deepseek/deepseek-v4-flash`, a paid id, so no free endpoint is ever requested |
| Allow free endpoints that publish prompts | OFF | same reason |

So the position today is: **transcripts will not be trained on, and may be retained.**
Training is excluded by the paid-endpoints toggle. Retention is not excluded by anything,
and retention is precisely what the ephemeral-processing exemption requires the absence of.

**Therefore the honest answer today is Data collected: Yes.** To get to No, one of two
things has to change first: turn on Zero Data Retention for "All other models" in the
account, or set `provider: {zdr: true}` in `worker.js` (chunk C0d). Do not file the form
before one of those lands, and do not assume either is free: **check first whether any
`deepseek/deepseek-v4-flash` endpoint is ZDR at all**, because if none is, enabling it
turns every recap into a hard failure. That is the failure mode C0d exists to test, and
the public endpoints API does not expose the data policy, so it has to be read from the
model's providers page while signed in.

Play lets you declare data as *not collected* when it is processed **ephemerally**: sent
off the device, used only to answer the request in real time, and not retained. Transcript
**text** hangs on that exemption, because stopping a recording sends that transcript to the
summary service through `proxy/worker.js` to OpenRouter.

**Audio is the answer that changed on 2026-09-10 and it is the one to get right.** The old
answer here said audio never leaves the phone at all, so it is not collected on any reading.
That is true on default settings and false as an unconditional statement, because
`src/screens/SettingsScreen.tsx` ships a "Keep audio on this device" switch, and
`src/transcribe.ts:119` gates the refusal on it. Turn it off and `begin()` runs with
`requiresOnDeviceRecognition: false` and no `androidRecognitionServicePackage`, which is
Android's default recogniser, which streams audio to Google.

- Audio: **not collected on default settings**, and that is the sentence to give Play.
  Recognised on device, never recorded to a file, never sent, because the app refuses to
  start rather than fall back. A user who turns the switch off is opting in to Google's
  own recogniser, which is a separate processor's collection and not Cue's; Cue still
  records nothing to a file and still sends nothing to Cue's own services. True regardless
  of what OpenRouter is set to, because no audio path touches OpenRouter.
- Encryption in transit: yes, HTTPS, for the summary and question requests.
- Data deletion: in-app, Settings, Delete everything.
- Account: none. Analytics: none. Ads: none. In-app purchases: none.

### If the account enforces zero data retention (it does NOT today, checked 2026-09-10)

- Data collected: **None.** The transcript is processed ephemerally to return the recap.
- Data shared: **None.**

### If it does not: THIS IS THE LIVE BRANCH AS OF 2026-09-10

The account leaves Zero Data Retention off for all models, and `worker.js` sends no
`provider` block, so the request carries no retention constraint of any kind. Training is
separately excluded, because the paid-endpoints training toggle is off and the pinned
model is a paid id. Retention is not excluded by anything, and it is retention the
ephemeral exemption turns on, so the honest answers are:

- Data collected: **Yes.** Personal info, Other, the transcript text.
- Data shared: **Yes**, with the model provider, for app functionality.
- Sensitive: transcripts are conversations and should be treated as such.

Either fix it in the account, or set `provider: {zdr: true}` in `worker.js` (chunk C0d,
and test the failure mode first, no OpenRouter page says what happens when no provider
satisfies the constraint), or declare collection honestly. Not all three, but one.

Re-answer all of this if a crash reporter or analytics SDK is ever added.
