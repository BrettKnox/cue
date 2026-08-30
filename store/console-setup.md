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
- **Privacy policy**: `https://brettknox.github.io/cue/privacy.html`
- **Ads**: No, my app does not contain ads
- **App access**: All functionality is available without special access (no login)
- **Content rating questionnaire**: Category Utility/Productivity. No violence, sexuality, profanity, drugs, gambling, hate, or user-generated public content. Expected rating: Everyone.
- **Target audience**: 13 and older (do NOT tick under-13; avoids Families policy)
- **News app**: No
- **COVID-19 tracing/status**: No
- **Data safety** (matches store/listing.md — keep these in sync with the app's actual behavior):
  - Does your app collect or share any of the required user data types? **No**
  - Rationale if reviewed: speech recognition runs on-device (`com.google.android.as`, offline forced; app refuses to start otherwise). Audio is never recorded to file or transmitted. Transcripts stay in on-device SQLite. Summary/Ask sends transcript TEXT over HTTPS to Cue's proxy only on an explicit user tap; it is processed ephemerally to answer the request, not retained, not used by third parties, and the feature can be disabled entirely in Settings. No accounts, no analytics, no ads SDKs.
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
`SYSTEM_ALERT_WINDOW` is declared (overlay); `RECORD_AUDIO` powers on-device recognition; `FOREGROUND_SERVICE` + `RECEIVE_BOOT_COMPLETED` keep live transcription running. No location, no contacts, no camera.
