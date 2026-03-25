type UserRow = {
  id: number;
  email: string;
  password_hash: string;
  display_name: string;
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

type AssetCategoryRow = {
  id: number;
  name: string;
  slug: string;
  description: string;
  scene_category: string;
  sort_order: number;
  is_archived: number;
  created_at: string;
  updated_at: string;
};

type AssetRow = {
  id: number;
  uuid: string;
  name: string;
  slug: string;
  category_id: number;
  status: 'draft' | 'published' | 'archived';
  lifecycle_state: AssetLifecycleState | null;
  visible_in_runtime_library: number;
  version: number;
  sort_order: number;
  model_r2_key: string;
  model_url: string;
  thumbnail_r2_key: string | null;
  thumbnail_url: string | null;
  preview_r2_key: string | null;
  preview_url: string | null;
  description: string;
  tags: string;
  metadata: string;
  published_at: string | null;
  archived_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  category_name?: string;
  category_slug?: string;
  category_scene_category?: string;
};

type AssetLifecycleState = 'draft' | 'internal' | 'live' | 'archived' | 'deleted';
const ASSET_LIFECYCLE_STATES: AssetLifecycleState[] = ['draft', 'internal', 'live', 'archived', 'deleted'];
const ASSET_LIFECYCLE_SET = new Set<AssetLifecycleState>(ASSET_LIFECYCLE_STATES);

type SceneCategory =
  | 'process'
  | 'modular'
  | 'environment'
  | 'actors'
  | 'robots'
  | 'pallets'
  | 'fmcg'
  | 'medical';

type Env = {
  DB: D1Database;
  ASSETS_BUCKET: R2Bucket;
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
  ASSETS_PUBLIC_BASE_URL?: string;
};

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

async function safeReadFormData(request: Request): Promise<FormData | null> {
  try {
    return await request.formData();
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

  if (!user.email_verified_at) {
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

  const token = await signJwt(
    { userId: user.id, email: user.email, tokenVersion: user.token_version || 1 },
    env.JWT_SECRET,
    expiresInSeconds(env)
  );
  const entitlement = await getEntitlement(env.DB, user.id, true);
  return toJson(
    {
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        role: user.role,
        createdAt: user.created_at,
        emailVerified: true,
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

const SCENE_CATEGORIES: SceneCategory[] = [
  'process',
  'modular',
  'environment',
  'actors',
  'robots',
  'pallets',
  'fmcg',
  'medical',
];
const SCENE_CATEGORY_SET = new Set<SceneCategory>(SCENE_CATEGORIES);

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'asset';
}

function asSceneCategory(input: string | null | undefined): SceneCategory {
  const value = (input || '').trim().toLowerCase() as SceneCategory;
  return SCENE_CATEGORY_SET.has(value) ? value : 'process';
}

function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function normalizeTags(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input
      .map((tag) => String(tag || '').trim())
      .filter((tag) => tag.length > 0)
      .slice(0, 50);
  }
  if (typeof input === 'string') {
    return input
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0)
      .slice(0, 50);
  }
  return [];
}

function normalizeMetadata(input: unknown): Record<string, unknown> {
  if (!input) return {};
  if (typeof input === 'string') {
    return safeJsonParse<Record<string, unknown>>(input, {});
  }
  if (typeof input === 'object' && !Array.isArray(input)) {
    return input as Record<string, unknown>;
  }
  return {};
}

function asAssetLifecycleState(input: unknown): AssetLifecycleState | null {
  const value = String(input || '').trim().toLowerCase() as AssetLifecycleState;
  return ASSET_LIFECYCLE_SET.has(value) ? value : null;
}

function deriveLifecycleState(row: Pick<AssetRow, 'lifecycle_state' | 'status' | 'visible_in_runtime_library' | 'deleted_at'>): AssetLifecycleState {
  const explicit = asAssetLifecycleState(row.lifecycle_state);
  if (explicit) return explicit;
  if (row.deleted_at) return 'deleted';
  if (row.status === 'archived') return 'archived';
  if (row.status === 'published') return Number(row.visible_in_runtime_library) === 1 ? 'live' : 'internal';
  return 'draft';
}

function statusFromLifecycle(lifecycleState: AssetLifecycleState): AssetRow['status'] {
  if (lifecycleState === 'live' || lifecycleState === 'internal') return 'published';
  if (lifecycleState === 'archived' || lifecycleState === 'deleted') return 'archived';
  return 'draft';
}

function isRuntimeLiveLifecycle(lifecycleState: AssetLifecycleState): boolean {
  return lifecycleState === 'live';
}

function validLifecycleTransition(fromState: AssetLifecycleState, toState: AssetLifecycleState): boolean {
  if (fromState === toState) return true;
  if (fromState === 'draft') return ['internal', 'live', 'archived', 'deleted'].includes(toState);
  if (fromState === 'internal') return ['draft', 'live', 'archived', 'deleted'].includes(toState);
  if (fromState === 'live') return ['internal', 'archived', 'deleted'].includes(toState);
  if (fromState === 'archived') return ['draft', 'internal', 'live', 'deleted'].includes(toState);
  if (fromState === 'deleted') return ['draft'].includes(toState);
  return false;
}

function lifecycleSqlExpr(alias: string): string {
  return `COALESCE(${alias}.lifecycle_state, CASE WHEN ${alias}.deleted_at IS NOT NULL THEN 'deleted' WHEN ${alias}.status = 'archived' THEN 'archived' WHEN ${alias}.status = 'published' AND ${alias}.visible_in_runtime_library = 1 THEN 'live' WHEN ${alias}.status = 'published' THEN 'internal' ELSE 'draft' END)`;
}

async function requireAdminUser(request: Request, env: Env): Promise<UserRow | null> {
  const user = await readAuthedUser(request, env);
  if (!user) return null;
  if (user.role !== 'admin') return null;
  return user;
}

async function uniqueCategorySlug(env: Env, baseName: string, exceptId?: number): Promise<string> {
  const base = slugify(baseName || 'category');
  let attempt = base;
  let idx = 2;
  while (true) {
    const existing = await env.DB
      .prepare('SELECT id FROM asset_categories WHERE slug = ? LIMIT 1')
      .bind(attempt)
      .first<{ id: number }>();
    if (!existing || (exceptId && Number(existing.id) === exceptId)) return attempt;
    attempt = `${base}-${idx++}`;
  }
}

async function uniqueAssetSlug(env: Env, baseName: string, exceptId?: number): Promise<string> {
  const base = slugify(baseName || 'asset');
  let attempt = base;
  let idx = 2;
  while (true) {
    const existing = await env.DB
      .prepare('SELECT id FROM assets WHERE slug = ? LIMIT 1')
      .bind(attempt)
      .first<{ id: number }>();
    if (!existing || (exceptId && Number(existing.id) === exceptId)) return attempt;
    attempt = `${base}-${idx++}`;
  }
}

function assetObjectUrl(request: Request, kind: 'model' | 'thumbnail' | 'preview', assetUuid: string, version: number): string {
  const base = new URL(request.url).origin;
  return `${base}/assets/published/${encodeURIComponent(assetUuid)}/${kind}?v=${version}`;
}

function serializeCategory(row: AssetCategoryRow): Record<string, unknown> {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    sceneCategory: row.scene_category,
    sortOrder: row.sort_order,
    isArchived: !!row.is_archived,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function serializeAsset(row: AssetRow, request: Request): Record<string, unknown> {
  const tags = safeJsonParse<string[]>(row.tags, []);
  const metadata = safeJsonParse<Record<string, unknown>>(row.metadata, {});
  const base = new URL(request.url).origin;
  const publishedModelUrl = assetObjectUrl(request, 'model', row.uuid, row.version);
  const publishedThumbnailUrl = row.thumbnail_r2_key ? assetObjectUrl(request, 'thumbnail', row.uuid, row.version) : null;
  const publishedPreviewUrl = row.preview_r2_key ? assetObjectUrl(request, 'preview', row.uuid, row.version) : null;
  const adminModelUrl = `${base}/admin/assets/${encodeURIComponent(row.uuid)}/model`;
  const adminThumbnailUrl = row.thumbnail_r2_key
    ? `${base}/admin/assets/${encodeURIComponent(row.uuid)}/thumbnail`
    : null;
  const adminPreviewUrl = row.preview_r2_key
    ? `${base}/admin/assets/${encodeURIComponent(row.uuid)}/preview`
    : null;
  const lifecycleState = deriveLifecycleState(row);
  const usePublished = !row.deleted_at && isRuntimeLiveLifecycle(lifecycleState);
  return {
    id: row.uuid,
    dbId: row.id,
    name: row.name,
    slug: row.slug,
    status: row.status,
    lifecycleState,
    visibleInRuntimeLibrary: isRuntimeLiveLifecycle(lifecycleState),
    version: row.version,
    sortOrder: row.sort_order,
    categoryId: row.category_id,
    categoryName: row.category_name ?? null,
    categorySlug: row.category_slug ?? null,
    sceneCategory: row.category_scene_category ?? 'process',
    modelKey: row.model_r2_key,
    modelUrl: usePublished ? publishedModelUrl : adminModelUrl,
    thumbnailKey: row.thumbnail_r2_key,
    thumbnailUrl: usePublished ? publishedThumbnailUrl : adminThumbnailUrl,
    previewKey: row.preview_r2_key,
    previewUrl: usePublished ? publishedPreviewUrl : adminPreviewUrl,
    description: row.description,
    tags,
    metadata,
    publishedAt: row.published_at,
    archivedAt: row.archived_at,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function readCategoryById(env: Env, categoryId: number): Promise<AssetCategoryRow | null> {
  return env.DB
    .prepare(
      `SELECT id, name, slug, description, scene_category, sort_order, is_archived, created_at, updated_at
       FROM asset_categories
       WHERE id = ?
       LIMIT 1`
    )
    .bind(categoryId)
    .first<AssetCategoryRow>();
}

async function readAssetByUuid(env: Env, assetUuid: string): Promise<AssetRow | null> {
  return env.DB
    .prepare(
      `SELECT a.id, a.uuid, a.name, a.slug, a.category_id, a.status, a.version, a.sort_order,
              a.visible_in_runtime_library,
              a.model_r2_key, a.model_url, a.thumbnail_r2_key, a.thumbnail_url, a.preview_r2_key, a.preview_url,
              a.description, a.tags, a.metadata, a.published_at, a.archived_at, a.deleted_at, a.created_at, a.updated_at,
              c.name AS category_name, c.slug AS category_slug, c.scene_category AS category_scene_category
       FROM assets a
       JOIN asset_categories c ON c.id = a.category_id
       WHERE a.uuid = ?
       LIMIT 1`
    )
    .bind(assetUuid)
    .first<AssetRow>();
}

function validateMetadataForPublish(metadata: Record<string, unknown>): string | null {
  const nodes = Array.isArray(metadata.nodes) ? metadata.nodes : [];
  const ids = new Set<string>();
  for (const entry of nodes) {
    if (!entry || typeof entry !== 'object') continue;
    const id = String((entry as Record<string, unknown>).id || '').trim();
    if (!id) continue;
    if (ids.has(id)) return `Duplicate node id: ${id}`;
    ids.add(id);
  }
  return null;
}

async function handleAdminListCategories(request: Request, env: Env, admin: UserRow): Promise<Response> {
  const url = new URL(request.url);
  const includeArchived = url.searchParams.get('includeArchived') === 'true';
  const rows = await env.DB
    .prepare(
      `SELECT id, name, slug, description, scene_category, sort_order, is_archived, created_at, updated_at
       FROM asset_categories
       ${includeArchived ? '' : 'WHERE is_archived = 0'}
       ORDER BY sort_order ASC, id ASC`
    )
    .all<AssetCategoryRow>();
  return toJson({
    categories: (rows.results || []).map(serializeCategory),
    adminUserId: admin.id,
  });
}

async function handleAdminCreateCategory(request: Request, env: Env, admin: UserRow): Promise<Response> {
  const body = await readJson<{ name?: string; description?: string; sceneCategory?: string }>(request);
  const name = (body?.name || '').trim();
  if (!name) return toJson({ error: 'Category name is required' }, 400);
  const slug = await uniqueCategorySlug(env, name);
  const description = (body?.description || '').trim();
  const sceneCategory = asSceneCategory(body?.sceneCategory);
  const maxOrder = await env.DB
    .prepare('SELECT COALESCE(MAX(sort_order), 0) AS max_order FROM asset_categories')
    .first<{ max_order: number }>();
  const sortOrder = Number(maxOrder?.max_order || 0) + 1;

  const inserted = await env.DB
    .prepare(
      `INSERT INTO asset_categories
       (name, slug, description, scene_category, sort_order, is_archived, created_by, updated_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
    )
    .bind(name, slug, description, sceneCategory, sortOrder, admin.id, admin.id)
    .run();
  const row = await readCategoryById(env, Number(inserted.meta.last_row_id));
  return toJson({ category: row ? serializeCategory(row) : null }, 201);
}

async function handleAdminUpdateCategory(
  request: Request,
  env: Env,
  admin: UserRow,
  categoryId: number
): Promise<Response> {
  const existing = await readCategoryById(env, categoryId);
  if (!existing) return toJson({ error: 'Category not found' }, 404);
  const body = await readJson<{ name?: string; description?: string; sceneCategory?: string; isArchived?: boolean }>(request);
  const nextName = (body?.name ?? existing.name).trim();
  if (!nextName) return toJson({ error: 'Category name is required' }, 400);
  const slug = nextName === existing.name ? existing.slug : await uniqueCategorySlug(env, nextName, existing.id);
  const nextDescription = (body?.description ?? existing.description).trim();
  const nextSceneCategory = body?.sceneCategory ? asSceneCategory(body.sceneCategory) : asSceneCategory(existing.scene_category);
  const nextArchived = typeof body?.isArchived === 'boolean' ? (body.isArchived ? 1 : 0) : existing.is_archived;

  await env.DB
    .prepare(
      `UPDATE asset_categories
       SET name = ?, slug = ?, description = ?, scene_category = ?, is_archived = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
    .bind(nextName, slug, nextDescription, nextSceneCategory, nextArchived, admin.id, existing.id)
    .run();

  const row = await readCategoryById(env, existing.id);
  return toJson({ category: row ? serializeCategory(row) : null });
}

async function handleAdminDeleteCategory(env: Env, categoryId: number): Promise<Response> {
  const inUse = await env.DB
    .prepare('SELECT COUNT(*) AS count FROM assets WHERE category_id = ?')
    .bind(categoryId)
    .first<{ count: number }>();
  if (Number(inUse?.count || 0) > 0) {
    return toJson({ error: 'Cannot delete category while it still contains assets. Move/delete those assets first.' }, 400);
  }
  await env.DB.prepare('DELETE FROM asset_categories WHERE id = ?').bind(categoryId).run();
  return toJson({ success: true });
}

async function handleAdminReorderCategories(request: Request, env: Env, admin: UserRow): Promise<Response> {
  const body = await readJson<{ orderedIds?: number[] }>(request);
  const orderedIds = Array.isArray(body?.orderedIds) ? body!.orderedIds.map((v) => Number(v)).filter((v) => Number.isFinite(v) && v > 0) : [];
  if (orderedIds.length === 0) return toJson({ error: 'orderedIds is required' }, 400);
  for (let i = 0; i < orderedIds.length; i += 1) {
    await env.DB
      .prepare('UPDATE asset_categories SET sort_order = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(i + 1, admin.id, orderedIds[i])
      .run();
  }
  return toJson({ success: true });
}

async function handleAdminListAssets(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const includeDeleted = url.searchParams.get('includeDeleted') === 'true';
  const status = (url.searchParams.get('status') || '').trim();
  const categoryId = Number(url.searchParams.get('categoryId') || 0);
  const tag = (url.searchParams.get('tag') || '').trim().toLowerCase();
  const q = (url.searchParams.get('q') || '').trim().toLowerCase();

  const clauses: string[] = [];
  const binds: unknown[] = [];
  if (!includeDeleted) clauses.push('a.deleted_at IS NULL');
  if (status) {
    clauses.push('a.status = ?');
    binds.push(status);
  }
  if (categoryId > 0) {
    clauses.push('a.category_id = ?');
    binds.push(categoryId);
  }
  if (tag) {
    clauses.push('LOWER(a.tags) LIKE ?');
    binds.push(`%"${tag}"%`);
  }
  if (q) {
    clauses.push('(LOWER(a.name) LIKE ? OR LOWER(a.description) LIKE ?)');
    binds.push(`%${q}%`, `%${q}%`);
  }
  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = await env.DB
    .prepare(
      `SELECT a.id, a.uuid, a.name, a.slug, a.category_id, a.status, a.version, a.sort_order,
              a.visible_in_runtime_library,
              a.model_r2_key, a.model_url, a.thumbnail_r2_key, a.thumbnail_url, a.preview_r2_key, a.preview_url,
              a.description, a.tags, a.metadata, a.published_at, a.archived_at, a.deleted_at, a.created_at, a.updated_at,
              c.name AS category_name, c.slug AS category_slug, c.scene_category AS category_scene_category
       FROM assets a
       JOIN asset_categories c ON c.id = a.category_id
       ${where}
       ORDER BY a.sort_order ASC, a.updated_at DESC, a.id DESC`
    )
    .bind(...binds)
    .all<AssetRow>();
  return toJson({ assets: (rows.results || []).map((row) => serializeAsset(row, request)) });
}

async function handleAdminReorderAssets(request: Request, env: Env, admin: UserRow): Promise<Response> {
  const body = await readJson<{ orderedIds?: string[]; categoryId?: number }>(request);
  const orderedIds = Array.isArray(body?.orderedIds)
    ? body!.orderedIds.map((v) => String(v || '').trim()).filter((v) => v.length > 0)
    : [];
  if (orderedIds.length === 0) return toJson({ error: 'orderedIds is required' }, 400);
  const categoryId = Number(body?.categoryId || 0);

  for (let i = 0; i < orderedIds.length; i += 1) {
    if (categoryId > 0) {
      await env.DB
        .prepare(
          `UPDATE assets
           SET sort_order = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
           WHERE uuid = ? AND category_id = ?`
        )
        .bind(i + 1, admin.id, orderedIds[i], categoryId)
        .run();
    } else {
      await env.DB
        .prepare(
          `UPDATE assets
           SET sort_order = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
           WHERE uuid = ?`
        )
        .bind(i + 1, admin.id, orderedIds[i])
        .run();
    }
  }
  return toJson({ success: true });
}

async function handleAdminUploadAsset(request: Request, env: Env, admin: UserRow): Promise<Response> {
  const form = await request.formData();
  const model = form.get('model');
  if (!(model instanceof File)) return toJson({ error: 'model file is required' }, 400);
  const categoryId = Number(form.get('categoryId') || 0);
  if (!categoryId) return toJson({ error: 'categoryId is required' }, 400);
  const category = await readCategoryById(env, categoryId);
  if (!category) return toJson({ error: 'Category not found' }, 404);

  const sourceName = String(form.get('name') || model.name || 'Unnamed Asset').trim();
  const name = sourceName || 'Unnamed Asset';
  const slug = await uniqueAssetSlug(env, name);
  const description = String(form.get('description') || '').trim();
  const tags = normalizeTags(form.get('tags'));
  const metadata = normalizeMetadata(form.get('metadata'));
  const uuid = crypto.randomUUID();
  const ext = (model.name.split('.').pop() || '').toLowerCase();
  if (ext && ext !== 'glb') {
    return toJson({ error: 'Only .glb uploads are supported in v1' }, 400);
  }

  const key = `assets/${category.slug}/${uuid}/v1/model.glb`;
  const bytes = await model.arrayBuffer();
  await env.ASSETS_BUCKET.put(key, bytes, {
    httpMetadata: {
      contentType: model.type || 'model/gltf-binary',
    },
  });

  const maxOrder = await env.DB
    .prepare('SELECT COALESCE(MAX(sort_order), 0) AS max_order FROM assets')
    .first<{ max_order: number }>();
  const sortOrder = Number(maxOrder?.max_order || 0) + 1;

  await env.DB
    .prepare(
      `INSERT INTO assets
       (uuid, name, slug, category_id, status, lifecycle_state, version, sort_order, model_r2_key, model_url, description, tags, metadata, created_by, updated_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'draft', 'draft', 0, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
    )
    .bind(
      uuid,
      name,
      slug,
      categoryId,
      sortOrder,
      key,
      key,
      description,
      JSON.stringify(tags),
      JSON.stringify(metadata),
      admin.id,
      admin.id
    )
    .run();

  const row = await readAssetByUuid(env, uuid);
  return toJson({ asset: row ? serializeAsset(row, request) : null }, 201);
}

async function handleAdminUpdateAsset(
  request: Request,
  env: Env,
  admin: UserRow,
  assetUuid: string
): Promise<Response> {
  const existing = await readAssetByUuid(env, assetUuid);
  if (!existing || existing.deleted_at) return toJson({ error: 'Asset not found' }, 404);
  const body = await readJson<{
    name?: string;
    description?: string;
    tags?: unknown;
    metadata?: unknown;
    categoryId?: number;
    sortOrder?: number;
  }>(request);
  const nextName = String(body?.name ?? existing.name).trim();
  if (!nextName) return toJson({ error: 'Asset name is required' }, 400);
  const slug = nextName === existing.name ? existing.slug : await uniqueAssetSlug(env, nextName, existing.id);
  const nextDescription = String(body?.description ?? existing.description).trim();
  const nextCategoryId = Number(body?.categoryId || existing.category_id);
  if (!nextCategoryId) return toJson({ error: 'categoryId is required' }, 400);
  const category = await readCategoryById(env, nextCategoryId);
  if (!category) return toJson({ error: 'Category not found' }, 404);
  const nextSortOrder = Number.isFinite(Number(body?.sortOrder))
    ? Number(body?.sortOrder)
    : existing.sort_order;
  const tags = body?.tags === undefined ? safeJsonParse<string[]>(existing.tags, []) : normalizeTags(body.tags);
  const metadata = body?.metadata === undefined
    ? safeJsonParse<Record<string, unknown>>(existing.metadata, {})
    : normalizeMetadata(body.metadata);

  await env.DB
    .prepare(
      `UPDATE assets
       SET name = ?, slug = ?, category_id = ?, description = ?, tags = ?, metadata = ?, sort_order = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
    .bind(
      nextName,
      slug,
      nextCategoryId,
      nextDescription,
      JSON.stringify(tags),
      JSON.stringify(metadata),
      nextSortOrder,
      admin.id,
      existing.id
    )
    .run();

  const row = await readAssetByUuid(env, assetUuid);
  return toJson({ asset: row ? serializeAsset(row, request) : null });
}

async function handleAdminPublishAsset(env: Env, request: Request, admin: UserRow, assetUuid: string): Promise<Response> {
  const existing = await readAssetByUuid(env, assetUuid);
  if (!existing || existing.deleted_at) return toJson({ error: 'Asset not found' }, 404);
  const fromState = deriveLifecycleState(existing);
  if (!validLifecycleTransition(fromState, 'internal')) {
    return toJson({ error: `Invalid lifecycle transition: ${fromState} -> internal` }, 400);
  }
  const metadata = safeJsonParse<Record<string, unknown>>(existing.metadata, {});
  const validationError = validateMetadataForPublish(metadata);
  if (validationError) return toJson({ error: validationError }, 400);

  const nextVersion = Number(existing.version || 0) + 1;
  await env.DB
    .prepare(
      `UPDATE assets
       SET status = 'published',
           lifecycle_state = 'internal',
           visible_in_runtime_library = 0,
           version = ?,
           published_at = CURRENT_TIMESTAMP,
           archived_at = NULL,
           updated_by = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
    .bind(nextVersion, admin.id, existing.id)
    .run();

  await env.DB
    .prepare(
      `INSERT INTO asset_versions
       (asset_id, version, name, slug, category_id, status, model_r2_key, model_url, thumbnail_r2_key, thumbnail_url, preview_r2_key, preview_url, description, tags, metadata, published_by, published_at, created_at)
       VALUES (?, ?, ?, ?, ?, 'published', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
    )
    .bind(
      existing.id,
      nextVersion,
      existing.name,
      existing.slug,
      existing.category_id,
      existing.model_r2_key,
      existing.model_url,
      existing.thumbnail_r2_key,
      existing.thumbnail_url,
      existing.preview_r2_key,
      existing.preview_url,
      existing.description,
      existing.tags,
      existing.metadata,
      admin.id
    )
    .run();

  const row = await readAssetByUuid(env, assetUuid);
  return toJson({ asset: row ? serializeAsset(row, request) : null });
}

async function handleAdminSetAssetRuntimeVisibility(
  env: Env,
  request: Request,
  admin: UserRow,
  assetUuid: string
): Promise<Response> {
  const existing = await readAssetByUuid(env, assetUuid);
  if (!existing || existing.deleted_at) return toJson({ error: 'Asset not found' }, 404);
  const currentLifecycle = deriveLifecycleState(existing);
  if (existing.status !== 'published' || !['internal', 'live'].includes(currentLifecycle)) {
    return toJson({ error: 'Only internal/live assets can be shown in runtime library' }, 400);
  }
  const body = await readJson<{ visibleInRuntimeLibrary?: boolean }>(request);
  if (typeof body?.visibleInRuntimeLibrary !== 'boolean') {
    return toJson({ error: 'visibleInRuntimeLibrary boolean is required' }, 400);
  }
  const nextLifecycle: AssetLifecycleState = body.visibleInRuntimeLibrary ? 'live' : 'internal';
  if (!validLifecycleTransition(currentLifecycle, nextLifecycle)) {
    return toJson({ error: `Invalid lifecycle transition: ${currentLifecycle} -> ${nextLifecycle}` }, 400);
  }
  await env.DB
    .prepare(
      `UPDATE assets
       SET lifecycle_state = ?,
           visible_in_runtime_library = ?,
           updated_by = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
    .bind(nextLifecycle, body.visibleInRuntimeLibrary ? 1 : 0, admin.id, existing.id)
    .run();
  const row = await readAssetByUuid(env, assetUuid);
  return toJson({ asset: row ? serializeAsset(row, request) : null });
}

async function handleAdminArchiveAsset(env: Env, request: Request, admin: UserRow, assetUuid: string): Promise<Response> {
  const existing = await readAssetByUuid(env, assetUuid);
  if (!existing || existing.deleted_at) return toJson({ error: 'Asset not found' }, 404);
  const fromState = deriveLifecycleState(existing);
  if (!validLifecycleTransition(fromState, 'archived')) {
    return toJson({ error: `Invalid lifecycle transition: ${fromState} -> archived` }, 400);
  }
  await env.DB
    .prepare(
      `UPDATE assets
       SET status = 'archived',
           lifecycle_state = 'archived',
           visible_in_runtime_library = 0,
           archived_at = CURRENT_TIMESTAMP,
           updated_by = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
    .bind(admin.id, existing.id)
    .run();
  const row = await readAssetByUuid(env, assetUuid);
  return toJson({ asset: row ? serializeAsset(row, request) : null });
}

async function handleAdminRestoreAsset(env: Env, request: Request, admin: UserRow, assetUuid: string): Promise<Response> {
  const existing = await readAssetByUuid(env, assetUuid);
  if (!existing) return toJson({ error: 'Asset not found' }, 404);
  const fromState = deriveLifecycleState(existing);
  if (!validLifecycleTransition(fromState, 'draft')) {
    return toJson({ error: `Invalid lifecycle transition: ${fromState} -> draft` }, 400);
  }
  await env.DB
    .prepare(
      `UPDATE assets
       SET status = 'draft',
           lifecycle_state = 'draft',
           visible_in_runtime_library = 0,
           archived_at = NULL,
           deleted_at = NULL,
           updated_by = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
    .bind(admin.id, existing.id)
    .run();
  const row = await readAssetByUuid(env, assetUuid);
  return toJson({ asset: row ? serializeAsset(row, request) : null });
}

async function handleAdminDuplicateAsset(env: Env, request: Request, admin: UserRow, assetUuid: string): Promise<Response> {
  const source = await readAssetByUuid(env, assetUuid);
  if (!source || source.deleted_at) return toJson({ error: 'Asset not found' }, 404);
  const category = await readCategoryById(env, source.category_id);
  if (!category) return toJson({ error: 'Category not found' }, 404);
  const object = await env.ASSETS_BUCKET.get(source.model_r2_key);
  if (!object) return toJson({ error: 'Source model file missing in storage' }, 400);

  const duplicateName = `${source.name} Copy`;
  const duplicateSlug = await uniqueAssetSlug(env, duplicateName);
  const uuid = crypto.randomUUID();
  const key = `assets/${category.slug}/${uuid}/v1/model.glb`;
  await env.ASSETS_BUCKET.put(key, await object.arrayBuffer(), {
    httpMetadata: {
      contentType: object.httpMetadata?.contentType || 'model/gltf-binary',
    },
  });
  const maxOrder = await env.DB
    .prepare('SELECT COALESCE(MAX(sort_order), 0) AS max_order FROM assets')
    .first<{ max_order: number }>();
  const sortOrder = Number(maxOrder?.max_order || 0) + 1;

  await env.DB
    .prepare(
      `INSERT INTO assets
       (uuid, name, slug, category_id, status, lifecycle_state, visible_in_runtime_library, version, sort_order, model_r2_key, model_url, thumbnail_r2_key, thumbnail_url, preview_r2_key, preview_url, description, tags, metadata, created_by, updated_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'draft', 'draft', 0, 0, ?, ?, ?, NULL, NULL, NULL, NULL, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
    )
    .bind(
      uuid,
      duplicateName,
      duplicateSlug,
      source.category_id,
      sortOrder,
      key,
      key,
      source.description,
      source.tags,
      source.metadata,
      admin.id,
      admin.id
    )
    .run();

  const row = await readAssetByUuid(env, uuid);
  return toJson({ asset: row ? serializeAsset(row, request) : null }, 201);
}

async function handleAdminSoftDeleteAsset(env: Env, admin: UserRow, assetUuid: string): Promise<Response> {
  const existing = await readAssetByUuid(env, assetUuid);
  if (!existing || existing.deleted_at) return toJson({ error: 'Asset not found' }, 404);
  const fromState = deriveLifecycleState(existing);
  if (!validLifecycleTransition(fromState, 'deleted')) {
    return toJson({ error: `Invalid lifecycle transition: ${fromState} -> deleted` }, 400);
  }
  await env.DB
    .prepare(
      `UPDATE assets
       SET status = 'archived',
           lifecycle_state = 'deleted',
           visible_in_runtime_library = 0,
           deleted_at = CURRENT_TIMESTAMP,
           archived_at = COALESCE(archived_at, CURRENT_TIMESTAMP),
           updated_by = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
    .bind(admin.id, existing.id)
    .run();
  return toJson({ success: true });
}

async function handleAdminUploadThumbnail(env: Env, request: Request, admin: UserRow, assetUuid: string): Promise<Response> {
  const existing = await readAssetByUuid(env, assetUuid);
  if (!existing || existing.deleted_at) return toJson({ error: 'Asset not found' }, 404);
  const category = await readCategoryById(env, existing.category_id);
  if (!category) return toJson({ error: 'Category not found' }, 404);
  const form = await request.formData();
  const thumbnail = form.get('thumbnail');
  if (!(thumbnail instanceof File)) return toJson({ error: 'thumbnail file is required' }, 400);
  const ext = (thumbnail.name.split('.').pop() || 'png').toLowerCase();
  if (!['png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
    return toJson({ error: 'Only png/jpg/webp thumbnails are supported' }, 400);
  }
  const key = `assets/${category.slug}/${existing.uuid}/v${Math.max(1, existing.version)}/thumbnail.${ext}`;
  await env.ASSETS_BUCKET.put(key, await thumbnail.arrayBuffer(), {
    httpMetadata: {
      contentType: thumbnail.type || `image/${ext === 'jpg' ? 'jpeg' : ext}`,
    },
  });
  await env.DB
    .prepare(
      `UPDATE assets
       SET thumbnail_r2_key = ?, thumbnail_url = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
    .bind(key, key, admin.id, existing.id)
    .run();
  const row = await readAssetByUuid(env, assetUuid);
  return toJson({ asset: row ? serializeAsset(row, request) : null });
}

async function handleAdminAssetFile(
  env: Env,
  assetUuid: string,
  kind: 'model' | 'thumbnail' | 'preview'
): Promise<Response> {
  const row = await env.DB
    .prepare(
      `SELECT uuid, deleted_at, model_r2_key, thumbnail_r2_key, preview_r2_key
       FROM assets
       WHERE uuid = ?
       LIMIT 1`
    )
    .bind(assetUuid)
    .first<{
      uuid: string;
      deleted_at: string | null;
      model_r2_key: string;
      thumbnail_r2_key: string | null;
      preview_r2_key: string | null;
    }>();
  if (!row || row.deleted_at) return toJson({ error: 'Asset not found' }, 404);
  const key = kind === 'model' ? row.model_r2_key : (kind === 'thumbnail' ? row.thumbnail_r2_key : row.preview_r2_key);
  if (!key) return toJson({ error: 'File not found' }, 404);
  const object = await env.ASSETS_BUCKET.get(key);
  if (!object) return toJson({ error: 'File not found' }, 404);

  const headers = new Headers();
  headers.set('Cache-Control', 'private, max-age=60');
  const contentType = object.httpMetadata?.contentType
    || (kind === 'model' ? 'model/gltf-binary' : 'application/octet-stream');
  headers.set('Content-Type', contentType);
  return new Response(object.body, { status: 200, headers });
}

async function handlePublishedAssets(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const sceneCategoryFilter = (url.searchParams.get('sceneCategory') || '').trim();
  const clauses = [
    "COALESCE(a.lifecycle_state, CASE WHEN a.deleted_at IS NOT NULL THEN 'deleted' WHEN a.status = 'archived' THEN 'archived' WHEN a.status = 'published' AND a.visible_in_runtime_library = 1 THEN 'live' WHEN a.status = 'published' THEN 'internal' ELSE 'draft' END) = 'live'",
    'a.deleted_at IS NULL',
    'c.is_archived = 0',
  ];
  const binds: unknown[] = [];
  if (sceneCategoryFilter) {
    clauses.push('c.scene_category = ?');
    binds.push(asSceneCategory(sceneCategoryFilter));
  }
  const rows = await env.DB
    .prepare(
      `SELECT a.id, a.uuid, a.name, a.slug, a.category_id, a.status, a.lifecycle_state, a.version, a.sort_order,
              a.visible_in_runtime_library,
              a.model_r2_key, a.model_url, a.thumbnail_r2_key, a.thumbnail_url, a.preview_r2_key, a.preview_url,
              a.description, a.tags, a.metadata, a.published_at, a.archived_at, a.deleted_at, a.created_at, a.updated_at,
              c.name AS category_name, c.slug AS category_slug, c.scene_category AS category_scene_category
       FROM assets a
       JOIN asset_categories c ON c.id = a.category_id
       WHERE ${clauses.join(' AND ')}
       ORDER BY c.sort_order ASC, a.sort_order ASC, a.name ASC`
    )
    .bind(...binds)
    .all<AssetRow>();

  const serialized = (rows.results || []).map((row) => serializeAsset(row, request));
  return toJson({ assets: serialized });
}

async function handlePublishedAssetFile(request: Request, env: Env, assetUuid: string, kind: 'model' | 'thumbnail' | 'preview'): Promise<Response> {
  const row = await env.DB
    .prepare(
      `SELECT uuid, status, lifecycle_state, visible_in_runtime_library, deleted_at, model_r2_key, thumbnail_r2_key, preview_r2_key
       FROM assets
       WHERE uuid = ?
       LIMIT 1`
    )
    .bind(assetUuid)
    .first<{
      uuid: string;
      status: string;
      lifecycle_state: AssetLifecycleState | null;
      visible_in_runtime_library: number;
      deleted_at: string | null;
      model_r2_key: string;
      thumbnail_r2_key: string | null;
      preview_r2_key: string | null;
    }>();
  const lifecycleState = row
    ? deriveLifecycleState({
      lifecycle_state: row.lifecycle_state,
      status: row.status as AssetRow['status'],
      visible_in_runtime_library: row.visible_in_runtime_library,
      deleted_at: row.deleted_at,
    })
    : null;
  if (!row || row.deleted_at || lifecycleState !== 'live') {
    return toJson({ error: 'Asset not found' }, 404);
  }
  const key = kind === 'model' ? row.model_r2_key : (kind === 'thumbnail' ? row.thumbnail_r2_key : row.preview_r2_key);
  if (!key) return toJson({ error: 'File not found' }, 404);
  const object = await env.ASSETS_BUCKET.get(key);
  if (!object) return toJson({ error: 'File not found' }, 404);

  const headers = new Headers();
  headers.set('Cache-Control', 'public, max-age=300');
  const contentType = object.httpMetadata?.contentType
    || (kind === 'model' ? 'model/gltf-binary' : 'application/octet-stream');
  headers.set('Content-Type', contentType);
  return new Response(object.body, { status: 200, headers });
}

async function handleMe(request: Request, env: Env): Promise<Response> {
  const user = await readAuthedUser(request, env);
  if (!user) return toJson({ error: 'Authentication required' }, 401);
  const emailVerified = !!user.email_verified_at;
  const entitlement = await getEntitlement(env.DB, user.id, emailVerified);
  return toJson({
    user: {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      role: user.role,
      createdAt: user.created_at,
      emailVerified,
      subscription: entitlement,
    },
  });
}

async function handleLogout(): Promise<Response> {
  return toJson({ message: 'Logout successful' }, 200, { 'Set-Cookie': clearCookieHeader() });
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

      if (request.method === 'GET' && path === '/assets/published') {
        response = await handlePublishedAssets(request, env);
        return withCors(request, response, env);
      }
      const publishedFileMatch = path.match(/^\/assets\/published\/([^/]+)\/(model|thumbnail|preview)$/);
      if (request.method === 'GET' && publishedFileMatch) {
        const [, assetUuid, kind] = publishedFileMatch;
        response = await handlePublishedAssetFile(request, env, decodeURIComponent(assetUuid), kind as 'model' | 'thumbnail' | 'preview');
        return withCors(request, response, env);
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
        response = await handleLogout();
        return withCors(request, response, env);
      }

      if (request.method === 'GET' && path === '/auth/me') {
        response = await handleMe(request, env);
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

      const adminAssetFileMatch = path.match(/^\/admin\/assets\/([^/]+)\/(model|thumbnail|preview)$/);
      const categoryIdMatch = path.match(/^\/admin\/asset-categories\/(\d+)$/);
      const assetActionMatch = path.match(/^\/admin\/assets\/([^/]+)\/(publish|archive|restore|duplicate|thumbnail|set-runtime-visibility|set-lifecycle-state)$/);
      const assetIdMatch = path.match(/^\/admin\/assets\/([^/]+)$/);
      if (
        adminAssetFileMatch
        || 
        path === '/admin/asset-categories'
        || path === '/admin/asset-categories/reorder'
        || categoryIdMatch
        || path === '/admin/assets'
        || path === '/admin/assets/reorder'
        || path === '/admin/assets/upload'
        || assetActionMatch
        || assetIdMatch
      ) {
        const admin = await requireAdminUser(request, env);
        if (!admin) {
          response = toJson({ error: 'Admin access required' }, 403);
          return withCors(request, response, env);
        }

        if (adminAssetFileMatch && request.method === 'GET') {
          const assetUuid = decodeURIComponent(adminAssetFileMatch[1]);
          const kind = adminAssetFileMatch[2] as 'model' | 'thumbnail' | 'preview';
          response = await handleAdminAssetFile(env, assetUuid, kind);
          return withCors(request, response, env);
        }

        if (path === '/admin/asset-categories' && request.method === 'GET') {
          response = await handleAdminListCategories(request, env, admin);
          return withCors(request, response, env);
        }
        if (path === '/admin/asset-categories' && request.method === 'POST') {
          response = await handleAdminCreateCategory(request, env, admin);
          return withCors(request, response, env);
        }
        if (path === '/admin/asset-categories/reorder' && request.method === 'POST') {
          response = await handleAdminReorderCategories(request, env, admin);
          return withCors(request, response, env);
        }
        if (categoryIdMatch) {
          const categoryId = Number(categoryIdMatch[1]);
          if (request.method === 'PUT') {
            response = await handleAdminUpdateCategory(request, env, admin, categoryId);
            return withCors(request, response, env);
          }
          if (request.method === 'DELETE') {
            response = await handleAdminDeleteCategory(env, categoryId);
            return withCors(request, response, env);
          }
        }

        if (path === '/admin/assets' && request.method === 'GET') {
          response = await handleAdminListAssets(request, env);
          return withCors(request, response, env);
        }
        if (path === '/admin/assets/upload' && request.method === 'POST') {
          response = await handleAdminUploadAsset(request, env, admin);
          return withCors(request, response, env);
        }
        if (path === '/admin/assets/reorder' && request.method === 'POST') {
          response = await handleAdminReorderAssets(request, env, admin);
          return withCors(request, response, env);
        }
        if (assetActionMatch) {
          const assetUuid = decodeURIComponent(assetActionMatch[1]);
          const action = assetActionMatch[2];
          if (action === 'publish' && request.method === 'POST') {
            response = await handleAdminPublishAsset(env, request, admin, assetUuid);
            return withCors(request, response, env);
          }
          if (action === 'archive' && request.method === 'POST') {
            response = await handleAdminArchiveAsset(env, request, admin, assetUuid);
            return withCors(request, response, env);
          }
          if (action === 'restore' && request.method === 'POST') {
            response = await handleAdminRestoreAsset(env, request, admin, assetUuid);
            return withCors(request, response, env);
          }
          if (action === 'duplicate' && request.method === 'POST') {
            response = await handleAdminDuplicateAsset(env, request, admin, assetUuid);
            return withCors(request, response, env);
          }
          if (action === 'thumbnail' && request.method === 'POST') {
            response = await handleAdminUploadThumbnail(env, request, admin, assetUuid);
            return withCors(request, response, env);
          }
          if (action === 'set-runtime-visibility' && request.method === 'POST') {
            response = await handleAdminSetAssetRuntimeVisibility(env, request, admin, assetUuid);
            return withCors(request, response, env);
          }
          if (action === 'set-lifecycle-state' && request.method === 'POST') {
            response = await handleAdminSetAssetLifecycleState(env, request, admin, assetUuid);
            return withCors(request, response, env);
          }
        }
        if (assetIdMatch) {
          const assetUuid = decodeURIComponent(assetIdMatch[1]);
          if (request.method === 'PUT') {
            response = await handleAdminUpdateAsset(request, env, admin, assetUuid);
            return withCors(request, response, env);
          }
          if (request.method === 'DELETE') {
            response = await handleAdminSoftDeleteAsset(env, admin, assetUuid);
            return withCors(request, response, env);
          }
        }
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

