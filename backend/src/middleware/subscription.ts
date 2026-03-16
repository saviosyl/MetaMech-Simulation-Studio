import { Request, Response, NextFunction } from 'express';
import { query } from '../database';
import { SubscriptionEntitlement } from '../types';

type RawSubscription = {
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired';
  plan_code: string | null;
  current_period_start: Date | null;
  current_period_end: Date | null;
};

export async function getUserSubscriptionEntitlement(userId: number): Promise<SubscriptionEntitlement> {
  const result = await query(
    `SELECT status, plan_code, current_period_start, current_period_end
     FROM subscriptions
     WHERE user_id = $1
     ORDER BY updated_at DESC
     LIMIT 1`,
    [userId]
  );

  if (result.rows.length === 0) {
    return {
      status: 'none',
      entitled: false,
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

  const entitled = (effectiveStatus === 'active' || effectiveStatus === 'trialing') && !periodExpired;

  return {
    status: effectiveStatus,
    entitled,
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

    const entitlement = await getUserSubscriptionEntitlement(req.user.id);

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
