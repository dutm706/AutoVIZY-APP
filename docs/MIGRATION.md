# PHP MVP → Firebase/Next.js migration map

| PHP MVP | Firebase/Next.js replacement | Ghi chú |
|---|---|---|
| `index.php` | `app/dashboard/*` + `components/AppShell.tsx` | UI tách thành route/page component |
| `api/auth.php` | Firebase Authentication | Email/Password + Google |
| `api/common.php` | `lib/auth.ts`, `lib/http.ts`, Firebase Admin | Verify ID token + server helpers |
| `api/ai.php` | `app/api/ai/content`, `app/api/ai/image`, `lib/ai.ts` | Provider tách độc lập |
| `api/posts.php` | `app/api/posts`, Firestore `users/{uid}/posts` | CRUD + scheduler state |
| `api/settings.php` | `app/api/settings`, Firestore `settings/main` | Workspace settings |
| `api/facebook.php` | `lib/facebook.ts`, `app/api/facebook/pages/[id]` | Page publish + connection |
| `oauth.php` | `app/api/facebook/oauth/start`, `callback` | OAuth state trong Firestore + HTTP-only cookie |
| `cron.php` | `functions/src/index.ts` | Cloud Scheduler + Functions v2 |
| `data/pages.json` | Firestore `users/{uid}/pages` | Multi-user, scalable |
| `data/posts.json` | Firestore `users/{uid}/posts` | Queryable + indexed |
| `data/settings.json` | Firestore `users/{uid}/settings/main` | Per-workspace |
| `storage/uploads/` | Firebase Storage | UID-scoped objects |
| `storage/generated/` | Firebase Storage | AI-generated media |
| session password | Firebase Auth ID token | Không còn password admin hard-code |
| raw Page token | encrypted `pageSecrets` document | AES-256-GCM server-side |

## Functional parity

### Kept

- Dashboard statistics and recent posts
- Composer with Page / Group / Profile target modes
- Separate content AI provider and image AI provider
- OpenAI / Gemini / Claude content generation
- OpenAI / Gemini image generation
- Claude image-prompt generation
- Scheduling and retry handling
- Facebook Page OAuth and Page token storage
- Page publishing through Graph API
- Manual queue for Profile / Group
- Media library
- Workspace brand context, tone, hashtag and provider defaults

### Improved

- Multi-user authentication instead of one shared admin password
- Firestore instead of JSON files
- Storage instead of local PHP filesystem
- Secrets in Secret Manager instead of `config.php`
- Server-side API routes instead of public PHP endpoints
- Encrypted Page access tokens
- Cloud Scheduler / Functions worker instead of cPanel cron
- Retry/backoff and transaction locking for scheduled jobs
- Region-aware Firebase deployment
- API-first architecture that can later serve a mobile client

### Deliberately not carried over

- Browser automation, Facebook cookies or private/internal endpoints for Groups/Profile
- Client-side exposure of AI keys or Page access tokens
- cPanel-specific assumptions

## Recommended next implementation layer

For the next major version, add:

1. Cloud Tasks per post for higher throughput and less polling.
2. Approval states (`draft → review → approved → scheduled → published`).
3. Team roles and workspace members.
4. Video/Reels upload pipeline.
5. Analytics/Insights and post history.
6. Batch AI generation and content calendar generation.
7. Webhooks to reconcile Page changes and publishing results.
