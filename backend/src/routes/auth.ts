import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';
import { query } from '../database';
import { authenticateToken } from '../middleware/auth';
import { JWTPayload } from '../types';
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

function setAuthCookie(res: Response, token: string) {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
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
       RETURNING id, email, display_name, role, token_version, created_at`,
      [email, passwordHash, displayName]
    );

    const user = result.rows[0];

    // Create default trial subscription for new user
    await query(
      `INSERT INTO subscriptions (user_id, status, plan_code, current_period_start, current_period_end)
       VALUES ($1, 'trialing', 'phase1-manual', NOW(), NOW() + INTERVAL '14 days')
       ON CONFLICT (user_id) DO NOTHING`,
      [user.id]
    );

    const subscription = await getUserSubscriptionEntitlement(user.id);

    // Create JWT token
    const payload: JWTPayload = { userId: user.id, email: user.email, tokenVersion: user.token_version ?? 1 };
    const expiresIn = resolveJwtExpiresIn();
    const token = jwt.sign(payload, process.env.JWT_SECRET!, {
      expiresIn
    });

    setAuthCookie(res, token);

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        role: user.role,
        createdAt: user.created_at,
        subscription,
      },
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
      `SELECT id, email, password_hash, display_name, role, account_status, token_version, created_at
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

    // Create JWT token
    const payload: JWTPayload = { userId: user.id, email: user.email, tokenVersion: user.token_version ?? 1 };
    const expiresIn = resolveJwtExpiresIn();
    const token = jwt.sign(payload, process.env.JWT_SECRET!, {
      expiresIn
    });

    setAuthCookie(res, token);

    const subscription = await getUserSubscriptionEntitlement(user.id);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        role: user.role,
        createdAt: user.created_at,
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
  const subscription = await getUserSubscriptionEntitlement(req.user!.id);
  res.json({
    user: {
      id: req.user!.id,
      email: req.user!.email,
      displayName: req.user!.display_name,
      role: req.user!.role,
      createdAt: req.user!.created_at,
      subscription,
    },
  });
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