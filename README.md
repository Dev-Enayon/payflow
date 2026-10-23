# PayFlow

A production-oriented Paystack payment gateway with a customer checkout, merchant dashboard, platform admin console, verified webhooks, and a fully working local mock mode.

PayFlow is intentionally **single-merchant**: one business receives payments, while daily operations are split between `MERCHANT` and `ADMIN` roles.

---

## Highlights

- **Hosted-style checkout** — customer enters name, email and amount, then is redirected to Paystack (or the local mock checkout).
- **Trusted payments only** — payment state is derived from independent server-side Paystack verification, not from redirect query parameters or webhook claims.
- **Guarded reconciliation** — settled payments are never downgraded by late or out-of-order events; amount/currency mismatches fail safely.
- **Idempotent webhooks** — HMAC SHA-512 signature verification, payload-hash deduplication, retry-safe event processing and 5xx responses for provider retries.
- **Merchant dashboard** — volume metrics, transaction search/filtering/CSV export, transaction timelines, API keys, outbound webhooks, integration guide and security settings.
- **Platform console** — all transactions, users, inbound webhook events, outbound delivery logs, audit trail and platform branding/settings.
- **API keys for integrations** — `pf_test_…` / `pf_live_…` keys are shown once, stored as SHA-256 hashes, and can be revoked.
- **Signed outbound webhooks** — AES-256-GCM encrypted endpoint secrets, SSRF-protected destinations, delivery logs and test delivery.
- **Safe local development** — `PAYSTACK_MOCK=true` enables a mock gateway and checkout page without Paystack credentials. Mock mode is rejected in production.
- **Hardened defaults** — Helmet, CORS allow-list, origin checks, CSRF tokens for cookie writes, Argon2id passwords, DB-backed sessions, rate limits and request IDs.

## Stack

| Layer      | Technology                                                                 |
| ---------- | -------------------------------------------------------------------------- |
| Backend    | Node.js, Express 5, TypeScript, Prisma 6, PostgreSQL, Zod                  |
| Auth       | Opaque DB sessions, Argon2id, CSRF tokens, SHA-256 API keys                |
| Frontend   | React 18, Vite 7, React Router 7, TanStack Query, React Hook Form + Zod    |
| UI         | Tailwind CSS 4, Radix primitives, Lucide icons, Recharts, Sonner           |
| Testing    | Vitest, Supertest, fake Paystack gateway                                   |
| Payments   | Paystack Transaction API + webhook API                                     |

## Repository layout

```
payway/
├── backend/
│   ├── prisma/                 # Schema, migration and seed
│   ├── src/
│   │   ├── config/             # Environment validation, Prisma client
│   │   ├── controllers/        # HTTP request handling
│   │   ├── middleware/         # Auth, CSRF, origin guard, rate limits, errors
│   │   ├── routes/             # API route definitions
│   │   ├── services/           # Payments, Paystack, webhooks, audit, settings
│   │   └── utils/              # Amounts, crypto, serializers, validation
│   └── tests/                  # API integration tests
├── frontend/
│   └── src/
│       ├── components/         # UI primitives, layout, shared tables
│       ├── hooks/              # Auth, queries, debounce, page titles
│       ├── layouts/            # Public, merchant and admin shells
│       ├── lib/                # API client, formatting utilities
│       ├── pages/              # Public, auth, dashboard and admin pages
│       ├── providers/          # Auth context/provider
│       └── services/           # Typed API service modules
├── package.json                # Workspace scripts (dev, build, test, lint)
└── README.md
```

---

## Quick start

### Prerequisites

- Node.js `>= 20.19` (verified on Node 24)
- PostgreSQL `>= 14` running locally or remotely
- npm `>= 10`

### 1. Install dependencies

```bash
npm run install:all
```

### 2. Create databases

```bash
createdb payflow
createdb payflow_test     # only needed for backend tests
```

### 3. Configure the backend

```bash
cp backend/.env.example backend/.env
```

