type UserRow = {
  id: number;
  email: string;
  password_hash: string;
  display_name: string;
  stripe_customer_id: string | null;
  role: string;
  account_status: string;
  email_verified_at: string | null;
  token_version: number;
  created_at: string;
};

type SubscriptionEntitlement = {
  status: 'pending_verification' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired' | 'none';
  entitled: boolean;
  requiresEmailVerification: boolean;
  planCode: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
};

type Env = {
  DB: D1Database;
  JWT_SECRET: string;
  ZEPTO_TOKEN?: string;
  ZEPTO_API_URL?: string;
  MAIL_FROM?: string;
  MAIL_FROM_NAME?: string;
  FRONTEND_PRIMARY_ORIGIN?: string;
  FRONTEND_ORIGIN?: string;
  JWT_EXPIRES_IN_SECONDS?: string;
  EMAIL_VERIFICATION_TOKEN_HOURS?: string;
  EXPOSE_DEV_VERIFICATION_LINK?: string;
  TRIAL_IDENTITY_SALT?: string;
  NODE_ENV?: string;
  ADMIN_TEST_EMAIL_KEY?: string;
  ENABLE_ADMIN_TEST_EMAIL?: string;
  INTERNAL_ADMIN_EMAILS?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PRICE_MONTHLY_ID?: string;
  STRIPE_PRICE_YEARLY_ID?: string;
};

type BillingPlanInterval = 'monthly' | 'yearly';

const textEncoder = new TextEncoder();

function nowIso(): string {
  return new Date().toISOString();
}

function toJson(data: unknown, status = 200, extraHeaders?: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...(extraHeaders || {}),
    },
  });
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

const DEFAULT_INTERNAL_ADMIN_EMAILS = new Set(['saviosyl@gmail.com']);

function isInternalAdminEmail(email: string, env: Env): boolean {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  if (DEFAULT_INTERNAL_ADMIN_EMAILS.has(normalized)) return true;
  const configured = (env.INTERNAL_ADMIN_EMAILS || '')
    .split(',')
    .map((entry) => normalizeEmail(entry))
    .filter((entry) => entry.length > 0);
  return configured.includes(normalized);
}

function internalAdminEntitlement(): SubscriptionEntitlement {
  return {
    status: 'active',
    entitled: true,
    requiresEmailVerification: false,
    planCode: 'internal-full-access',
    currentPeriodStart: null,
    currentPeriodEnd: '2099-12-31T00:00:00.000Z',
  };
}

function parseCookies(request: Request): Record<string, string> {
  const raw = request.headers.get('Cookie');
  if (!raw) return {};
  const out: Record<string, string> = {};
  for (const pair of raw.split(';')) {
    const idx = pair.indexOf('=');
    if (idx <= 0) continue;
    const key = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1).trim();
    out[key] = decodeURIComponent(value);
  }
  return out;
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function base64UrlEncode(input: ArrayBuffer | Uint8Array | string): string {
  let bytes: Uint8Array;
  if (typeof input === 'string') bytes = textEncoder.encode(input);
  else bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecode(input: string): Uint8Array {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(input.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function hmacSha256(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, textEncoder.encode(data));
  return base64UrlEncode(signature);
}

async function hmacSha256Hex(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, textEncoder.encode(data));
  const bytes = new Uint8Array(signature);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(data: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', textEncoder.encode(data));
  const bytes = new Uint8Array(digest);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

async function signJwt(payload: Record<string, unknown>, secret: string, expiresInSeconds: number): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + expiresInSeconds };
  const h = base64UrlEncode(JSON.stringify(header));
  const p = base64UrlEncode(JSON.stringify(body));
  const s = await hmacSha256(`${h}.${p}`, secret);
  return `${h}.${p}.${s}`;
}

async function verifyJwt(token: string, secret: string): Promise<Record<string, unknown> | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;
  const expected = await hmacSha256(`${h}.${p}`, secret);
  if (!safeEqual(expected, s)) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(p))) as Record<string, unknown>;
    const exp = Number(payload.exp || 0);
    if (!exp || exp <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

async function hashPassword(password: string): Promise<string> {
  // Cloudflare Workers currently caps PBKDF2 iterations at 100000.
  const iterations = 100_000;
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', textEncoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    key,
    256
  );
  return `pbkdf2$${iterations}$${base64UrlEncode(salt)}$${base64UrlEncode(bits)}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
  const iterations = Number(parts[1]);
  if (!Number.isFinite(iterations) || iterations < 10_000) return false;
  const salt = base64UrlDecode(parts[2]);
  const expected = parts[3];
  const key = await crypto.subtle.importKey('raw', textEncoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    key,
    256
  );
  return safeEqual(base64UrlEncode(bits), expected);
}

function cookieHeader(token: string, maxAge: number): string {
  return [
    `token=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
  ].join('; ');
}

function clearCookieHeader(): string {
  return [
    'token=',
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    'Max-Age=0',
  ].join('; ');
}

function frontendOrigins(env: Env): string[] {
  const raw = env.FRONTEND_ORIGIN || 'https://app.metamechsolutions.com';
  return raw
    .split(',')
    .map((entry) => entry.trim().replace(/\/+$/g, ''))
    .filter((entry) => entry.length > 0);
}

function primaryFrontendOrigin(env: Env): string {
  const explicit = (env.FRONTEND_PRIMARY_ORIGIN || '').trim().replace(/\/+$/g, '');
  if (explicit) return explicit;
  const origins = frontendOrigins(env);
  return origins[0] || 'https://app.metamechsolutions.com';
}

function shouldExposeDevLinks(env: Env): boolean {
  return String(env.EXPOSE_DEV_VERIFICATION_LINK || '').toLowerCase() === 'true';
}

function resetTokenTtlHours(): number {
  return 1;
}

function getClientIp(request: Request): string {
  return (
    request.headers.get('cf-connecting-ip')
    || request.headers.get('x-forwarded-for')
    || request.headers.get('x-real-ip')
    || 'unknown'
  ).split(',')[0].trim();
}

