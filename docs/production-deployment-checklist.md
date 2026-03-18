# MetaMech production deployment checklist

This project requires a **separate production frontend URL** and **production backend API URL**.

Recommended URLs:

- Frontend app: `https://app.metamechsolutions.com`
- Backend API: `https://api.metamechsolutions.com`

## 1) Frontend production settings

Set this environment variable in your frontend hosting provider (Cloudflare Pages, etc.):

- `VITE_API_URL=https://api.metamechsolutions.com`

Notes:

- Frontend must not use localhost in production.
- The frontend now falls back to `window.location.origin` in production if `VITE_API_URL` is missing (safe default for same-origin reverse proxy setups).

## 2) Backend production settings

Set these backend environment variables:

- `NODE_ENV=production`
- `PORT=3000` (or provider-assigned port if required)
- `JWT_SECRET=<long random secret>`
- `JWT_EXPIRES_IN=7d` (or your policy)
- `DATABASE_URL=<production postgres connection string>`
  - or full `DB_*` set if not using `DATABASE_URL`
- `DB_SSL=true` only when your postgres host requires explicit TLS flag.
  - For some managed providers, `DATABASE_URL` already encodes SSL and `DB_SSL` can be omitted.
- `FRONTEND_URL=https://app.metamechsolutions.com`
- `CORS_ORIGINS=https://app.metamechsolutions.com`
- `TRIAL_IDENTITY_SALT=<long random secret>`
- `EMAIL_VERIFICATION_TOKEN_HOURS=24`
- `EXPOSE_DEV_RESET_LINK=false`
- `EXPOSE_DEV_VERIFICATION_LINK=false`

## 3) Cloudflare DNS / domain routing

Create DNS records:

- `app.metamechsolutions.com` -> frontend host
- `api.metamechsolutions.com` -> backend host

If proxying through Cloudflare:

- Ensure TLS is enabled (Full/Strict recommended).
- Keep frontend and API both HTTPS.

## 4) Database and migrations

Run migrations against production DB:

```bash
cd backend
npm run migrate
```

## 5) Test admin account (safe seeded path)

To preserve test/admin access without public bypass routes:

```bash
cd backend
TEST_ADMIN_EMAIL=saviosyl@gmail.com \
TEST_ADMIN_PASSWORD='<strong-password>' \
TEST_ADMIN_ROLE=admin \
TEST_ADMIN_SUBSCRIPTION_DAYS=3650 \
npm run seed:test-admin
```

Optional:

- `TEST_ADMIN_RESET_PASSWORD=true` to rotate password on existing account.

## 6) End-to-end auth verification

After deploy:

1. Open frontend login page.
2. Register a new user -> verify email -> confirm 1-day trial starts.
3. Login with verified trial user.
4. Confirm `/auth/me` returns user + subscription.
5. Confirm protected routes:
   - unverified user -> verify-email screen
   - expired/unentitled user -> billing screen
6. Confirm admin/test account `saviosyl@gmail.com` can sign in.