Minimum local values:

```dotenv
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:5173
PAYSTACK_CALLBACK_URL=http://localhost:5173/payment/verify
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/payflow

SESSION_SECRET=replace-with-at-least-32-random-characters
# Generate with: openssl rand -base64 48

PAYSTACK_MOCK=true

SEED_ADMIN_EMAIL=admin@payflow.local
SEED_ADMIN_PASSWORD=choose-a-strong-local-password
SEED_MERCHANT_EMAIL=merchant@payflow.local
SEED_MERCHANT_PASSWORD=choose-a-strong-local-password
```

> `backend/.env` is gitignored. Never commit real credentials.

### 4. Configure the frontend

```bash
cp frontend/.env.example frontend/.env
```

```dotenv
VITE_API_BASE_URL=http://localhost:5000/api
VITE_BRAND_NAME=PayFlow
VITE_SITE_URL=http://localhost:5173
```

### 5. Migrate and seed

```bash
npm run db:migrate
npm run db:seed
```

The seed is idempotent and prints the seeded accounts. If a seed password is omitted, a random password is generated and printed once.

### 6. Run both apps

```bash
npm run dev
```

- Web app: <http://localhost:5173>
- API: <http://localhost:5000>
- Health: <http://localhost:5000/api/health>

With `PAYSTACK_MOCK=true`, go to `/pay`, enter an amount, and complete the payment on the local mock checkout with **successful**, **failed**, **abandoned**, **reversed** or **pending** outcome.

### Using real Paystack test keys

1. Set `PAYSTACK_MOCK=false`.
2. Set `PAYSTACK_SECRET_KEY` from the Paystack dashboard. A frontend public key is not required because checkout uses Paystack's hosted `authorization_url`.
3. Expose the API with a tunnel (for example `cloudflared tunnel --url http://localhost:5000`).
4. Set the Paystack webhook URL to `https://<tunnel-host>/api/webhooks/paystack`.
5. Point `PAYSTACK_CALLBACK_URL` at `http://localhost:5173/payment/verify`.
6. Keep `FRONTEND_URL=http://localhost:5173` so CORS and origin checks allow the app.

---

## Payment lifecycle

```
Customer                PayFlow web                PayFlow API                 Paystack
   │                         │                          │                         │
   ├─ POST /payments/initialize ───────────────────────>│                         │
   │                         │                          ├─ initialize transaction ─>
   │                         │                          │<─ authorization_url ─────┤
   │<────────────── authorization_url ──────────────────┤                         │
   ├─────────────────────── hosted checkout ─────────────────────────────────────>│
   │<────────────────────── redirect to callback ────────────────────────────────┤
   ├─ GET /payment/verify?reference=... ──>│            │                         │
   │                         │              ├─ verify ──────────────────────────>
   │                         │              │<─ authoritative status ─────────────┤
   │<───────────────────── result page ─────────────────┤                         │
   │                         │                          │<──── webhook ───────────┤
   │                         │                          ├─ verify again ──────────>
   │                         │                          ├─ reconcile idempotently ┤
```

Key rules:

- A redirect never proves payment success. The frontend always asks the API to verify the reference.
- The API fetches the authoritative transaction from Paystack and compares amount, currency and status.
- If Paystack reports success but the amount/currency does not match, the transaction is marked `FAILED` and verification returns `409 PAYMENT_MISMATCH`.
- Webhook and redirect verification share the same reconciliation function. Repeated verification is idempotent.
- A settled `SUCCESS` transaction is not downgraded by a late non-success event. Explicit refund/reversal events move it to `REVERSED`.

## Transaction states

`INITIALIZED` / `PENDING` → `SUCCESS` | `FAILED` | `ABANDONED` | `REVERSED`

A transaction starts as `INITIALIZED`, becomes `PENDING` while awaiting the customer, and settles into a terminal state. When the provider cannot be reached during verification, the API returns a retryable error without corrupting the stored state; a later verification or webhook can still resolve it.

---

