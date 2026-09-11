# Cue: Play Store listing

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

It is built for the gap between hearing something and being able to retrieve it, whether
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

**That was the position for about an hour. `worker.js` now sends `provider: {zdr: true}`,
so the request carries its own retention constraint and the account default stops deciding.**

The feared failure mode does not exist for this model. OpenRouter publishes an authoritative,
auto-updated list at <https://openrouter.ai/api/v1/endpoints/zdr>, and on 2026-09-11
`deepseek/deepseek-v4-flash` had **ten** ZDR endpoints: DeepInfra, SiliconFlow, Novita,
Parasail, DigitalOcean, Venice, NextBit, Phala, Mancer 2 and Azure. DigitalOcean is ZDR and
is also the cheapest endpoint on the board, so this costs nothing in price or availability.
`node proxy/check-zdr.mjs` re-checks it in thirty seconds and fails loudly if that ever stops
being true.

**One caveat to carry into the form rather than discover later.** OpenRouter's ZDR page says
plainly that it treats in-memory prompt caching as not retaining data, so an endpoint with
implicit caching can still be routed to under a ZDR policy. That is consistent with what Play
means by ephemeral processing (used to answer the request, not stored), but it is a stance
rather than an absence, so it is written here rather than left to be found by someone reading
the docs after the form is filed. OpenRouter also states its own policy: prompts are not
retained unless prompt logging is opted into, and Cue does not opt in.

Note what the providers page badge does NOT tell you. "Private" versus "Logs" there is the
**training** policy, and OpenRouter's own docs say plainly that it "does not have routing
rules that change based on data retention policies of providers". Training and retention are
two different axes, and the ZDR list is the only thing that answers the retention one.

**THE FORM STILL CANNOT SAY "not collected" UNTIL THE WORKER IS DEPLOYED.** Play is asking
about the app as shipped, and the app talks to whatever is running at the Worker URL, not to
what is in this repo. So: `npx wrangler deploy --config proxy/wrangler.jsonc`, confirm one
recap still works, and then the branch below flips from the second to the first.

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

### If zero data retention is enforced: TRUE ONCE THE WORKER IS DEPLOYED, via provider.zdr

- Data collected: **None.** The transcript is processed ephemerally to return the recap.
- Data shared: **None.**

### If it is not: the live branch until `wrangler deploy` runs

The account still leaves Zero Data Retention off for all models. Until the Worker carrying
`provider: {zdr: true}` is deployed, the request in flight carries no retention constraint,
so this is what a truthful form says:

- Data collected: **Yes.** Personal info, Other, the transcript text.
- Data shared: **Yes**, with the model provider, for app functionality.
- Sensitive: transcripts are conversations and should be treated as such.

Either fix it in the account, or set `provider: {zdr: true}` in `worker.js` (chunk C0d,
and test the failure mode first, no OpenRouter page says what happens when no provider
satisfies the constraint), or declare collection honestly. Not all three, but one.

Re-answer all of this if a crash reporter or analytics SDK is ever added.
