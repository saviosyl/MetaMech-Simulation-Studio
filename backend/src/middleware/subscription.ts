import { Request, Response, NextFunction } from 'express';
import { query } from '../database';
import { SubscriptionEntitlement } from '../types';

type RawSubscription = {
  status: 'pending_verification' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired';
  plan_code: string | null;
  current_period_start: Date | null;
  current_period_end: Date | null;
};

export async function getUserSubscriptionEntitlement(userId: number, emailVerified?: boolean): Promise<SubscriptionEntitlement> {
  const result = await query(
    `SELECT status, plan_code, current_period_start, current_period_end
     FROM subscriptions
     WHERE user_id = $1
     ORDER BY updated_at DESC
     LIMIT 1`,
    [userId]
  );

  if (result.rows.length === 0) {
    const requiresEmailVerification = emailVerified === false;
    return {
      status: requiresEmailVerification ? 'pending_verification' : 'none',
      entitled: false,
      requiresEmailVerification,
      planCode: null,
      currentPeriodStart: null,
      currentPeriodEnd: null,
    };
  }

  const sub = result.rows[0] as RawSubscription;
  const now = new Date();
  const periodEnd = sub.current_period_end ? new Date(sub.current_period_end) : null;
  const periodExpired = !!periodEnd && periodEnd <= now;

  const effectiveStatus: SubscriptionEntitlement['status'] =
    periodExpired && (sub.status === 'active' || sub.status === 'trialing')
      ? 'expired'
      : sub.status;

  const requiresEmailVerification = emailVerified === false || effectiveStatus === 'pending_verification';
  const entitled = !requiresEmailVerification && (effectiveStatus === 'active' || effectiveStatus === 'trialing') && !periodExpired;

  return {
    status: effectiveStatus,
    entitled,
    requiresEmailVerification,
    planCode: sub.plan_code ?? null,
    currentPeriodStart: sub.current_period_start ? new Date(sub.current_period_start).toISOString() : null,
    currentPeriodEnd: periodEnd ? periodEnd.toISOString() : null,
  };
}

export async function requireActiveSubscription(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const entitlement = await getUserSubscriptionEntitlement(req.user.id, !!req.user.email_verified_at);

    if (entitlement.requiresEmailVerification) {
      return res.status(403).json({
        error: 'Email verification required before trial or subscription access',
        code: 'EMAIL_VERIFICATION_REQUIRED',
        email: req.user.email,
        subscription: entitlement,
      });
    }

    if (!entitlement.entitled) {
      return res.status(402).json({
        error: 'Active subscription required',
        code: 'SUBSCRIPTION_REQUIRED',
        subscription: entitlement,
      });
    }

    next();
  } catch (error) {
    console.error('Subscription middleware error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