## API overview

All API routes are prefixed with `/api`. Responses use `{ "data": ... }` and errors use `{ "error": { "code", "message", "details?" } }`.

### Public

| Method | Path                            | Description                                    |
| ------ | ------------------------------- | ---------------------------------------------- |
| GET    | `/health`                       | Liveness, database connectivity and mode       |
| GET    | `/settings/public`              | Public brand, business and support information |
| POST   | `/payments/initialize`          | Create a pending transaction and checkout URL  |
| GET    | `/payments/verify/:reference`   | Verify a payment with Paystack and reconcile   |
| GET    | `/payments/:reference`          | Masked public payment status                   |
| POST   | `/webhooks/paystack`            | Paystack webhook receiver (raw body signed)    |

Initialize request:

```json
{
  "name": "Ada Lovelace",
  "email": "ada@example.com",
  "amount": 2500,
  "currency": "NGN",
  "metadata": { "orderId": "ORD-1042" }
}
```

`amount` is in **NGN major units** (minimum `100`, maximum `5,000,000` by default). It is converted to kobo before being sent to Paystack.

### Authentication

Opaque session cookie `pf_session` plus a CSRF token returned by login and `GET /auth/me`. Unsafe cookie-authenticated requests must send `X-CSRF-Token`.

| Method | Path                        | Description                              |
| ------ | --------------------------- | ---------------------------------------- |
| POST   | `/auth/login`               | Sign in and receive user + CSRF token    |
| POST   | `/auth/logout`              | Revoke the current session               |
| GET    | `/auth/me`                   | Current user and CSRF token              |
| PATCH  | `/auth/profile`             | Update name/email                        |
| POST   | `/auth/change-password`     | Change password, revoke other sessions   |
| GET    | `/auth/sessions`            | List active sessions                     |
| DELETE | `/auth/sessions/:id`        | Revoke a specific session                |

### Merchant dashboard

Requires a session (not an API key).

| Method | Path                                  | Description                            |
| ------ | ------------------------------------- | -------------------------------------- |
| GET    | `/dashboard/overview`                 | Volume, success rate and recent activity |
| GET    | `/dashboard/transactions`             | Filter/sort/paginate transactions      |
| GET    | `/dashboard/transactions/:reference`  | Transaction detail and timeline        |
| GET    | `/payments`                           | Authenticated transaction listing      |

### API keys and outbound webhooks

Merchant/admin session only.

| Method | Path                                | Description                              |
| ------ | ----------------------------------- | ---------------------------------------- |
| GET    | `/keys`                             | List keys (never returns the secret)     |
| POST   | `/keys`                             | Create a key; secret returned once       |
| DELETE | `/keys/:id`                         | Revoke a key                             |
| GET    | `/webhooks`                         | List outbound endpoints                  |
| POST   | `/webhooks`                         | Create an endpoint (secret returned once) |
| PATCH  | `/webhooks/:id`                     | Update URL/events/active state           |
| DELETE | `/webhooks/:id`                     | Delete an endpoint                       |
| GET    | `/webhooks/events`                  | Merchant-visible inbound events          |
| GET    | `/webhooks/deliveries`              | Merchant outbound delivery logs          |
| GET    | `/webhooks/:id/deliveries`          | Deliveries for one endpoint              |
| POST   | `/webhooks/:id/test`                | Send a test delivery                     |

API keys authenticate `POST /payments/initialize` and the public payment endpoints through `Authorization: Bearer pf_test_…`. They cannot access session-only dashboard, key-management or admin routes.

### Admin

Requires a session with `ADMIN` role.

| Method | Path                               | Description                         |
| ------ | ---------------------------------- | ----------------------------------- |
| GET    | `/admin/overview`                  | Platform metrics                    |
| GET    | `/admin/users`                     | User accounts                       |
| GET    | `/admin/transactions`              | All transactions                    |
| GET    | `/admin/transactions/:reference`   | Any transaction detail              |
| GET    | `/admin/audit-logs`                | Filterable audit trail              |
| GET    | `/admin/webhook-events`            | Inbound events with payload/errors  |
| GET    | `/admin/webhook-deliveries`        | Outbound delivery attempts          |
| GET    | `/admin/settings`                  | Platform settings and mode          |
| PATCH  | `/admin/settings`                  | Update branding/contact settings    |

