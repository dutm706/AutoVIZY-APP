# AutoSocial AI — Architecture

## Runtime

- **Web/UI/API:** Next.js 15.2.x App Router + React 19 + TypeScript
- **Web hosting:** Firebase App Hosting → Cloud Run + Cloud CDN
- **Authentication:** Firebase Authentication
- **Database:** Cloud Firestore
- **Media:** Firebase/Google Cloud Storage
- **Scheduled publishing:** Cloud Functions 2nd gen + Cloud Scheduler
- **Secrets:** Cloud Secret Manager
- **External APIs:** Meta Graph API, OpenAI, Gemini, Anthropic

## Why the code is split

The browser owns UI state only. All privileged calls stay on server routes/functions:

1. Browser authenticates with Firebase Auth.
2. Browser sends the Firebase ID token to Next.js Route Handlers.
3. Route Handlers verify the token with Firebase Admin SDK.
4. AI API keys and Facebook Page tokens never go to the browser.
5. Scheduled jobs do not run inside a web request; Cloud Scheduler invokes a dedicated worker.

## Data model

`users/{uid}`
- workspace profile

`users/{uid}/settings/main`
- brand settings
- default AI providers
- timezone

`users/{uid}/pages/{pageId}`
- public page metadata

`users/{uid}/pageSecrets/{pageId}`
- encrypted Facebook Page Access Token
- server-only; never exposed to the client rules

`users/{uid}/posts/{postId}`
- draft/scheduled/published/manual queue records
- target type and target id
- selected AI providers
- media reference
- publish result / retry state

`users/{uid}/media/{mediaId}`
- Storage object metadata
- AI generation provenance

`oauthStates/{state}`
- short-lived OAuth state used only by the server callback

## Publish lifecycle

`draft → scheduled → processing → published`

For Group/Profile targets:

`draft → manual_ready`

For transient errors:

`processing → scheduled` with backoff, up to 5 attempts → `failed`

The worker locks a post in a Firestore transaction before publishing so multiple scheduler instances do not normally publish the same job concurrently.

There remains a classic external-side-effect edge case: if Meta accepts a post but the worker crashes before persisting `published`, a retry can produce a duplicate. Production v3 should add stronger idempotency/audit reconciliation where the destination API supports it.

## Scaling strategy

### Current MVP

- one scheduled function every minute
- up to 25 due jobs per invocation
- max 3 worker instances
- retry with 5-minute backoff

### Higher volume

For hundreds/thousands of jobs per minute, move from collection polling to Cloud Tasks/Workflows or a dedicated queue. Keep App Hosting responsible for web/API traffic and keep long-running background work outside the web container.

## Security

- AI secrets are App Hosting/Secret Manager values.
- Facebook Page tokens are encrypted with AES-256-GCM before Firestore storage.
- Firestore rules are scoped by Firebase Auth UID.
- Storage rules are scoped by UID path.
- OAuth state is HTTP-only cookie + server-side state document.
- Do not commit `.env.local`, service-account JSON, or raw Page Access Tokens.

## Why not PHP/MySQL here?

PHP/MySQL is still valid on cPanel, but Firebase App Hosting has first-class framework support for Next.js and Angular. App Hosting builds modern framework apps, serves them on Cloud Run and caches via Cloud CDN. Next.js also gives this project server-side Route Handlers without introducing a separate PHP backend.
