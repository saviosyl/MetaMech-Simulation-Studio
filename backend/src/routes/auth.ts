import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';
import { query } from '../database';
import { authenticateToken } from '../middleware/auth';
import { JWTPayload, SubscriptionEntitlement } from '../types';
import { getUserSubscriptionEntitlement } from '../middleware/subscription';

const router = Router();
type JwtExpiresIn = NonNullable<jwt.SignOptions['expiresIn']>;

function resolveJwtExpiresIn(): JwtExpiresIn {
  const raw = (process.env.JWT_EXPIRES_IN || '7d').trim();
  // Accept numeric seconds or compact duration strings supported by jsonwebtoken/ms.
  if (!/^\d+(ms|s|m|h|d|w|y)?$/i.test(raw)) {
    throw new Error(`Invalid JWT_EXPIRES_IN value: ${raw}`);
  }
  return raw as Extract<JwtExpiresIn, string>;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function frontendBaseUrl(): string {
  return (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
}

function verificationTokenTtlHours(): number {
  const parsed = Number(process.env.EMAIL_VERIFICATION_TOKEN_HOURS || 24);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 24;
}

function exposeDevVerificationLink(): boolean {
  return process.env.NODE_ENV !== 'production' && process.env.EXPOSE_DEV_VERIFICATION_LINK === 'true';
}

function trialIdentitySalt(): string {
  const base = process.env.TRIAL_IDENTITY_SALT || process.env.JWT_SECRET || 'metamech-dev-trial-salt';
  return base;
}

function hashIdentityEmail(email: string): string {
  return crypto.createHmac('sha256', trialIdentitySalt()).update(normalizeEmail(email)).digest('hex');
}

function setAuthCookie(res: Response, token: string) {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

async function issueEmailVerificationToken(userId: number): Promise<string> {
  const tokenRaw = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(tokenRaw).digest('hex');
  const expiresAt = new Date(Date.now() + verificationTokenTtlHours() * 60 * 60 * 1000);

  await query(
    'UPDATE email_verification_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL',
    [userId]
  );

  await query(
    'INSERT INTO email_verification_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [userId, tokenHash, expiresAt]
  );

  return `${frontendBaseUrl()}/verify-email?token=${tokenRaw}`;
}

type TrialGrantResult = {
  granted: boolean;
  reason: 'granted' | 'already_used' | 'identity_conflict' | 'not_applicable';
  entitlement: SubscriptionEntitlement;
};

async function startOneDayTrialIfEligible(userId: number, email: string): Promise<TrialGrantResult> {
  const userResult = await query(
    'SELECT trial_used_at FROM users WHERE id = $1 LIMIT 1',
    [userId]
  );

  if (userResult.rows.length === 0) {
    return {
      granted: false,
      reason: 'not_applicable',
      entitlement: await getUserSubscriptionEntitlement(userId, true),
    };
  }

  const userRow = userResult.rows[0] as { trial_used_at: Date | null };
  const emailHash = hashIdentityEmail(email);
  const ledger = await query(
    'SELECT first_user_id FROM trial_identity_ledger WHERE email_hash = $1 LIMIT 1',
    [emailHash]
  );

  if (userRow.trial_used_at) {
    const entitlement = await getUserSubscriptionEntitlement(userId, true);
    return { granted: false, reason: 'already_used', entitlement };
  }

  if (ledger.rows.length > 0 && Number(ledger.rows[0].first_user_id) !== userId) {
    await query(
      'UPDATE users SET trial_used_at = NOW(), updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND trial_used_at IS NULL',
      [userId]
    );
    await query(
      `UPDATE subscriptions
       SET status = 'expired', current_period_end = NOW(), updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND status = 'pending_verification'`,
      [userId]
    );
    const entitlement = await getUserSubscriptionEntitlement(userId, true);
    return { granted: false, reason: 'identity_conflict', entitlement };
  }

  const ledgerInsert = await query(
    `INSERT INTO trial_identity_ledger (email_hash, first_user_id, trial_consumed_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (email_hash) DO NOTHING
     RETURNING first_user_id`,
    [emailHash, userId]
  );

  if (ledgerInsert.rows.length === 0) {
    const existingLedger = await query(
      'SELECT first_user_id FROM trial_identity_ledger WHERE email_hash = $1 LIMIT 1',
      [emailHash]
    );
    if (existingLedger.rows.length > 0 && Number(existingLedger.rows[0].first_user_id) !== userId) {
      await query(
        'UPDATE users SET trial_used_at = NOW(), updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND trial_used_at IS NULL',
        [userId]
      );
      await query(
        `UPDATE subscriptions
         SET status = 'expired', current_period_end = NOW(), updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $1 AND status = 'pending_verification'`,
        [userId]
      );
      const entitlement = await getUserSubscriptionEntitlement(userId, true);
      return { granted: false, reason: 'identity_conflict', entitlement };
    }
  }

  await query(
    'UPDATE users SET trial_used_at = NOW(), updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND trial_used_at IS NULL',
    [userId]
  );

  await query(
    `UPDATE subscriptions
     SET status = 'trialing',
         plan_code = COALESCE(plan_code, 'trial-1d'),
         current_period_start = NOW(),
         current_period_end = NOW() + INTERVAL '1 day',
         trial_started_at = NOW(),
         trial_ends_at = NOW() + INTERVAL '1 day',
         updated_at = CURRENT_TIMESTAMP
     WHERE user_id = $1 AND status = 'pending_verification'`,
    [userId]
  );

  const entitlement = await getUserSubscriptionEntitlement(userId, true);
  return { granted: true, reason: 'granted', entitlement };
}

// Validation schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(1).max(255)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const forgotPasswordSchema = z.object({
  email: z.string().email()
});

const resendVerificationSchema = z.object({
  email: z.string().email()
});

const verifyEmailSchema = z.object({
  token: z.string().min(1)
});

const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8)
});