async function enforceRateLimit(
  env: Env,
  bucketKey: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const now = Math.floor(Date.now() / 1000);
  const currentWindowStart = now - (now % windowSeconds);

  const existing = await env.DB
    .prepare('SELECT count, window_start FROM rate_limits WHERE bucket_key = ? LIMIT 1')
    .bind(bucketKey)
    .first<{ count: number; window_start: number }>();

  if (existing && Number(existing.window_start) === currentWindowStart) {
    if (Number(existing.count) >= limit) {
      const retryAfterSeconds = Math.max(1, currentWindowStart + windowSeconds - now);
      return { allowed: false, retryAfterSeconds };
    }
    await env.DB
      .prepare('UPDATE rate_limits SET count = count + 1, updated_at = CURRENT_TIMESTAMP WHERE bucket_key = ?')
      .bind(bucketKey)
      .run();
  } else {
    await env.DB
      .prepare(
        `INSERT INTO rate_limits (bucket_key, count, window_start, updated_at)
         VALUES (?, 1, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(bucket_key) DO UPDATE SET
           count = excluded.count,
           window_start = excluded.window_start,
           updated_at = CURRENT_TIMESTAMP`
      )
      .bind(bucketKey, currentWindowStart)
      .run();
  }

  // Opportunistic cleanup to prevent unbounded growth.
  if (Math.random() < 0.02) {
    const oldestWindowToKeep = currentWindowStart - windowSeconds * 12;
    await env.DB
      .prepare('DELETE FROM rate_limits WHERE window_start < ?')
      .bind(oldestWindowToKeep)
      .run();
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

async function checkRequestRateLimit(
  request: Request,
  env: Env,
  options: {
    routeTag: string;
    email?: string;
    perIpLimit: number;
    perIpWindowSeconds: number;
    perEmailLimit?: number;
    perEmailWindowSeconds?: number;
  }
): Promise<Response | null> {
  const ip = getClientIp(request);
  const ipBucketRaw = `${options.routeTag}:ip:${ip}`;
  const ipBucket = `${options.routeTag}:ip:${await sha256Hex(ipBucketRaw)}`;
  const ipCheck = await enforceRateLimit(env, ipBucket, options.perIpLimit, options.perIpWindowSeconds);
  if (!ipCheck.allowed) {
    return toJson(
      { error: 'Too many requests. Please wait and try again.' },
      429,
      { 'Retry-After': String(ipCheck.retryAfterSeconds) }
    );
  }

  const normalizedEmail = normalizeEmail(options.email || '');
  if (normalizedEmail && options.perEmailLimit && options.perEmailWindowSeconds) {
    const emailBucketRaw = `${options.routeTag}:email:${normalizedEmail}`;
    const emailBucket = `${options.routeTag}:email:${await sha256Hex(emailBucketRaw)}`;
    const emailCheck = await enforceRateLimit(env, emailBucket, options.perEmailLimit, options.perEmailWindowSeconds);
    if (!emailCheck.allowed) {
      return toJson(
        { error: 'Too many requests. Please wait and try again.' },
        429,
        { 'Retry-After': String(emailCheck.retryAfterSeconds) }
      );
    }
  }

  return null;
}

function adminRouteAllowed(request: Request, env: Env): boolean {
  const enabled = String(env.ENABLE_ADMIN_TEST_EMAIL || '').toLowerCase() === 'true';
  if (!enabled) return false;
  if (String(env.NODE_ENV || 'production').toLowerCase() !== 'production') return true;
  const configuredKey = (env.ADMIN_TEST_EMAIL_KEY || '').trim();
  if (!configuredKey) return false;
  const url = new URL(request.url);
  const supplied = (url.searchParams.get('key') || request.headers.get('x-admin-key') || '').trim();
  if (!supplied) return false;
  return safeEqual(configuredKey, supplied);
}

function verificationEmailHtml(verifyLink: string): string {
  return `
  <div style="margin:0;background:#f3f4f6;padding:24px;font-family:Segoe UI,Arial,sans-serif;color:#111827">
    <div style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
      <div style="background:#0f766e;padding:16px 20px;color:#ffffff">
        <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.85">MetaMech Solutions</div>
        <div style="font-size:22px;font-weight:700;line-height:1.2">Account Verification</div>
      </div>
      <div style="padding:22px 20px;line-height:1.65">
        <p style="margin:0 0 14px">Welcome to <strong>MetaMech Simulation Studio</strong>.</p>
        <p style="margin:0 0 16px">Please verify your email to activate your account and start your one-day trial:</p>
        <p style="margin:0 0 20px">
          <a href="${verifyLink}" style="display:inline-block;background:#0f766e;color:#ffffff;padding:11px 16px;border-radius:8px;text-decoration:none;font-weight:600">
            Verify Account
          </a>
        </p>
        <p style="margin:0 0 8px;font-size:13px;color:#4b5563">If the button does not work, copy this link:</p>
        <p style="margin:0 0 14px;font-size:13px;word-break:break-all;color:#0f766e">${verifyLink}</p>
        <p style="margin:0;font-size:13px;color:#6b7280">If you did not create this account, you can ignore this email.</p>
      </div>
    </div>
  </div>`;
}

function resetEmailHtml(resetLink: string): string {
  return `
  <div style="margin:0;background:#f3f4f6;padding:24px;font-family:Segoe UI,Arial,sans-serif;color:#111827">
    <div style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
      <div style="background:#1f2937;padding:16px 20px;color:#ffffff">
        <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.85">MetaMech Solutions</div>
        <div style="font-size:22px;font-weight:700;line-height:1.2">Password Reset</div>
      </div>
      <div style="padding:22px 20px;line-height:1.65">
        <p style="margin:0 0 14px">We received a request to reset your MetaMech password.</p>
        <p style="margin:0 0 16px">Use the link below to choose a new password. This link expires in <strong>1 hour</strong>.</p>
        <p style="margin:0 0 20px">
          <a href="${resetLink}" style="display:inline-block;background:#0f766e;color:#ffffff;padding:11px 16px;border-radius:8px;text-decoration:none;font-weight:600">
            Reset Password
          </a>
        </p>
        <p style="margin:0 0 8px;font-size:13px;color:#4b5563">If the button does not work, copy this link:</p>
        <p style="margin:0 0 14px;font-size:13px;word-break:break-all;color:#0f766e">${resetLink}</p>
        <p style="margin:0;font-size:13px;color:#6b7280">If you did not request this reset, you can ignore this email.</p>
      </div>
    </div>
  </div>`;
}

async function sendZeptoMail(env: Env, toEmail: string, subject: string, html: string): Promise<string> {
  const url = env.ZEPTO_API_URL || 'https://api.zeptomail.eu/v1.1/email';
  const token = env.ZEPTO_TOKEN;
  if (!token) throw new Error('Missing ZEPTO_TOKEN');

  const fromAddress = env.MAIL_FROM || 'hi@metamechsolutions.com';
  const fromName = env.MAIL_FROM_NAME || 'MetaMech Solutions';
  const payload = {
    from: { address: fromAddress, name: fromName },
    to: [{ email_address: { address: toEmail, name: toEmail } }],
    reply_to: [{ address: fromAddress, name: fromName }],
    subject,
    htmlbody: html,
    track_clicks: true,
    track_opens: true,
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Zoho-enczapikey ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const body = await res.text();
  console.log(`[MAIL] Zepto status=${res.status} to=${toEmail}`);
  if (!res.ok) {
    throw new Error(`ZeptoMail failed ${res.status}: ${body}`);
  }
  console.log(`[MAIL] Zepto accepted to=${toEmail} body=${body.slice(0, 400)}`);
  return body;
}

function expiresInSeconds(env: Env): number {
  const parsed = Number(env.JWT_EXPIRES_IN_SECONDS || '604800');
  if (!Number.isFinite(parsed) || parsed <= 0) return 604800;
  return Math.floor(parsed);
}

function verificationTtlHours(env: Env): number {
  const parsed = Number(env.EMAIL_VERIFICATION_TOKEN_HOURS || '24');
  if (!Number.isFinite(parsed) || parsed <= 0) return 24;
  return Math.floor(parsed);
}

async function getEntitlement(db: D1Database, userId: number, emailVerified: boolean): Promise<SubscriptionEntitlement> {
  const row = await db
    .prepare(
      `SELECT status, plan_code, current_period_start, current_period_end
       FROM subscriptions
       WHERE user_id = ?
       ORDER BY updated_at DESC, id DESC
       LIMIT 1`
    )
    .bind(userId)
    .first<{
      status: SubscriptionEntitlement['status'];
      plan_code: string | null;
      current_period_start: string | null;
      current_period_end: string | null;
    }>();

  if (!row) {
    return {
      status: emailVerified ? 'none' : 'pending_verification',
      entitled: false,
      requiresEmailVerification: !emailVerified,
      planCode: null,
      currentPeriodStart: null,
      currentPeriodEnd: null,
    };
  }

  const periodEndMs = row.current_period_end ? Date.parse(row.current_period_end) : 0;
  const periodExpired = periodEndMs > 0 && periodEndMs <= Date.now();
  const effectiveStatus: SubscriptionEntitlement['status'] =
    periodExpired && (row.status === 'active' || row.status === 'trialing') ? 'expired' : row.status;
  const requiresEmailVerification = !emailVerified || effectiveStatus === 'pending_verification';
  const entitled = !requiresEmailVerification && (effectiveStatus === 'active' || effectiveStatus === 'trialing') && !periodExpired;

  return {
    status: effectiveStatus,
    entitled,
    requiresEmailVerification,
    planCode: row.plan_code,
    currentPeriodStart: row.current_period_start,
    currentPeriodEnd: row.current_period_end,
  };
}

type SubscriptionRow = {
  id: number;
  user_id: number;
  status: string;
  plan_code: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: number;
  provider: string | null;
  provider_subscription_id: string | null;
  provider_customer_id: string | null;
  provider_price_id: string | null;
  checkout_session_id: string | null;
};

function planCodeFromInterval(plan: BillingPlanInterval): string {
  return plan === 'monthly' ? 'full-access-monthly' : 'full-access-yearly';
}

function planCodeFromStripePrice(env: Env, priceId: string | null | undefined): string | null {
  if (!priceId) return null;
  const monthly = (env.STRIPE_PRICE_MONTHLY_ID || '').trim();
  const yearly = (env.STRIPE_PRICE_YEARLY_ID || '').trim();
  if (monthly && priceId === monthly) return 'full-access-monthly';
  if (yearly && priceId === yearly) return 'full-access-yearly';
  return null;
}

function normalizeStripeSubscriptionStatus(status: string | null | undefined): SubscriptionEntitlement['status'] {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'active') return 'active';
  if (normalized === 'trialing') return 'trialing';
  if (normalized === 'past_due' || normalized === 'unpaid' || normalized === 'incomplete') return 'past_due';
  if (normalized === 'canceled' || normalized === 'incomplete_expired') return 'canceled';
  return 'past_due';
}

async function stripeFormRequest(
  env: Env,
  method: 'POST' | 'GET',
  path: string,
  fields?: Record<string, string>
): Promise<any> {
  const secretKey = (env.STRIPE_SECRET_KEY || '').trim();
  if (!secretKey) throw new Error('Missing STRIPE_SECRET_KEY');
  const body = fields ? new URLSearchParams(fields).toString() : undefined;
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      ...(fields ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    body,
  });
  const text = await res.text();
  let parsed: any = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }
  if (!res.ok) {
    const message = parsed?.error?.message || `Stripe API request failed (${res.status})`;
    throw new Error(message);
  }
  return parsed;
}

