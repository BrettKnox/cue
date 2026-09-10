# Cue — Play Store listing

**Package** `com.wukoric.cue` · **Track** internal first · **Privacy policy**
https://wukoric.com/apps/cue/privacy

<!-- Give Play the canonical URL, not https://brettknox.github.io/cue/privacy.html. That page
     is now a meta-refresh redirect to this one, kept so old links still land, and a redirect
     is a bad thing to hand a crawler that has to read the policy to approve the app. -->

## Short description (80 char max)

Live transcription and recall. The audio never leaves your phone.

<!-- 66 characters, counted 2026-09-09. Count before changing it; Play rejects 81. -->

## Full description

Cue writes down the conversation you are in, as it happens, and keeps it so you can read
it back later.

It is built for the gap between hearing something and being able to retrieve it — whether
that gap comes from a memory or processing difference, from hearing loss, from ADHD, or
simply from a meeting that ran ninety minutes.

**The audio never leaves your phone.** Cue uses your phone's own offline speech
recogniser, so nothing is uploaded and nothing is recorded to a file. If the offline
recogniser is unavailable, Cue refuses to start rather than quietly sending your
conversation to a server.

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

**Do not fill this form until the OpenRouter retention setting is confirmed. It decides
the answers, and getting it wrong is a false declaration, not a typo.**

Play lets you declare data as *not collected* when it is processed **ephemerally**: sent
off the device, used only to answer the request in real time, and not retained. Cue's
audio never leaves the phone at all, so audio is genuinely not collected on any reading.
Transcript **text** is the one that hangs on the exemption, because stopping a recording
sends that transcript to the summary service through `proxy/worker.js` to OpenRouter.

- Audio: **not collected.** Recognised on device, never recorded to a file, never sent.
  True regardless of what OpenRouter is set to.
- Encryption in transit: yes, HTTPS, for the summary and question requests.
- Data deletion: in-app, Settings, Delete everything.
- Account: none. Analytics: none. Ads: none. In-app purchases: none.

### If the account enforces zero data retention (check openrouter.ai/settings/privacy)

- Data collected: **None.** The transcript is processed ephemerally to return the recap.
- Data shared: **None.**

### If it does not

The default for `provider.data_collection` is `allow`, which OpenRouter's own docs
describe as permitting providers that may store data non-transiently and train on it.
That is retention, so the ephemeral exemption does not apply and the honest answers are:

- Data collected: **Yes.** Personal info, Other, the transcript text.
- Data shared: **Yes**, with the model provider, for app functionality.
- Sensitive: transcripts are conversations and should be treated as such.

Either fix it in the account, or set `provider: {zdr: true}` in `worker.js` (chunk C0d,
and test the failure mode first, no OpenRouter page says what happens when no provider
satisfies the constraint), or declare collection honestly. Not all three, but one.

Re-answer all of this if a crash reporter or analytics SDK is ever added.