// Register
router.post('/register', async (req, res) => {
  try {
    const parsed = registerSchema.parse(req.body);
    const email = normalizeEmail(parsed.email);
    const { password, displayName } = parsed;

    // Check if user already exists
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const result = await query(
      `INSERT INTO users (email, password_hash, display_name)
       VALUES ($1, $2, $3)
       RETURNING id, email, display_name, role, created_at`,
      [email, passwordHash, displayName]
    );

    const user = result.rows[0];

    // New accounts must verify email before trial starts
    await query(
      `INSERT INTO subscriptions (user_id, status, plan_code, current_period_start, current_period_end)
       VALUES ($1, 'pending_verification', 'trial-1d', NULL, NULL)
       ON CONFLICT (user_id) DO NOTHING`,
      [user.id]
    );

    const verifyLink = await issueEmailVerificationToken(user.id);

    res.status(201).json({
      message: 'Account created. Verify your email to start your 1-day trial.',
      requiresEmailVerification: true,
      email: user.email,
      ...(exposeDevVerificationLink() ? { devVerificationLink: verifyLink } : {}),
    });
  } catch (error) {
    console.error('Register error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const parsed = loginSchema.parse(req.body);
    const email = normalizeEmail(parsed.email);
    const { password } = parsed;

    // Find user
    const result = await query(
      `SELECT id, email, password_hash, display_name, role, account_status, email_verified_at, token_version, created_at
       FROM users
       WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    if (user.account_status === 'disabled') {
      return res.status(403).json({ error: 'Account disabled' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.email_verified_at) {
      return res.status(403).json({
        error: 'Please verify your email before signing in. You can request a new verification link if needed.',
        code: 'EMAIL_VERIFICATION_REQUIRED',
        email: user.email,
        nextStep: 'verify_email',
      });
    }

    // Create JWT token
    const payload: JWTPayload = { userId: user.id, email: user.email, tokenVersion: user.token_version ?? 1 };
    const expiresIn = resolveJwtExpiresIn();
    const token = jwt.sign(payload, process.env.JWT_SECRET!, {
      expiresIn
    });

    setAuthCookie(res, token);

    const subscription = await getUserSubscriptionEntitlement(user.id, true);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        role: user.role,
        createdAt: user.created_at,
        emailVerified: true,
        subscription,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logout successful' });
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  const emailVerified = !!req.user!.email_verified_at;
  const subscription = await getUserSubscriptionEntitlement(req.user!.id, emailVerified);
  res.json({
    user: {
      id: req.user!.id,
      email: req.user!.email,
      displayName: req.user!.display_name,
      role: req.user!.role,
      createdAt: req.user!.created_at,
      emailVerified,
      subscription,
    },
  });
});

// Resend email verification
router.post('/resend-verification', async (req, res) => {
  try {
    const parsed = resendVerificationSchema.parse(req.body);
    const email = normalizeEmail(parsed.email);
    const userResult = await query(
      'SELECT id, email_verified_at FROM users WHERE email = $1 LIMIT 1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.json({ message: 'If an account with that email exists, a verification link has been sent.' });
    }

    const user = userResult.rows[0] as { id: number; email_verified_at: Date | null };
    if (user.email_verified_at) {
      return res.json({ message: 'Email is already verified. You can sign in now.', alreadyVerified: true });
    }

    const verifyLink = await issueEmailVerificationToken(user.id);

    return res.json({
      message: 'If an account with that email exists, a verification link has been sent.',
      ...(exposeDevVerificationLink() ? { devVerificationLink: verifyLink } : {}),
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify email and start one-time 1-day trial
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = verifyEmailSchema.parse(req.body);
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const tokenResult = await query(
      `SELECT id, user_id
       FROM email_verification_tokens
       WHERE token_hash = $1
         AND expires_at > NOW()
         AND used_at IS NULL
       LIMIT 1`,
      [tokenHash]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    const verificationRow = tokenResult.rows[0] as { id: number; user_id: number };
    const userResult = await query(
      'SELECT id, email, email_verified_at FROM users WHERE id = $1 LIMIT 1',
      [verificationRow.user_id]
    );
    if (userResult.rows.length === 0) {
      return res.status(400).json({ error: 'Verification target account not found' });
    }

    const user = userResult.rows[0] as { id: number; email: string; email_verified_at: Date | null };

    await query('UPDATE email_verification_tokens SET used_at = NOW() WHERE id = $1', [verificationRow.id]);
    await query(
      'UPDATE users SET email_verified_at = COALESCE(email_verified_at, NOW()), updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );
    await query(
      'UPDATE email_verification_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL',
      [user.id]
    );

    const trialResult = await startOneDayTrialIfEligible(user.id, user.email);
    const verifyMessage =
      trialResult.reason === 'granted'
        ? 'Email verified successfully. Your 1-day trial is now active.'
        : trialResult.reason === 'already_used'
          ? 'Email verified successfully. Your previous trial has already been used. Sign in to continue with subscription access.'
          : trialResult.reason === 'identity_conflict'
            ? 'Email verified successfully. This identity already consumed a trial previously. Sign in to continue with subscription access.'
            : 'Email verified successfully.';

    return res.json({
      message: verifyMessage,
      emailVerified: true,
      trialGranted: trialResult.granted,
      trialReason: trialResult.reason,
      subscription: trialResult.entitlement,
    });
  } catch (error) {
    console.error('Verify email error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Forgot password
router.post('/forgot-password', async (req, res) => {
  try {
    const parsed = forgotPasswordSchema.parse(req.body);
    const email = normalizeEmail(parsed.email);

    // Check if user exists
    const userResult = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      // Don't reveal if email exists or not for security
      return res.json({ message: 'If an account with that email exists, we sent a password reset link.' });
    }

    const userId = userResult.rows[0].id as number;
    const resetTokenRaw = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(resetTokenRaw).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Invalidate previous unused tokens
    await query(
      'UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL',
      [userId]
    );

    // Store hashed reset token
    await query(
      'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [userId, tokenHash, expiresAt]
    );

    // TODO: Send email with link via transactional email provider
    const resetLink = `${frontendBaseUrl()}/reset-password?token=${resetTokenRaw}`;

    if (process.env.NODE_ENV !== 'production' && process.env.EXPOSE_DEV_RESET_LINK === 'true') {
      return res.json({
        message: 'If an account with that email exists, we sent a password reset link.',
        devResetLink: resetLink,
      });
    }

    res.json({ message: 'If an account with that email exists, we sent a password reset link.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = resetPasswordSchema.parse(req.body);

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Check if token exists, not used, and not expired
    const tokenResult = await query(
      `SELECT id, user_id
       FROM password_reset_tokens
       WHERE token_hash = $1
         AND expires_at > NOW()
         AND used_at IS NULL`,
      [tokenHash]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const resetRow = tokenResult.rows[0];
    const userId = resetRow.user_id as number;

    // Hash new password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Update password
    await query(
      'UPDATE users SET password_hash = $1, token_version = token_version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [passwordHash, userId]
    );

    // Mark this token and all other active tokens as used
    await query('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1', [resetRow.id]);
    await query('UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL', [userId]);

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;