### Local mock endpoints

Registered only when `PAYSTACK_MOCK=true`:

```http
POST /api/dev/mock-payments/:reference/complete
Content-Type: application/json

{ "outcome": "success" | "failed" | "abandoned" | "reversed" | "pending" }
```

---

## Webhook security

### Inbound (Paystack → PayFlow)

- The raw request body is captured before JSON parsing.
- `x-paystack-signature` is verified as HMAC SHA-512 with the Paystack secret key using a timing-safe comparison.
- Invalid signatures return `401` and record no event.
- Events are deduplicated by payload hash.
- Before changing payment state, PayFlow independently verifies the transaction with Paystack.
- Transient provider failures return `503` so Paystack retries; redelivery is idempotent.

Supported events include `charge.success` and refund/reversal events. Unsupported events are stored as `IGNORED` without affecting payments.

### Outbound (PayFlow → merchant endpoint)

```
X-Payflow-Signature: sha256=<hex HMAC-SHA512 of the raw request body>
```

- Endpoint secrets are generated once, displayed once, and stored encrypted with AES-256-GCM.
- Destinations are validated to block localhost, private networks, link-local and metadata addresses.
- Deliveries record status code, error, attempt count and response time.
- Events: `payment.success`, `payment.failed`, `payment.reversed`.

---

## Security model

- Passwords hashed with Argon2id; login errors are intentionally generic.
- Opaque random session tokens are hashed before storage; sessions are revocable per device.
- Cookie-authenticated writes require both a valid session and a matching CSRF token.
- Origin guard rejects state-changing requests from unexpected browser origins.
- CORS is restricted to `FRONTEND_URL` values.
- API keys are hashed with SHA-256 and shown only once; revocation is immediate.
- Admin authorization is enforced server-side, never only by hiding UI.
- Helmet, request size limits, rate limits and request IDs are applied globally.
- Audit logs capture actor, action, entity, IP and user agent for sensitive operations.
- Production mode requires secure cookies, HTTPS callback URLs and `PAYSTACK_MOCK=false`.

## Environment variables

See `backend/.env.example` and `frontend/.env.example` for the full list.

| Variable                  | Purpose                                                     |
| ------------------------- | ----------------------------------------------------------- |
| `DATABASE_URL`            | PostgreSQL connection string                                |
| `FRONTEND_URL`            | Comma-separated allowed browser origins                     |
| `PAYSTACK_CALLBACK_URL`   | Redirect URL after Paystack checkout                        |
| `PAYSTACK_SECRET_KEY`     | Paystack secret key (also verifies webhook signatures)      |
| `PAYSTACK_PUBLIC_KEY`     | Optional; not required by the hosted-checkout redirect flow |
| `PAYSTACK_MOCK`           | `true` enables mock gateway; rejected in production         |
| `SESSION_SECRET`          | Session hashing and secret-encryption material (32+ chars)  |
| `ENCRYPTION_KEY`          | Optional dedicated AES key for webhook secrets              |
| `SESSION_TTL_HOURS`       | Session lifetime in hours                                   |
| `COOKIE_DOMAIN`           | Optional cookie domain for subdomain deployments            |
| `COOKIE_SAME_SITE`        | `lax`/`strict`/`none`; defaults to `none` in production     |
| `TRUST_PROXY`             | Express trust-proxy setting behind a reverse proxy          |
| `MIN_PAYMENT_AMOUNT`      | Minimum NGN amount                                          |
| `MAX_PAYMENT_AMOUNT`      | Maximum NGN amount                                          |
| `RATE_LIMITS_ENABLED`     | Disable only in controlled test environments                |
| `VITE_API_BASE_URL`       | Frontend API base URL (build time; HTTPS in production)     |
| `VITE_BRAND_NAME`         | Frontend fallback brand                                     |
| `VITE_SITE_URL`           | Public frontend URL used for metadata links                 |

