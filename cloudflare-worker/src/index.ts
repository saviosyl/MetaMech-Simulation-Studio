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

      if (request.method === 'POST' && path === '/auth/register') {
        response = await handleRegister(request, env);
        return withCors(request, response, env);
      }

      // Backward-compatible aliases for legacy frontend paths that prepend /api.
      if (request.method === 'POST' && path === '/api/auth/register') {
        response = await handleRegister(request, env);
        return withCors(request, response, env);
      }

      if (request.method === 'POST' && path === '/auth/login') {
        response = await handleLogin(request, env);
        return withCors(request, response, env);
      }

      if (request.method === 'POST' && path === '/api/auth/login') {
        response = await handleLogin(request, env);
        return withCors(request, response, env);
      }

      if (request.method === 'POST' && path === '/auth/logout') {
        response = await handleLogout();
        return withCors(request, response, env);
      }

      if (request.method === 'POST' && path === '/api/auth/logout') {
        response = await handleLogout();
        return withCors(request, response, env);
      }

      if (request.method === 'GET' && path === '/auth/me') {
        response = await handleMe(request, env);
        return withCors(request, response, env);
      }

      if (request.method === 'GET' && path === '/api/auth/me') {
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

      response = toJson({ error: 'Route not found' }, 404);
      return withCors(request, response, env);
    } catch (error) {
      console.error('Worker error:', error);
      response = toJson({ error: 'Internal server error' }, 500);
      return withCors(request, response, env);
    }
  },
};

