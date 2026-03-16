# MetaMech backend migration to Cloudflare Worker + D1

This guide is copy-paste oriented and matches the files in this repo.

## Architecture

- Frontend: Cloudflare Pages (`https://app.metamechsolutions.com`)
- Backend API: Cloudflare Worker (`https://api.metamechsolutions.com`)
- Database: Cloudflare D1 (`metamech-api-db`)

## Implemented API routes

- `GET /health`
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`

Compatibility endpoints (for current UI verification flow):

- `POST /auth/verify-email`
- `POST /auth/resend-verification`
- `GET /admin/test-email?to=user@example.com&key=...` (temporary, protected)

## Files added/updated

- `cloudflare-worker/src/index.ts`
- `cloudflare-worker/migrations/0001_initial_schema.sql`
- `wrangler.toml`
- `package.json` (Wrangler scripts)
- `.gitignore` (`.wrangler/`)
- `frontend/.env` (API URL set to production API domain)

## 1) Install Wrangler and login

```bash
npm install
npx wrangler login
```

Or with API token:

```bash
export CLOUDFLARE_API_TOKEN=YOUR_TOKEN
```

## 2) Create D1 database

```bash
npx wrangler d1 create metamech-api-db
```

Copy the returned `database_id` into `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "metamech-api-db"
database_id = "YOUR_DATABASE_ID"
migrations_dir = "cloudflare-worker/migrations"
```

## 3) Apply D1 migrations

Local (optional):

```bash
npx wrangler d1 migrations apply metamech-api-db --local
```

Remote (required):

```bash
npx wrangler d1 migrations apply metamech-api-db --remote
```

## 4) Set Worker secrets / vars

Required secrets:

```bash
echo "your-strong-jwt-secret" | npx wrangler secret put JWT_SECRET
echo "your-strong-trial-identity-salt" | npx wrangler secret put TRIAL_IDENTITY_SALT
```

Non-secret vars are in `wrangler.toml`:

- `FRONTEND_ORIGIN=https://app.metamechsolutions.com,https://metamech-studio.pages.dev`
- `FRONTEND_PRIMARY_ORIGIN=https://app.metamechsolutions.com`
- `ZEPTO_API_URL=https://api.zeptomail.eu/v1.1/email`
- `MAIL_FROM=hi@metamechsolutions.com`
- `MAIL_FROM_NAME=MetaMech Solutions`
- `JWT_EXPIRES_IN_SECONDS=604800`
- `EMAIL_VERIFICATION_TOKEN_HOURS=24`
- `EXPOSE_DEV_VERIFICATION_LINK=false`

Additional secrets for operational use:

```bash
echo "your-zepto-token" | npx wrangler secret put ZEPTO_TOKEN
echo "your-admin-test-email-key" | npx wrangler secret put ADMIN_TEST_EMAIL_KEY
```

## 5) Deploy Worker

```bash
npx wrangler deploy
```

If deploy uploads the Worker but fails with:

- `.../workers/routes Authentication error [code: 10000]`

then your API token is missing **Zone -> Workers Routes:Edit** for `metamechsolutions.com`.
Add that permission (or attach the route manually in dashboard), then rerun deploy.

## 6) Attach custom domain

Your `wrangler.toml` already contains route:

```toml
[[routes]]
pattern = "api.metamechsolutions.com/*"
zone_name = "metamechsolutions.com"
```

If you prefer Worker Custom Domain in dashboard:

1. Cloudflare Dashboard → Workers & Pages → Worker `metamech-api`
2. Settings → Triggers → Add Custom Domain
3. Domain: `api.metamechsolutions.com`
4. Save (Cloudflare will create/adjust DNS)

## 7) Frontend API URL

Cloudflare Pages project env (production + preview):

- `VITE_API_URL=https://api.metamechsolutions.com`

Then redeploy Pages.

## 8) Post-deploy verification

```bash
curl -i https://api.metamechsolutions.com/health
curl -i https://api.metamechsolutions.com/auth/me
curl -i -X POST https://api.metamechsolutions.com/auth/login \
  -H "Content-Type: application/json" \
  --data '{"email":"saviosyl@gmail.com","password":"YOUR_PASSWORD"}'
```

Expected:

- `/health` => `200`
- `/auth/me` without cookie => `401`
- `/auth/login` with valid credentials => `200` and `Set-Cookie: token=...; HttpOnly; Secure`

## 9) Notes

- Worker CORS is configured to allow only `https://app.metamechsolutions.com` with credentials.
- Auth cookie is `HttpOnly`, `Secure`, `SameSite=Lax`.
- JWT signature: HS256 via Web Crypto.
- Password hashing: PBKDF2 (Web Crypto, 100000 iterations for Worker runtime compatibility).