---

## Scripts

From the repository root:

| Command               | Description                                      |
| --------------------- | ------------------------------------------------ |
| `npm run dev`         | Run API and web app together                     |
| `npm run build`       | Build backend and frontend                       |
| `npm run test`        | Run backend and frontend tests                   |
| `npm run lint`        | Lint both projects                               |
| `npm run typecheck`   | Type-check both projects                         |
| `npm run db:migrate`  | Create/apply a development migration             |
| `npm run db:deploy`   | Apply migrations in deployment                   |
| `npm run db:seed`     | Seed admin/merchant accounts and settings        |
| `npm run install:all` | Install root, backend and frontend dependencies  |

## Testing

```bash
npm run lint
npm run typecheck
npm run build
npm test
```

Current verified suite:

- **Backend:** 41 tests across payments/concurrency, webhooks, auth/RBAC/CSRF/API keys, rate limits, webhook endpoints, environment validation and health.
- **Frontend:** 6 utility tests (currency/date formatting, initials, truncation).

Backend tests use a fake Paystack gateway (no live calls), run serially, and reset the test database. Set `DATABASE_URL` to your test database before running tests if it is not `postgresql://postgres:postgres@127.0.0.1:55432/payflow_test`.

---

## Production deployment: Render + Vercel

Choose the production hosts first, for example `https://payflow.vercel.app` and
`https://payflow-api.onrender.com`. `FRONTEND_URL`, `PAYSTACK_CALLBACK_URL` and
`VITE_API_BASE_URL` must agree with those exact HTTPS origins.

### 1. Production database

Create a managed PostgreSQL database (Render PostgreSQL, Neon, Supabase, etc.)
and keep its connection string, including any required `sslmode=require`, for
the backend. Do not point production at a local database. Do not run
`prisma migrate reset` or delete data.

### 2. Backend on Render

The repository includes `render.yaml`, which defines `payflow-api` with
`rootDir: backend`, a build step, `prisma migrate deploy` on boot, `/api/health`
health checks, and secret variables marked `sync: false`.

1. Push this repository to GitHub/GitLab.
2. In Render, choose **New → Blueprint**, select the repository, and apply
   `render.yaml`. If you prefer a manual Web Service, use root directory
   `backend`, build command `npm ci --include=dev && npm run build`, and start
   command `npm run prisma:deploy && npm start`.
3. Enter these values in the Render dashboard:

| Variable                 | Value                                                              |
| ------------------------ | ------------------------------------------------------------------ |
| `DATABASE_URL`           | Production PostgreSQL connection string                            |
| `PAYSTACK_SECRET_KEY`    | Paystack **LIVE** secret key (`sk_live_...`) — backend only        |
| `FRONTEND_URL`           | `https://<vercel-domain>` (comma-separate preview/custom domains)  |
| `PAYSTACK_CALLBACK_URL`  | `https://<vercel-domain>/payment/verify`                           |
| `SESSION_SECRET`         | `openssl rand -base64 48` output (32+ characters)                  |
| `ENCRYPTION_KEY`         | Optional dedicated key, e.g. `openssl rand -base64 32`             |
| `SUPPORT_EMAIL`          | Real support inbox shown in the app                                |

   `NODE_ENV=production`, `PAYSTACK_MOCK=false`, rate limits and secure
   cross-site cookies are already set by the blueprint. Startup validation
   rejects mock mode, non-HTTPS origins/callbacks, missing Paystack secrets and
   disabled production rate limits.
