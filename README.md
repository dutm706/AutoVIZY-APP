# AutoSocial AI — Firebase/Next.js Edition

Bản chuyển đổi production-oriented từ MVP PHP sang kiến trúc phù hợp Firebase App Hosting.

## Stack

- Next.js 15.2.9 App Router + React 19.1 + TypeScript
- Firebase App Hosting cho web full-stack
- Firebase Authentication (Email/Password + Google)
- Cloud Firestore cho workspace, page, post, media metadata
- Cloud Storage cho ảnh upload/ảnh AI
- Cloud Secret Manager cho API keys và token encryption key
- Cloud Functions v2 + Cloud Scheduler cho worker lịch đăng mỗi phút
- Meta Graph API cho Facebook Page publishing
- OpenAI Responses API cho content, OpenAI Images cho ảnh
- Gemini GenerateContent cho content, Gemini Interactions Image cho ảnh
- Anthropic Messages API cho content và tạo image prompt

## Vì sao không dùng PHP/MySQL cho Firebase App Hosting?

Firebase App Hosting tối ưu cho web framework hiện đại như Next.js và Angular. PHP không phải framework được App Hosting hỗ trợ tích hợp. Next.js chạy trực tiếp trên Cloud Run phía sau App Hosting, phù hợp với SSR/CSR/API routes và AI workload.

## Cấu trúc

- `app/` — giao diện và Route Handlers
- `components/` — AppShell/UI logic
- `lib/` — Firebase Admin/client, AI adapters, Facebook API, encryption
- `functions/` — worker scheduled publishing
- `firestore.rules` — quyền dữ liệu
- `storage.rules` — quyền media
- `apphosting.yaml` — runtime + secrets

## Cài local

Yêu cầu Node.js 22+.

**Lưu ý về `package-lock.json`:** môi trường tạo source hiện không truy cập được npm registry, nên file lock trong gói là snapshot khai báo dependency, chưa phải lockfile đầy đủ. Trước khi deploy, hãy chạy `npm install` một lần ở máy có Internet để npm materialize đầy đủ dependency graph và cập nhật `package-lock.json`. Firebase App Hosting yêu cầu lock file để nhận diện/triển khai Node framework.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Để chạy Firebase Admin SDK local, dùng Application Default Credentials:

```bash
firebase login
firebase use YOUR_PROJECT_ID
gcloud auth application-default login
```

Hoặc đặt credential service account theo môi trường local riêng; không commit JSON service-account vào Git.

## Firebase setup

1. Tạo Firebase project và bật Blaze.
2. Tạo Web App trong Firebase và copy cấu hình Web SDK vào 6 biến `NEXT_PUBLIC_FIREBASE_*`.
3. Bật Authentication → Email/Password và Google.
4. Tạo Cloud Firestore Database.
5. Tạo Cloud Storage bucket.
6. Deploy rules/indexes.

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage
```

## Secrets

App Hosting hỗ trợ Secret Manager. Tạo các secret:

```bash
firebase apphosting:secrets:set META_APP_ID
firebase apphosting:secrets:set META_APP_SECRET
firebase apphosting:secrets:set TOKEN_ENCRYPTION_KEY
firebase apphosting:secrets:set OPENAI_API_KEY
firebase apphosting:secrets:set GEMINI_API_KEY
firebase apphosting:secrets:set ANTHROPIC_API_KEY
```

Tạo encryption key:

```bash
openssl rand -base64 32
```

Trong App Hosting, kiểm tra lại `apphosting.yaml` và thay `APP_BASE_URL` bằng domain thực tế. Không commit secret value vào source.

## Facebook Meta App

OAuth callback:

`https://YOUR-DOMAIN/api/facebook/oauth/callback`

Cấu hình domain/redirect URI và các quyền cần thiết theo app Meta hiện tại. App lưu Page access token đã mã hóa ở Firestore server-only collection `pageSecrets`.

## Worker lịch đăng

Worker nằm trong `functions/src/index.ts`, chạy mỗi phút bằng Cloud Scheduler và được đặt region `asia-southeast1`.

```bash
cd functions
npm install
npm run build
firebase deploy --only functions
```

Thêm secret cho Cloud Function:

```bash
firebase functions:secrets:set TOKEN_ENCRYPTION_KEY
```

Khi deploy lại function, secret được mount vào runtime qua option `secrets`.

## App Hosting

Khuyến nghị chọn region `asia-southeast1` (Singapore) cho App Hosting và Cloud Functions vì app hướng tới người dùng Việt Nam. App Hosting hiện hỗ trợ region này; nội dung chưa cache sẽ được phục vụ từ primary region.

Trong Firebase Console:

- Hosting & Serverless → App Hosting
- Connect GitHub repository
- Chọn branch production
- App Hosting sẽ build/deploy Next.js

Hoặc dùng CLI theo hướng dẫn App Hosting hiện tại.

## AI provider

Provider được chọn độc lập ở Composer:

- Content: OpenAI / Gemini / Claude
- Image: Gemini Image / OpenAI Image / Claude → image prompt

Model mặc định được cấu hình bằng environment variable để dễ đổi mà không sửa UI:

- `OPENAI_TEXT_MODEL`
- `OPENAI_IMAGE_MODEL`
- `GEMINI_TEXT_MODEL`
- `GEMINI_IMAGE_MODEL`
- `ANTHROPIC_MODEL`

## Facebook Group / Profile

App không dùng browser automation, cookie scraping hoặc internal GraphQL để giả lập user. Các target Group/Profile được chuyển vào Manual Queue.

## Lưu ý khi deploy lần đầu

Source này đã chuyển toàn bộ MVP PHP sang Next.js/TypeScript + Firebase, nhưng môi trường tạo file không có kết nối npm registry nên chưa thể tạo `node_modules` hoặc một dependency lockfile đầy đủ. Sau khi tải source về, chạy `npm install` ở thư mục gốc và `npm install` trong `functions/`, sau đó mới commit lockfiles và deploy.

```bash
npm install
cd functions && npm install && cd ..
npm run verify:source
npm run build
```

## Production hardening tiếp theo

- Rate limiting cho AI routes và publish routes
- App Check
- Webhook đồng bộ Page status
- Post approval workflow / team roles
- Batch content generation
- Retry UI / audit logs
- Video/Reels pipeline
- Analytics / insights
- Cloud Tasks cho volume lớn thay cho polling 1 phút
