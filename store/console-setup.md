# Cue — Play Console setup (paste-ready)

One-time manual steps; the API cannot create apps or answer these questionnaires.

## 1. Create app (play.google.com/console → Create app)
- App name: **Cue**
- Default language: **English (United States) – en-US**
- App or game: **App**
- Free or paid: **Free**
- Declarations: check both boxes (Developer Program Policies, US export laws)

## 2. Grant the service account access (once per app)
Users and permissions → the invite for **ember-release@project-a2aa2b4d-9930-43b7-8e4.iam.gserviceaccount.com** → ensure it has this app (or account-wide) with **Release to testing tracks + Manage store presence** (Admin also fine). Without this, staging from here 404s.

## 3. App content (Policy → App content) — answers
- **Privacy policy**: `https://wukoric.com/apps/cue/privacy`. **Not** `https://brettknox.github.io/cue/privacy.html`, which is now a meta-refresh redirect stub kept so old links land. A redirect is a bad thing to hand a reviewer or a crawler that has to read the policy to approve the app, and `store/listing.md` says so at the top.
- **Ads**: No, my app does not contain ads
- **App access**: All functionality is available without special access (no login)
- **Content rating questionnaire**: Category Utility/Productivity. No violence, sexuality, profanity, drugs, gambling, hate, or user-generated public content. Expected rating: Everyone.
- **Target audience**: 13 and older (do NOT tick under-13; avoids Families policy)
- **News app**: No
- **COVID-19 tracing/status**: No
- **Data safety** (matches store/listing.md — keep these in sync with the app's actual behavior):
  - Does your app collect or share any of the required user data types? **DO NOT ANSWER THIS FROM THIS FILE.** `store/listing.md` carries the answer and the condition that decides it: the OpenRouter retention setting has to be confirmed at openrouter.ai/settings/privacy first, because `provider.data_collection` defaults to `allow` and `proxy/worker.js` sends no `provider` block. With zero data retention enforced the answer is **No**, nothing collected, nothing shared. Without it the honest answer is **Yes**, the transcript text, shared with the model provider. This line used to read a flat "No" with a "not retained" rationale, which is a false declaration rather than a typo if the account is on the default.
  - Rationale if reviewed: speech recognition runs on-device (`com.google.android.as`), the offline recogniser is forced and recording refuses to start rather than fall back, **on default settings**. A user can allow cloud recognition by turning off "Keep audio on this device" in Settings, in which case Android's own recogniser handles the audio; Cue still records no audio to a file and still sends no audio to Cue's services. Transcripts stay in on-device SQLite. Summary/Ask sends transcript TEXT over HTTPS to Cue's proxy; **stopping a recording sends one automatically while summaries are on, and summaries ship on**, so do not describe this as happening only on an explicit tap. The feature can be turned off entirely in Settings. No accounts, no analytics, no ads SDKs.
  - Encryption in transit: yes (HTTPS). Deletion: in-app, Settings → Delete everything.
- **Government app**: No
- **Financial features**: None

## 4. Store settings
- App category: **Productivity**
- Tags: accessibility, transcription (if offered)
- Contact email: bman00gthatsme@gmail.com

## 5. Store listing
Staged automatically from `store/play-listing/` (title, short + full description, icon, feature graphic, 4 screenshots) — no manual work unless the API push fails, in which case paste from those files.

## 6. Recommended at first upload
- **Enroll in Play App Signing** (default flow when you upload the first AAB): Google holds the app signing key, your `cue-upload.jks` becomes only the upload key and is resettable if lost. Accept the default.

## Permissions note (if review asks)
Cue's own manifest (`android/app/src/main/AndroidManifest.xml`) declares exactly one permission beyond the framework defaults: `SYSTEM_ALERT_WINDOW`, for the overlay. `RECORD_AUDIO` powers speech recognition. The merged manifest also carries `FOREGROUND_SERVICE`, `RECEIVE_BOOT_COMPLETED`, `WAKE_LOCK`, `VIBRATE`, `INTERNET`, `ACCESS_NETWORK_STATE` and the two `EXTERNAL_STORAGE` permissions, and **all of those arrive from dependencies, not from Cue**. Verified 2026-09-10 against `android/app/build/intermediates/merged_manifest/`. **The app starts no foreground service and registers no boot receiver**: `grep` for `startForeground` and any `BootReceiver` across `src/` and `android/app/src/` returns nothing, and the only `<service>` in the merged manifest is `RNWidgetCollectionService`. This note previously told a reviewer that FOREGROUND_SERVICE and RECEIVE_BOOT_COMPLETED keep live transcription running. They do not, and saying so to a reviewer invents a capability the app does not have. No location, no contacts, no camera.