4. Deploy and confirm `https://<api-host>/api/health` is healthy.
5. Seed the first accounts once, from the Render shell or a one-off job:

   ```bash
   npm run db:seed
   ```

   Set `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` and
   `SEED_MERCHANT_EMAIL`/`SEED_MERCHANT_PASSWORD` temporarily, or omit the
   passwords and capture the generated passwords printed once in the logs.
   Remove the seed password variables after seeding. The seed is idempotent.

### 3. Frontend on Vercel

`frontend/vercel.json` configures the Vite build, SPA rewrite, security headers
and immutable asset caching. The build intentionally fails on Vercel when
`VITE_API_BASE_URL` is missing or not HTTPS.

1. Import the repository into Vercel and set the project root to `frontend`.
2. Add these Production environment variables, then deploy:

| Variable            | Value                                      |
| ------------------- | ------------------------------------------ |
| `VITE_API_BASE_URL` | `https://<api-host>/api`                   |
| `VITE_SITE_URL`     | `https://<vercel-domain>`                  |
| `VITE_BRAND_NAME`   | `PayFlow`                                  |

3. Do **not** add `PAYSTACK_SECRET_KEY`, `SESSION_SECRET`, `DATABASE_URL` or any
   other server secret to Vercel. No `VITE_PAYSTACK_PUBLIC_KEY` is needed for
   the hosted-checkout flow.
4. If you attach a custom frontend domain, add it to `FRONTEND_URL` on Render,
   update `VITE_SITE_URL`, and redeploy both apps.

### 4. Paystack LIVE configuration

1. Complete Paystack business activation and domain verification for LIVE
   payments.
2. In the Paystack dashboard, switch to **LIVE** mode, then set the webhook URL
   to `https://<api-host>/api/webhooks/paystack`.
3. Confirm the LIVE secret key in Render belongs to the same Paystack account
   and mode as that webhook URL.
4. Run a small real payment. Confirm the hosted checkout redirects to
   `/payment/verify`, the API independently verifies the transaction, and the
   Paystack webhook delivery log shows a `200` response.
5. Remove or rotate any temporary test credentials. Keep database backups, log
   aggregation and uptime monitoring enabled.

### Manual blockers

Deployment cannot complete without account-level access that is not available
in this workspace:

- A Git repository connected to Render (Render cannot deploy from this local
  directory alone without a Render API token/CLI).
- A production PostgreSQL connection string.
- The Paystack LIVE secret key and production session/encryption secrets.
- The final Vercel and Render hostnames, which must be set in both dashboards.

## Current scope and limitations

- Single business, single currency (NGN) by default.
- No subscriptions, invoices, refund initiation, partial refunds or payout management.
- Webhook delivery is attempted synchronously with logging; there is no scheduled background retry worker.
- User/role creation is seeded or managed directly in the database; there is no admin user-management UI.
- Kobo amounts are handled as integers; the frontend converts NGN major units at the API boundary.
- A live Paystack account and domain verification are required for live-mode payments.

## Troubleshooting

| Symptom                                   | Likely cause / fix                                                        |
| ----------------------------------------- | ------------------------------------------------------------------------- |
| `401` on dashboard writes                 | Missing/stale CSRF token; reload or sign in again                         |
| CORS or origin rejection                  | Add the browser origin to `FRONTEND_URL`                                   |
| Mock checkout says mock mode is disabled  | Set `PAYSTACK_MOCK=true` in `backend/.env` and restart the API            |
| Payments stuck `PENDING`                  | Check Paystack keys, callback URL and webhook URL; call verify again       |
| Backend tests cannot connect              | Start PostgreSQL or update the test `DATABASE_URL`                         |
| Cookies not set in production             | Use HTTPS and a compatible `COOKIE_DOMAIN`; check `TRUST_PROXY`            |
| Frontend points at the wrong API          | Update `VITE_API_BASE_URL` and rebuild (Vite embeds it at build time)      |

## Notes

- PayFlow never stores card data. Card details are handled by Paystack's hosted checkout.
- No live Paystack requests are needed to run or test the project locally in mock mode.
- This project is provided as an implementation foundation; review configuration, compliance and operational requirements before processing real money.