async function getActiveSubscriptionRow(db: D1Database, userId: number): Promise<SubscriptionRow | null> {
  return db
    .prepare(
      `SELECT id, user_id, status, plan_code, current_period_start, current_period_end,
              cancel_at_period_end, provider, provider_subscription_id, provider_customer_id,
              provider_price_id, checkout_session_id
       FROM subscriptions
       WHERE user_id = ?
       LIMIT 1`
    )
    .bind(userId)
    .first<SubscriptionRow>();
}

async function getOrCreateStripeCustomer(env: Env, user: UserRow): Promise<string> {
  if (user.stripe_customer_id) return user.stripe_customer_id;

  const customer = await stripeFormRequest(env, 'POST', '/customers', {
    email: user.email,
    name: user.display_name,
    'metadata[user_id]': String(user.id),
  });
  const customerId = String(customer?.id || '');
  if (!customerId) throw new Error('Stripe customer creation failed');

  await env.DB
    .prepare('UPDATE users SET stripe_customer_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .bind(customerId, user.id)
    .run();
  return customerId;
}

async function createCheckoutSession(env: Env, user: UserRow, plan: BillingPlanInterval): Promise<string> {
  const existing = await getActiveSubscriptionRow(env.DB, user.id);
  if (
    existing
    && existing.provider === 'stripe'
    && existing.provider_subscription_id
    && (existing.status === 'active' || existing.status === 'trialing' || existing.status === 'past_due')
  ) {
    const err: any = new Error('Manage existing subscription in billing portal');
    err.code = 'MANAGE_IN_PORTAL_REQUIRED';
    throw err;
  }

  const customerId = await getOrCreateStripeCustomer(env, user);
  const successUrl = `${primaryFrontendOrigin(env)}/simulation/access?state=membership&checkout=success`;
  const cancelUrl = `${primaryFrontendOrigin(env)}/simulation/access?state=membership&checkout=cancel`;
  const isMonthly = plan === 'monthly';
  const planLabel = isMonthly ? 'MetaMech Simulation – Monthly' : 'Subscribe to MetaMech Simulation – Yearly';
  const unitAmount = isMonthly ? '4900' : '49900';
  const interval = isMonthly ? 'month' : 'year';

  const session = await stripeFormRequest(env, 'POST', '/checkout/sessions', {
    mode: 'subscription',
    customer: customerId,
    'line_items[0][price_data][currency]': 'eur',
    'line_items[0][price_data][unit_amount]': unitAmount,
    'line_items[0][price_data][recurring][interval]': interval,
    'line_items[0][price_data][product_data][name]': planLabel,
    'line_items[0][quantity]': '1',
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: String(user.id),
    'metadata[user_id]': String(user.id),
    'metadata[user_email]': user.email,
    'metadata[plan_interval]': plan,
    'metadata[plan_code]': planCodeFromInterval(plan),
    'subscription_data[metadata][user_id]': String(user.id),
    'subscription_data[metadata][plan_interval]': plan,
    'subscription_data[metadata][plan_code]': planCodeFromInterval(plan),
    allow_promotion_codes: 'true',
  });
  const checkoutUrl = String(session?.url || '');
  if (!checkoutUrl) throw new Error('Stripe checkout URL missing');

  if (session?.id) {
    await env.DB
      .prepare(
        `UPDATE subscriptions
         SET plan_code = ?, provider = 'stripe', provider_customer_id = ?, checkout_session_id = ?, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = ?`
      )
      .bind(planCodeFromInterval(plan), customerId, String(session.id), user.id)
      .run();
  }
  return checkoutUrl;
}

async function createPortalSession(env: Env, user: UserRow): Promise<string> {
  const customerId = await getOrCreateStripeCustomer(env, user);
  const returnUrl = `${primaryFrontendOrigin(env)}/simulation/access?state=membership&portal=return`;
  const session = await stripeFormRequest(env, 'POST', '/billing_portal/sessions', {
    customer: customerId,
    return_url: returnUrl,
  });
  const url = String(session?.url || '');
  if (!url) throw new Error('Stripe portal URL missing');
  return url;
}

function stripeSignatureTimestampAndV1(signatureHeader: string): { t: string; v1: string } | null {
  const parts = signatureHeader.split(',').map((p) => p.trim());
  const t = parts.find((p) => p.startsWith('t='))?.slice(2) || '';
  const v1 = parts.find((p) => p.startsWith('v1='))?.slice(2) || '';
  if (!t || !v1) return null;
  return { t, v1 };
}

async function verifyStripeWebhookSignature(payload: string, signatureHeader: string, secret: string): Promise<boolean> {
  const parsed = stripeSignatureTimestampAndV1(signatureHeader);
  if (!parsed) return false;
  const signedPayload = `${parsed.t}.${payload}`;
  const expected = await hmacSha256Hex(signedPayload, secret);
  return safeEqual(expected, parsed.v1);
}

async function resolveUserIdFromStripeData(
  env: Env,
  customerId: string | null | undefined,
  userIdFromMetadata: string | null | undefined
): Promise<number | null> {
  const candidateId = Number(userIdFromMetadata || 0);
  if (candidateId) return candidateId;
  if (!customerId) return null;
  const user = await env.DB
    .prepare('SELECT id FROM users WHERE stripe_customer_id = ? LIMIT 1')
    .bind(customerId)
    .first<{ id: number }>();
  return user ? Number(user.id) : null;
}

async function upsertSubscriptionFromStripe(env: Env, params: {
  userId: number;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  stripePriceId?: string | null;
  checkoutSessionId?: string | null;
  stripeStatus?: string | null;
  currentPeriodStartUnix?: number | null;
  currentPeriodEndUnix?: number | null;
  cancelAtPeriodEnd?: boolean;
  canceledAtUnix?: number | null;
  planCodeHint?: string | null;
}): Promise<void> {
  const status = normalizeStripeSubscriptionStatus(params.stripeStatus);
  const startIso = params.currentPeriodStartUnix
    ? new Date(params.currentPeriodStartUnix * 1000).toISOString()
    : null;
  const endIso = params.currentPeriodEndUnix
    ? new Date(params.currentPeriodEndUnix * 1000).toISOString()
    : null;
  const canceledAtIso = params.canceledAtUnix
    ? new Date(params.canceledAtUnix * 1000).toISOString()
    : null;
  const derivedPlanCode =
    params.planCodeHint
    || planCodeFromStripePrice(env, params.stripePriceId)
    || null;

  await env.DB
    .prepare(
      `INSERT INTO subscriptions (
         user_id, status, plan_code, current_period_start, current_period_end,
         cancel_at_period_end, provider, provider_subscription_id, provider_customer_id,
         provider_price_id, checkout_session_id, canceled_at, created_at, updated_at
       )
       VALUES (?, ?, ?, ?, ?, ?, 'stripe', ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT(user_id) DO UPDATE SET
         status = excluded.status,
         plan_code = COALESCE(excluded.plan_code, subscriptions.plan_code),
         current_period_start = COALESCE(excluded.current_period_start, subscriptions.current_period_start),
         current_period_end = COALESCE(excluded.current_period_end, subscriptions.current_period_end),
         cancel_at_period_end = excluded.cancel_at_period_end,
         provider = 'stripe',
         provider_subscription_id = COALESCE(excluded.provider_subscription_id, subscriptions.provider_subscription_id),
         provider_customer_id = COALESCE(excluded.provider_customer_id, subscriptions.provider_customer_id),
         provider_price_id = COALESCE(excluded.provider_price_id, subscriptions.provider_price_id),
         checkout_session_id = COALESCE(excluded.checkout_session_id, subscriptions.checkout_session_id),
         canceled_at = COALESCE(excluded.canceled_at, subscriptions.canceled_at),
         updated_at = CURRENT_TIMESTAMP`
    )
    .bind(
      params.userId,
      status,
      derivedPlanCode,
      startIso,
      endIso,
      params.cancelAtPeriodEnd ? 1 : 0,
      params.stripeSubscriptionId || null,
      params.stripeCustomerId || null,
      params.stripePriceId || null,
      params.checkoutSessionId || null,
      canceledAtIso
    )
    .run();
}

async function issueVerificationToken(env: Env, userId: number): Promise<{ rawToken: string; link: string }> {
  const rawToken = base64UrlEncode(crypto.getRandomValues(new Uint8Array(32)));
  const tokenHash = await sha256Hex(rawToken);

  await env.DB.prepare('UPDATE email_verification_tokens SET used_at = CURRENT_TIMESTAMP WHERE user_id = ? AND used_at IS NULL')
    .bind(userId)
    .run();

  await env.DB.prepare(
    `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
     VALUES (?, ?, datetime('now', ?))`
  )
    .bind(userId, tokenHash, `+${verificationTtlHours(env)} hours`)
    .run();

  const link = `${primaryFrontendOrigin(env)}/verify-email?token=${encodeURIComponent(rawToken)}`;
  return { rawToken, link };
}

async function trialIdentityHash(env: Env, email: string): Promise<string> {
  const key = env.TRIAL_IDENTITY_SALT || env.JWT_SECRET;
  return sha256Hex(`${normalizeEmail(email)}::${key}`);
}

async function startTrialIfEligible(env: Env, userId: number, email: string): Promise<{ granted: boolean; reason: string }> {
  const user = await env.DB.prepare('SELECT trial_used_at FROM users WHERE id = ?').bind(userId).first<{ trial_used_at: string | null }>();
  if (!user) return { granted: false, reason: 'not_found' };
  if (user.trial_used_at) return { granted: false, reason: 'already_used' };

  const idHash = await trialIdentityHash(env, email);
  const ledger = await env.DB
    .prepare('SELECT first_user_id FROM trial_identity_ledger WHERE email_hash = ? LIMIT 1')
    .bind(idHash)
    .first<{ first_user_id: number }>();

  if (ledger && Number(ledger.first_user_id) !== userId) {
    await env.DB.prepare("UPDATE users SET trial_used_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND trial_used_at IS NULL")
      .bind(userId)
      .run();
    await env.DB.prepare(
      `UPDATE subscriptions
       SET status = 'expired', current_period_end = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ? AND status = 'pending_verification'`
    )
      .bind(userId)
      .run();
    return { granted: false, reason: 'identity_conflict' };
  }

  await env.DB.prepare(
    `INSERT OR IGNORE INTO trial_identity_ledger (email_hash, first_user_id, trial_consumed_at)
     VALUES (?, ?, CURRENT_TIMESTAMP)`
  )
    .bind(idHash, userId)
    .run();

  await env.DB.prepare("UPDATE users SET trial_used_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND trial_used_at IS NULL")
    .bind(userId)
    .run();

  await env.DB.prepare(
    `UPDATE subscriptions
     SET status = 'trialing',
         plan_code = COALESCE(plan_code, 'trial-1d'),
         current_period_start = CURRENT_TIMESTAMP,
         current_period_end = datetime('now', '+1 day'),
         trial_started_at = CURRENT_TIMESTAMP,
         trial_ends_at = datetime('now', '+1 day'),
         updated_at = CURRENT_TIMESTAMP
     WHERE user_id = ?`
  )
    .bind(userId)
    .run();

  return { granted: true, reason: 'granted' };
}

function withCors(request: Request, response: Response, env: Env): Response {
  const origin = request.headers.get('Origin');
  const allowed = frontendOrigins(env);
  const headers = new Headers(response.headers);
  if (origin && allowed.includes(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Credentials', 'true');
  }
  headers.set('Vary', 'Origin');
  return new Response(response.body, { status: response.status, headers });
}

function optionsResponse(request: Request, env: Env): Response {
  const origin = request.headers.get('Origin');
  const allowed = frontendOrigins(env);
  const headers = new Headers();
  if (origin && allowed.includes(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Credentials', 'true');
    headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type');
    headers.set('Access-Control-Max-Age', '86400');
  }
  headers.set('Vary', 'Origin');
  return new Response(null, { status: 204, headers });
}

async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

async function handleRegister(request: Request, env: Env): Promise<Response> {
  const body = await readJson<{ email?: string; password?: string; displayName?: string }>(request);
  const email = normalizeEmail(body?.email || '');
  const password = body?.password || '';
  const displayName = (body?.displayName || '').trim();

  const limitResponse = await checkRequestRateLimit(request, env, {
    routeTag: 'auth_register',
    email,
    perIpLimit: 12,
    perIpWindowSeconds: 10 * 60,
    perEmailLimit: 5,
    perEmailWindowSeconds: 60 * 60,
  });
  if (limitResponse) return limitResponse;

  if (!isEmail(email) || password.length < 8 || !displayName) {
    return toJson({ error: 'Validation failed' }, 400);
  }

  const safeMessage = 'If an account with that email exists, a verification link has been sent.';
  const existing = await env.DB
    .prepare('SELECT id, email_verified_at FROM users WHERE email = ? LIMIT 1')
    .bind(email)
    .first<{ id: number; email_verified_at: string | null }>();

  if (existing) {
    let link = '';
    if (!existing.email_verified_at) {
      ({ link } = await issueVerificationToken(env, existing.id));
      try {
        await sendZeptoMail(env, email, 'Verify your MetaMech account', verificationEmailHtml(link));
      } catch (e: any) {
        console.log('[MAIL] verification send failed:', e?.message || e);
      }
    }

    return toJson({
      message: safeMessage,
      requiresEmailVerification: true,
      email,
      ...(shouldExposeDevLinks(env) && link ? { devVerificationLink: link } : {}),
    });
  }

  const passwordHash = await hashPassword(password);
  const created = await env.DB
    .prepare(
      `INSERT INTO users (
         email, password_hash, display_name, role, account_status, token_version, created_at, updated_at
       ) VALUES (?, ?, ?, 'user', 'active', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
    )
    .bind(email, passwordHash, displayName)
    .run();
  const userId = Number(created.meta.last_row_id);

  await env.DB
    .prepare(
      `INSERT INTO subscriptions (
         user_id, status, plan_code, current_period_start, current_period_end,
         cancel_at_period_end, created_at, updated_at
       ) VALUES (?, 'pending_verification', 'trial-1d', NULL, NULL, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
    )
    .bind(userId)
    .run();

  const { link } = await issueVerificationToken(env, userId);
  try {
    await sendZeptoMail(env, email, 'Verify your MetaMech account', verificationEmailHtml(link));
  } catch (e: any) {
    console.log('[MAIL] verification send failed:', e?.message || e);
  }

  return toJson({
    message: safeMessage,
    requiresEmailVerification: true,
    email,
    ...(shouldExposeDevLinks(env) ? { devVerificationLink: link } : {}),
  }, 201);
}

async function handleVerifyEmail(request: Request, env: Env): Promise<Response> {
  const body = await readJson<{ token?: string }>(request);
  const token = (body?.token || '').trim();
  if (!token) return toJson({ error: 'Validation failed' }, 400);

  const tokenHash = await sha256Hex(token);
  const row = await env.DB
    .prepare(
      `SELECT id, user_id
       FROM email_verification_tokens
       WHERE token_hash = ?
         AND used_at IS NULL
         AND expires_at > CURRENT_TIMESTAMP
       LIMIT 1`
    )
    .bind(tokenHash)
    .first<{ id: number; user_id: number }>();
  if (!row) return toJson({ error: 'Invalid or expired verification token' }, 400);

  const user = await env.DB
    .prepare('SELECT id, email FROM users WHERE id = ? LIMIT 1')
    .bind(row.user_id)
    .first<{ id: number; email: string }>();
  if (!user) return toJson({ error: 'Verification target account not found' }, 400);

  await env.DB.prepare('UPDATE email_verification_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = ?')
    .bind(row.id)
    .run();
  await env.DB
    .prepare('UPDATE users SET email_verified_at = COALESCE(email_verified_at, CURRENT_TIMESTAMP), updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .bind(user.id)
    .run();
  await env.DB.prepare('UPDATE email_verification_tokens SET used_at = CURRENT_TIMESTAMP WHERE user_id = ? AND used_at IS NULL')
    .bind(user.id)
    .run();

  const trial = await startTrialIfEligible(env, user.id, user.email);
  const message = trial.granted
    ? 'Email verified successfully. Your 1-day trial is now active.'
    : trial.reason === 'already_used'
      ? 'Email verified successfully. Your previous trial has already been used.'
      : trial.reason === 'identity_conflict'
        ? 'Email verified successfully. This identity already consumed a trial previously.'
        : 'Email verified successfully.';

  const entitlement = await getEntitlement(env.DB, user.id, true);
  return toJson({
    message,
    emailVerified: true,
    trialGranted: trial.granted,
    trialReason: trial.reason,
    subscription: entitlement,
  });
}

async function handleResendVerification(request: Request, env: Env): Promise<Response> {
  const body = await readJson<{ email?: string }>(request);
  const email = normalizeEmail(body?.email || '');
  if (!isEmail(email)) return toJson({ error: 'Validation failed' }, 400);
  const user = await env.DB
    .prepare('SELECT id, email_verified_at FROM users WHERE email = ? LIMIT 1')
    .bind(email)
    .first<{ id: number; email_verified_at: string | null }>();

  if (!user) return toJson({ message: 'If an account with that email exists, a verification link has been sent.' });
  if (user.email_verified_at) return toJson({ message: 'Email is already verified. You can sign in now.', alreadyVerified: true });

  const { link } = await issueVerificationToken(env, user.id);
  try {
    await sendZeptoMail(env, email, 'Verify your MetaMech account', verificationEmailHtml(link));
  } catch (e: any) {
    console.log('[MAIL] resend verification failed:', e?.message || e);
  }
  return toJson({
    message: 'If an account with that email exists, a verification link has been sent.',
    ...(shouldExposeDevLinks(env) ? { devVerificationLink: link } : {}),
  });
}

async function handleForgotPassword(request: Request, env: Env): Promise<Response> {
  const body = await readJson<{ email?: string }>(request);
  const email = normalizeEmail(body?.email || '');

  const limitResponse = await checkRequestRateLimit(request, env, {
    routeTag: 'auth_forgot_password',
    email,
    perIpLimit: 20,
    perIpWindowSeconds: 10 * 60,
    perEmailLimit: 6,
    perEmailWindowSeconds: 60 * 60,
  });
  if (limitResponse) return limitResponse;

  if (!isEmail(email)) return toJson({ error: 'Validation failed' }, 400);

  const genericMessage = 'If an account with that email exists, we sent a password reset link.';
  const user = await env.DB
    .prepare('SELECT id FROM users WHERE email = ? LIMIT 1')
    .bind(email)
    .first<{ id: number }>();
  if (!user) return toJson({ message: genericMessage });

  const rawToken = base64UrlEncode(crypto.getRandomValues(new Uint8Array(32)));
  const tokenHash = await sha256Hex(rawToken);
  await env.DB
    .prepare('UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE user_id = ? AND used_at IS NULL')
    .bind(user.id)
    .run();
  await env.DB
    .prepare(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES (?, ?, datetime('now', ?))`
    )
    .bind(user.id, tokenHash, `+${resetTokenTtlHours()} hours`)
    .run();

  const resetLink = `${primaryFrontendOrigin(env)}/reset-password?token=${encodeURIComponent(rawToken)}`;
  try {
    await sendZeptoMail(env, email, 'Reset your MetaMech password', resetEmailHtml(resetLink));
  } catch (e: any) {
    console.log('[MAIL] forgot-password send failed:', e?.message || e);
  }

  return toJson({
    message: genericMessage,
    ...(shouldExposeDevLinks(env) ? { devResetLink: resetLink } : {}),
  });
}

async function handleResetPassword(request: Request, env: Env): Promise<Response> {
  const body = await readJson<{ token?: string; password?: string }>(request);
  const token = (body?.token || '').trim();
  const password = body?.password || '';
  if (!token || password.length < 8) return toJson({ error: 'Validation failed' }, 400);

  const tokenHash = await sha256Hex(token);
  const resetRow = await env.DB
    .prepare(
      `SELECT id, user_id
       FROM password_reset_tokens
       WHERE token_hash = ?
         AND used_at IS NULL
         AND expires_at > CURRENT_TIMESTAMP
       LIMIT 1`
    )
    .bind(tokenHash)
    .first<{ id: number; user_id: number }>();
  if (!resetRow) return toJson({ error: 'Invalid or expired reset token' }, 400);

  const passwordHash = await hashPassword(password);
  await env.DB
    .prepare('UPDATE users SET password_hash = ?, token_version = token_version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .bind(passwordHash, resetRow.user_id)
    .run();
  await env.DB
    .prepare('UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = ?')
    .bind(resetRow.id)
    .run();
  await env.DB
    .prepare('UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE user_id = ? AND used_at IS NULL')
    .bind(resetRow.user_id)
    .run();

  return toJson({ message: 'Password reset successful' });
}

async function handleAdminTestEmail(request: Request, env: Env): Promise<Response> {
  if (!adminRouteAllowed(request, env)) {
    return toJson({ error: 'Forbidden' }, 403);
  }
  const url = new URL(request.url);
  const toEmail = normalizeEmail(url.searchParams.get('to') || '');

  const limitResponse = await checkRequestRateLimit(request, env, {
    routeTag: 'admin_test_email',
    email: toEmail,
    perIpLimit: 5,
    perIpWindowSeconds: 10 * 60,
    perEmailLimit: 5,
    perEmailWindowSeconds: 10 * 60,
  });
  if (limitResponse) return limitResponse;

  if (!isEmail(toEmail)) return toJson({ error: 'Validation failed' }, 400);

  const html = `
  <div style="font-family:Segoe UI,Arial,sans-serif;color:#111827;line-height:1.6">
    <h2 style="margin:0 0 12px">MetaMech test email</h2>
    <p style="margin:0 0 12px">This is a direct ZeptoMail test from the Cloudflare Worker.</p>
    <p style="margin:0;color:#6b7280">Timestamp: ${new Date().toISOString()}</p>
  </div>`;
  const providerResponse = await sendZeptoMail(env, toEmail, 'MetaMech ZeptoMail test', html);
  return toJson({
    message: 'Test email request accepted.',
    to: toEmail,
    providerResponse: providerResponse.slice(0, 800),
  });
}

async function handleLogin(request: Request, env: Env): Promise<Response> {
  const body = await readJson<{ email?: string; password?: string }>(request);
  const email = normalizeEmail(body?.email || '');
  const password = body?.password || '';
  if (!isEmail(email) || !password) return toJson({ error: 'Validation failed' }, 400);

  const user = await env.DB
    .prepare(
      `SELECT id, email, password_hash, display_name, role, account_status, email_verified_at, token_version, created_at
              , stripe_customer_id
       FROM users
       WHERE email = ?
       LIMIT 1`
    )
    .bind(email)
    .first<UserRow>();

  if (!user) return toJson({ error: 'Invalid email or password' }, 401);
  if (user.account_status === 'disabled') return toJson({ error: 'Account disabled' }, 403);

  const passOk = await verifyPassword(password, user.password_hash);
  if (!passOk) return toJson({ error: 'Invalid email or password' }, 401);

  const internalAdmin = isInternalAdminEmail(user.email, env);

  if (!user.email_verified_at && !internalAdmin) {
    return toJson(
      {
        error: 'Please verify your email before signing in. You can request a new verification link if needed.',
        code: 'EMAIL_VERIFICATION_REQUIRED',
        email: user.email,
        nextStep: 'verify_email',
      },
      403
    );
  }

  await env.DB
    .prepare('UPDATE users SET token_version = COALESCE(token_version, 0) + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .bind(user.id)
    .run();
  const nextTokenVersion = Number(user.token_version || 0) + 1;

  const token = await signJwt(
    { userId: user.id, email: user.email, tokenVersion: nextTokenVersion || 1 },
    env.JWT_SECRET,
    expiresInSeconds(env)
  );
  const entitlement = internalAdmin
    ? internalAdminEntitlement()
    : await getEntitlement(env.DB, user.id, true);
  return toJson(
    {
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        role: internalAdmin ? 'admin' : user.role,
        createdAt: user.created_at,
        emailVerified: internalAdmin ? true : !!user.email_verified_at,
        subscription: entitlement,
      },
    },
    200,
    { 'Set-Cookie': cookieHeader(token, expiresInSeconds(env)) }
  );
}

async function readAuthedUser(request: Request, env: Env): Promise<UserRow | null> {
  const cookies = parseCookies(request);
  const token = cookies.token;
  if (!token) return null;
  const payload = await verifyJwt(token, env.JWT_SECRET);
  if (!payload) return null;
  const userId = Number(payload.userId || 0);
  const tokenVersion = Number(payload.tokenVersion || 0);
  if (!userId || !tokenVersion) return null;
  const user = await env.DB
    .prepare(
      `SELECT id, email, password_hash, display_name, role, account_status, email_verified_at, token_version, created_at
              , stripe_customer_id
       FROM users
       WHERE id = ?
       LIMIT 1`
    )
    .bind(userId)
    .first<UserRow>();
  if (!user) return null;
  if ((user.token_version || 0) !== tokenVersion) return null;
  if (user.account_status === 'disabled') return null;
  return user;
}

async function handleMe(request: Request, env: Env): Promise<Response> {
  const user = await readAuthedUser(request, env);
  if (!user) return toJson({ error: 'Authentication required' }, 401);
  const internalAdmin = isInternalAdminEmail(user.email, env);
  const emailVerified = internalAdmin ? true : !!user.email_verified_at;
  const entitlement = internalAdmin
    ? internalAdminEntitlement()
    : await getEntitlement(env.DB, user.id, emailVerified);
  return toJson({
    user: {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      role: internalAdmin ? 'admin' : user.role,
      createdAt: user.created_at,
      emailVerified,
      subscription: entitlement,
    },
  });
}

async function handleLogout(request: Request, env: Env): Promise<Response> {
  const user = await readAuthedUser(request, env);
  if (user) {
    await env.DB
      .prepare('UPDATE users SET token_version = COALESCE(token_version, 0) + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(user.id)
      .run();
  }
  return toJson({ message: 'Logout successful' }, 200, { 'Set-Cookie': clearCookieHeader() });
}

async function handleCreateCheckoutSession(request: Request, env: Env): Promise<Response> {
  const user = await readAuthedUser(request, env);
  if (!user) return toJson({ error: 'Authentication required' }, 401);
  if (!user.email_verified_at && !isInternalAdminEmail(user.email, env)) {
    return toJson({ error: 'Email verification required', code: 'EMAIL_VERIFICATION_REQUIRED', email: user.email }, 403);
  }

  const body = await readJson<{ plan?: BillingPlanInterval }>(request);
  const plan = body?.plan;
  if (plan !== 'monthly' && plan !== 'yearly') {
    return toJson({ error: 'Validation failed: plan must be monthly or yearly' }, 400);
  }

  try {
    const checkoutUrl = await createCheckoutSession(env, user, plan);
    return toJson({ checkoutUrl, plan });
  } catch (error: any) {
    if (error?.code === 'MANAGE_IN_PORTAL_REQUIRED') {
      return toJson({ error: 'Manage existing subscription in portal', code: 'MANAGE_IN_PORTAL_REQUIRED' }, 409);
    }
    return toJson({ error: error?.message || 'Unable to create checkout session' }, 500);
  }
}

async function handleCreatePortalSession(request: Request, env: Env): Promise<Response> {
  const user = await readAuthedUser(request, env);
  if (!user) return toJson({ error: 'Authentication required' }, 401);
  if (!user.email_verified_at && !isInternalAdminEmail(user.email, env)) {
    return toJson({ error: 'Email verification required', code: 'EMAIL_VERIFICATION_REQUIRED', email: user.email }, 403);
  }

  try {
    const portalUrl = await createPortalSession(env, user);
    return toJson({ portalUrl });
  } catch (error: any) {
    return toJson({ error: error?.message || 'Unable to create billing portal session' }, 500);
  }
}

async function processStripeEvent(env: Env, event: any): Promise<void> {
  const type = String(event?.type || '');
  const object = event?.data?.object || {};

  if (type === 'checkout.session.completed') {
    const customerId = typeof object.customer === 'string' ? object.customer : object.customer?.id;
    const subscriptionId = typeof object.subscription === 'string' ? object.subscription : object.subscription?.id;
    const userId = await resolveUserIdFromStripeData(
      env,
      customerId,
      object?.metadata?.user_id || object?.client_reference_id
    );
    if (!userId) return;

    if (customerId) {
      await env.DB
        .prepare('UPDATE users SET stripe_customer_id = COALESCE(stripe_customer_id, ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .bind(customerId, userId)
        .run();
    }

    const planCodeHint = object?.metadata?.plan_code || (
      object?.metadata?.plan_interval === 'monthly'
        ? 'full-access-monthly'
        : object?.metadata?.plan_interval === 'yearly'
          ? 'full-access-yearly'
          : null
    );

    await upsertSubscriptionFromStripe(env, {
      userId,
      stripeCustomerId: customerId || null,
      stripeSubscriptionId: subscriptionId || null,
      checkoutSessionId: object?.id ? String(object.id) : null,
      stripeStatus: 'active',
      planCodeHint,
    });
    return;
  }

  if (type === 'customer.subscription.created' || type === 'customer.subscription.updated' || type === 'customer.subscription.deleted') {
    const customerId = typeof object.customer === 'string' ? object.customer : object.customer?.id;
    const subscriptionId = object?.id ? String(object.id) : null;
    const status = type === 'customer.subscription.deleted' ? 'canceled' : String(object?.status || '');
    const priceId = object?.items?.data?.[0]?.price?.id ? String(object.items.data[0].price.id) : null;
    const planCodeHint = object?.metadata?.plan_code || (
      object?.metadata?.plan_interval === 'monthly'
        ? 'full-access-monthly'
        : object?.metadata?.plan_interval === 'yearly'
          ? 'full-access-yearly'
          : null
    );
    const userId = await resolveUserIdFromStripeData(env, customerId, object?.metadata?.user_id || null);
    if (!userId) return;

    if (customerId) {
      await env.DB
        .prepare('UPDATE users SET stripe_customer_id = COALESCE(stripe_customer_id, ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .bind(customerId, userId)
        .run();
    }

    await upsertSubscriptionFromStripe(env, {
      userId,
      stripeCustomerId: customerId || null,
      stripeSubscriptionId: subscriptionId,
      stripePriceId: priceId,
      stripeStatus: status,
      currentPeriodStartUnix: Number(object?.current_period_start || 0) || null,
      currentPeriodEndUnix: Number(object?.current_period_end || 0) || null,
      cancelAtPeriodEnd: !!object?.cancel_at_period_end,
      canceledAtUnix: Number(object?.canceled_at || 0) || null,
      planCodeHint,
    });
    return;
  }

  if (type === 'invoice.payment_failed' || type === 'invoice.paid') {
    const customerId = typeof object.customer === 'string' ? object.customer : object.customer?.id;
    const subscriptionId = typeof object.subscription === 'string' ? object.subscription : object.subscription?.id;
    const priceId = object?.lines?.data?.[0]?.price?.id ? String(object.lines.data[0].price.id) : null;
    const periodStart = Number(object?.lines?.data?.[0]?.period?.start || 0) || null;
    const periodEnd = Number(object?.lines?.data?.[0]?.period?.end || 0) || null;
    const userId = await resolveUserIdFromStripeData(env, customerId, object?.metadata?.user_id || null);
    if (!userId) return;

    await upsertSubscriptionFromStripe(env, {
      userId,
      stripeCustomerId: customerId || null,
      stripeSubscriptionId: subscriptionId || null,
      stripePriceId: priceId,
      stripeStatus: type === 'invoice.paid' ? 'active' : 'past_due',
      currentPeriodStartUnix: periodStart,
      currentPeriodEndUnix: periodEnd,
    });
  }
}

async function handleStripeWebhook(request: Request, env: Env): Promise<Response> {
  const webhookSecret = (env.STRIPE_WEBHOOK_SECRET || '').trim();
  if (!webhookSecret) {
    return toJson({ error: 'Stripe webhook is not configured' }, 500);
  }

  const signature = request.headers.get('stripe-signature') || '';
  if (!signature) return toJson({ error: 'Missing stripe-signature header' }, 400);

  const payload = await request.text();
  const validSignature = await verifyStripeWebhookSignature(payload, signature, webhookSecret);
  if (!validSignature) return toJson({ error: 'Invalid Stripe signature' }, 400);

  let event: any;
  try {
    event = JSON.parse(payload);
  } catch {
    return toJson({ error: 'Invalid webhook payload' }, 400);
  }

  const eventId = String(event?.id || '');
  const eventType = String(event?.type || '');
  if (!eventId || !eventType) return toJson({ error: 'Invalid event envelope' }, 400);

  const inserted = await env.DB
    .prepare(
      `INSERT OR IGNORE INTO stripe_webhook_events (stripe_event_id, event_type, status)
       VALUES (?, ?, 'received')`
    )
    .bind(eventId, eventType)
    .run();

  if (Number(inserted.meta.changes || 0) === 0) {
    return toJson({ received: true, duplicate: true });
  }

  try {
    await processStripeEvent(env, event);
    await env.DB
      .prepare(
        `UPDATE stripe_webhook_events
         SET status = 'processed', processed_at = CURRENT_TIMESTAMP, error_message = NULL
         WHERE stripe_event_id = ?`
      )
      .bind(eventId)
      .run();
    return toJson({ received: true });
  } catch (error: any) {
    await env.DB
      .prepare(
        `UPDATE stripe_webhook_events
         SET status = 'failed', processed_at = CURRENT_TIMESTAMP, error_message = ?
         WHERE stripe_event_id = ?`
      )
      .bind(String(error?.message || 'Unknown webhook processing error').slice(0, 900), eventId)
      .run();
    return toJson({ error: 'Webhook processing failed' }, 500);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') return optionsResponse(request, env);

    let response: Response;
    try {
      const url = new URL(request.url);
      const path = url.pathname;

      if (request.method === 'GET' && path === '/health') {
        response = toJson({ status: 'ok', timestamp: nowIso(), runtime: 'cloudflare-worker-d1' });
        return withCors(request, response, env);
      }

      if (request.method === 'POST' && path === '/webhooks/stripe') {
        // Stripe does not require CORS; this endpoint validates Stripe signatures.
        response = await handleStripeWebhook(request, env);
        return response;
      }

      if (request.method === 'POST' && path === '/auth/register') {
        response = await handleRegister(request, env);
        return withCors(request, response, env);
      }

      if (request.method === 'POST' && path === '/auth/login') {
        response = await handleLogin(request, env);
        return withCors(request, response, env);
      }

      if (request.method === 'POST' && path === '/auth/logout') {
        response = await handleLogout(request, env);
        return withCors(request, response, env);
      }

      if (request.method === 'GET' && path === '/auth/me') {
        response = await handleMe(request, env);
        return withCors(request, response, env);
      }

      if (request.method === 'POST' && path === '/billing/create-checkout-session') {
        response = await handleCreateCheckoutSession(request, env);
        return withCors(request, response, env);
      }

      if (request.method === 'POST' && path === '/billing/create-portal-session') {
        response = await handleCreatePortalSession(request, env);
        return withCors(request, response, env);
      }

      // Compatibility helpers used by current frontend verification screen
      if (request.method === 'POST' && path === '/auth/verify-email') {
        response = await handleVerifyEmail(request, env);
        return withCors(request, response, env);
      }
      if (request.method === 'POST' && path === '/auth/resend-verification') {
        response = await handleResendVerification(request, env);
        return withCors(request, response, env);
      }
      if (request.method === 'POST' && path === '/auth/forgot-password') {
        response = await handleForgotPassword(request, env);
        return withCors(request, response, env);
      }
      if (request.method === 'POST' && path === '/auth/reset-password') {
        response = await handleResetPassword(request, env);
        return withCors(request, response, env);
      }
      // Temporary operational route: disable by setting ENABLE_ADMIN_TEST_EMAIL=false (or removing this block).
      if (request.method === 'GET' && path === '/admin/test-email') {
        response = await handleAdminTestEmail(request, env);
        return withCors(request, response, env);
      }

      response = toJson({ error: 'Route not found' }, 404);
      return withCors(request, response, env);
    } catch (error) {
      console.error('Worker error:', error);
      response = toJson({ error: 'Internal server error' }, 500);
      return withCors(request, response, env);
    }
  },
};

