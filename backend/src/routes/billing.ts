import crypto from 'crypto';
import { Router } from 'express';
import { z } from 'zod';
import { query } from '../database';
import { authenticateToken } from '../middleware/auth';

type BillingPlanInterval = 'monthly' | 'yearly';

type StripeSubscriptionState = 'pending_verification' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired' | 'none';

const router = Router();

const createCheckoutSchema = z.object({
  plan: z.enum(['monthly', 'yearly']),
});

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function frontendBaseUrl(): string {
  return (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
}

function planCode(plan: BillingPlanInterval): string {
  return plan === 'monthly' ? 'full-access-monthly' : 'full-access-yearly';
}

function planLabel(plan: BillingPlanInterval): string {
  return plan === 'monthly'
    ? 'MetaMech Simulation – Monthly'
    : 'Subscribe to MetaMech Simulation – Yearly';
}

function planAmountCents(plan: BillingPlanInterval): string {
  return plan === 'monthly' ? '4900' : '49900';
}

function planInterval(plan: BillingPlanInterval): 'month' | 'year' {
  return plan === 'monthly' ? 'month' : 'year';
}

function configuredStripePriceId(plan: BillingPlanInterval): string {
  return ((plan === 'monthly'
    ? process.env.STRIPE_PRICE_MONTHLY_ID
    : process.env.STRIPE_PRICE_YEARLY_ID
  ) || '').trim();
}

function configuredStripePaymentLink(plan: BillingPlanInterval): string {
  const envLink = ((plan === 'monthly'
    ? process.env.STRIPE_PAYMENT_LINK_MONTHLY
    : process.env.STRIPE_PAYMENT_LINK_YEARLY
  ) || '').trim();

  if (envLink) return envLink;

  // Known production links retained as fallback if env vars are missing.
  return plan === 'monthly'
    ? 'https://buy.stripe.com/bJe4gy61J4254Atg5S2Nq02'
    : 'https://buy.stripe.com/9B6eVcbm3fKN4At06U2Nq03';
}

function stripeSecretKey(): string {
  return (process.env.STRIPE_SECRET_KEY || '').trim();
}

function stripeWebhookSecret(): string {
  return (process.env.STRIPE_WEBHOOK_SECRET || '').trim();
}

async function stripeRequest(
  method: 'GET' | 'POST',
  path: string,
  fields?: Record<string, string>
): Promise<any> {
  const secret = stripeSecretKey();
  if (!secret) {
    throw new Error('Stripe is not configured yet (missing STRIPE_SECRET_KEY).');
  }

  const body = fields ? new URLSearchParams(fields).toString() : undefined;
  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${secret}`,
      ...(fields ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    body,
  });

  const text = await response.text();
  let parsed: any = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }

  if (!response.ok) {
    const message = parsed?.error?.message || `Stripe request failed (${response.status})`;
    throw new Error(message);
  }
  return parsed;
}

async function getOrCreateStripeCustomer(user: {
  id: number;
  email: string;
  display_name: string;
  stripe_customer_id?: string | null;
}): Promise<string> {
  if (user.stripe_customer_id) return user.stripe_customer_id;

  const customer = await stripeRequest('POST', '/customers', {
    email: user.email,
    name: user.display_name,
    'metadata[user_id]': String(user.id),
  });

  const customerId = String(customer?.id || '');
  if (!customerId) throw new Error('Failed to create Stripe customer.');

  await query(
    'UPDATE users SET stripe_customer_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    [customerId, user.id]
  );

  return customerId;
}

async function hasBlockingStripeSubscription(userId: number): Promise<boolean> {
  const result = await query(
    `SELECT status, provider, provider_subscription_id
     FROM subscriptions
     WHERE user_id = $1
     LIMIT 1`,
    [userId]
  );
  if (result.rows.length === 0) return false;

  const row = result.rows[0] as {
    status: StripeSubscriptionState;
    provider: string | null;
    provider_subscription_id: string | null;
  };

  if (row.provider !== 'stripe' || !row.provider_subscription_id) return false;
  return row.status === 'active' || row.status === 'trialing' || row.status === 'past_due';
}

function parseStripeSignature(signatureHeader: string): { timestamp: string; signature: string } | null {
  const parts = signatureHeader.split(',').map((part) => part.trim());
  const timestamp = parts.find((part) => part.startsWith('t='))?.slice(2) || '';
  const signature = parts.find((part) => part.startsWith('v1='))?.slice(2) || '';
  if (!timestamp || !signature) return null;
  return { timestamp, signature };
}

function safeEqualHex(a: string, b: string): boolean {
  try {
    const left = Buffer.from(a, 'hex');
    const right = Buffer.from(b, 'hex');
    if (left.length !== right.length) return false;
    return crypto.timingSafeEqual(left, right);
  } catch {
    return false;
  }
}

function verifyStripeWebhook(rawPayload: string, signatureHeader: string, secret: string): boolean {
  const parsed = parseStripeSignature(signatureHeader);
  if (!parsed) return false;
  const signedPayload = `${parsed.timestamp}.${rawPayload}`;
  const expected = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
  return safeEqualHex(expected, parsed.signature);
}

function normalizeStripeStatus(status: string | null | undefined): StripeSubscriptionState {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'active') return 'active';
  if (normalized === 'trialing') return 'trialing';
  if (normalized === 'past_due' || normalized === 'unpaid' || normalized === 'incomplete') return 'past_due';
  if (normalized === 'canceled' || normalized === 'incomplete_expired') return 'canceled';
  return 'past_due';
}

async function resolveUserIdFromStripePayload(params: {
  metadataUserId?: string | null;
  stripeCustomerId?: string | null;
  customerEmail?: string | null;
}): Promise<number | null> {
  const fromMetadata = Number(params.metadataUserId || 0);
  if (fromMetadata > 0) return fromMetadata;

  if (params.stripeCustomerId) {
    const byCustomer = await query(
      'SELECT id FROM users WHERE stripe_customer_id = $1 LIMIT 1',
      [params.stripeCustomerId]
    );
    if (byCustomer.rows.length > 0) return Number(byCustomer.rows[0].id);
  }

  const email = normalizeEmail(params.customerEmail || '');
  if (email) {
    const byEmail = await query('SELECT id FROM users WHERE email = $1 LIMIT 1', [email]);
    if (byEmail.rows.length > 0) return Number(byEmail.rows[0].id);
  }

  return null;
}

async function upsertStripeSubscription(params: {
  userId: number;
  status: string | null | undefined;
  planCode: string | null;
  stripeSubscriptionId?: string | null;
  periodStartUnix?: number | null;
  periodEndUnix?: number | null;
  cancelAtPeriodEnd?: boolean;
}): Promise<void> {
  const normalizedStatus = normalizeStripeStatus(params.status);
  const periodStart = params.periodStartUnix ? new Date(params.periodStartUnix * 1000) : null;
  const periodEnd = params.periodEndUnix ? new Date(params.periodEndUnix * 1000) : null;

  await query(
    `INSERT INTO subscriptions (
       user_id, status, plan_code, current_period_start, current_period_end,
       cancel_at_period_end, provider, provider_subscription_id, updated_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, 'stripe', $7, CURRENT_TIMESTAMP)
     ON CONFLICT (user_id) DO UPDATE SET
       status = EXCLUDED.status,
       plan_code = COALESCE(EXCLUDED.plan_code, subscriptions.plan_code),
       current_period_start = COALESCE(EXCLUDED.current_period_start, subscriptions.current_period_start),
       current_period_end = COALESCE(EXCLUDED.current_period_end, subscriptions.current_period_end),
       cancel_at_period_end = EXCLUDED.cancel_at_period_end,
       provider = 'stripe',
       provider_subscription_id = COALESCE(EXCLUDED.provider_subscription_id, subscriptions.provider_subscription_id),
       updated_at = CURRENT_TIMESTAMP`,
    [
      params.userId,
      normalizedStatus,
      params.planCode,
      periodStart,
      periodEnd,
      params.cancelAtPeriodEnd ? true : false,
      params.stripeSubscriptionId || null,
    ]
  );
}

async function processStripeEvent(event: any): Promise<void> {
  const type = String(event?.type || '');
  const object = event?.data?.object || {};

  if (type === 'checkout.session.completed') {
    const stripeCustomerId = typeof object.customer === 'string' ? object.customer : object.customer?.id || null;
    const stripeSubscriptionId = typeof object.subscription === 'string' ? object.subscription : object.subscription?.id || null;
    const userId = await resolveUserIdFromStripePayload({
      metadataUserId: object?.metadata?.user_id || object?.client_reference_id || null,
      stripeCustomerId,
      customerEmail: object?.customer_details?.email || object?.customer_email || null,
    });
    if (!userId) return;

    if (stripeCustomerId) {
      await query(
        `UPDATE users
         SET stripe_customer_id = COALESCE(stripe_customer_id, $1), updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [stripeCustomerId, userId]
      );
    }

    const planFromMetadata = object?.metadata?.plan_interval === 'monthly'
      ? 'full-access-monthly'
      : object?.metadata?.plan_interval === 'yearly'
        ? 'full-access-yearly'
        : null;

    await upsertStripeSubscription({
      userId,
      status: 'active',
      planCode: object?.metadata?.plan_code || planFromMetadata,
      stripeSubscriptionId,
    });
    return;
  }

  if (type === 'customer.subscription.created' || type === 'customer.subscription.updated' || type === 'customer.subscription.deleted') {
    const stripeCustomerId = typeof object.customer === 'string' ? object.customer : object.customer?.id || null;
    const stripeSubscriptionId = object?.id ? String(object.id) : null;
    const userId = await resolveUserIdFromStripePayload({
      metadataUserId: object?.metadata?.user_id || null,
      stripeCustomerId,
    });
    if (!userId) return;

    const planFromMetadata = object?.metadata?.plan_interval === 'monthly'
      ? 'full-access-monthly'
      : object?.metadata?.plan_interval === 'yearly'
        ? 'full-access-yearly'
        : null;

    await upsertStripeSubscription({
      userId,
      status: type === 'customer.subscription.deleted' ? 'canceled' : String(object?.status || ''),
      planCode: object?.metadata?.plan_code || planFromMetadata,
      stripeSubscriptionId,
      periodStartUnix: Number(object?.current_period_start || 0) || null,
      periodEndUnix: Number(object?.current_period_end || 0) || null,
      cancelAtPeriodEnd: !!object?.cancel_at_period_end,
    });
    return;
  }

  if (type === 'invoice.paid' || type === 'invoice.payment_failed') {
    const stripeCustomerId = typeof object.customer === 'string' ? object.customer : object.customer?.id || null;
    const stripeSubscriptionId = typeof object.subscription === 'string' ? object.subscription : object.subscription?.id || null;
    const userId = await resolveUserIdFromStripePayload({
      metadataUserId: object?.metadata?.user_id || null,
      stripeCustomerId,
      customerEmail: object?.customer_email || null,
    });
    if (!userId) return;

    const periodStart = Number(object?.lines?.data?.[0]?.period?.start || 0) || null;
    const periodEnd = Number(object?.lines?.data?.[0]?.period?.end || 0) || null;

    await upsertStripeSubscription({
      userId,
      status: type === 'invoice.paid' ? 'active' : 'past_due',
      planCode: null,
      stripeSubscriptionId,
      periodStartUnix: periodStart,
      periodEndUnix: periodEnd,
    });
  }
}

router.post('/create-checkout-session', authenticateToken, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    if (!req.user.email_verified_at) {
      return res.status(403).json({
        error: 'Email verification required',
        code: 'EMAIL_VERIFICATION_REQUIRED',
        email: req.user.email,
      });
    }

    const { plan } = createCheckoutSchema.parse(req.body) as { plan: BillingPlanInterval };

    if (await hasBlockingStripeSubscription(req.user.id)) {
      return res.status(409).json({ error: 'Manage existing subscription in portal', code: 'MANAGE_IN_PORTAL_REQUIRED' });
    }

    const secret = stripeSecretKey();
    if (!secret) {
      return res.json({
        checkoutUrl: configuredStripePaymentLink(plan),
        plan,
        mode: 'payment_link_fallback',
      });
    }

    const customerId = await getOrCreateStripeCustomer(req.user as any);
    const successUrl = `${frontendBaseUrl()}/simulation/access?state=membership&checkout=success`;
    const cancelUrl = `${frontendBaseUrl()}/simulation/access?state=membership&checkout=cancel`;
    const configuredPrice = configuredStripePriceId(plan);

    const fields: Record<string, string> = {
      mode: 'subscription',
      customer: customerId,
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: String(req.user.id),
      'metadata[user_id]': String(req.user.id),
      'metadata[user_email]': req.user.email,
      'metadata[plan_interval]': plan,
      'metadata[plan_code]': planCode(plan),
      'subscription_data[metadata][user_id]': String(req.user.id),
      'subscription_data[metadata][plan_interval]': plan,
      'subscription_data[metadata][plan_code]': planCode(plan),
      allow_promotion_codes: 'true',
      'line_items[0][quantity]': '1',
    };

    if (configuredPrice) {
      fields['line_items[0][price]'] = configuredPrice;
    } else {
      fields['line_items[0][price_data][currency]'] = 'eur';
      fields['line_items[0][price_data][unit_amount]'] = planAmountCents(plan);
      fields['line_items[0][price_data][recurring][interval]'] = planInterval(plan);
      fields['line_items[0][price_data][product_data][name]'] = planLabel(plan);
    }

    const session = await stripeRequest('POST', '/checkout/sessions', fields);
    const checkoutUrl = String(session?.url || '');
    if (!checkoutUrl) throw new Error('Stripe checkout URL missing');

    const maybeSubscriptionId = typeof session?.subscription === 'string' ? session.subscription : null;
    await query(
      `UPDATE subscriptions
       SET plan_code = $1,
           provider = 'stripe',
           provider_subscription_id = COALESCE($2, provider_subscription_id),
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $3`,
      [planCode(plan), maybeSubscriptionId, req.user.id]
    );

    return res.json({ checkoutUrl, plan });
  } catch (error: any) {
    console.error('Create checkout session error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    return res.status(500).json({ error: error?.message || 'Unable to create checkout session' });
  }
});

router.post('/create-portal-session', authenticateToken, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    if (!req.user.email_verified_at) {
      return res.status(403).json({
        error: 'Email verification required',
        code: 'EMAIL_VERIFICATION_REQUIRED',
        email: req.user.email,
      });
    }

    const secret = stripeSecretKey();
    if (!secret) {
      return res.status(500).json({ error: 'Stripe billing portal is not configured yet.' });
    }

    const customerId = await getOrCreateStripeCustomer(req.user as any);
    const returnUrl = `${frontendBaseUrl()}/simulation/access?state=membership&portal=return`;
    const session = await stripeRequest('POST', '/billing_portal/sessions', {
      customer: customerId,
      return_url: returnUrl,
    });
    const portalUrl = String(session?.url || '');
    if (!portalUrl) throw new Error('Stripe portal URL missing');
    return res.json({ portalUrl });
  } catch (error: any) {
    console.error('Create billing portal session error:', error);
    return res.status(500).json({ error: error?.message || 'Unable to create billing portal session' });
  }
});

router.post('/webhooks/stripe', async (req, res) => {
  const webhookSecret = stripeWebhookSecret();
  if (!webhookSecret) {
    return res.status(500).json({ error: 'Stripe webhook is not configured' });
  }

  const signature = String(req.headers['stripe-signature'] || '');
  if (!signature) return res.status(400).json({ error: 'Missing stripe-signature header' });

  const rawBody = (req as any).rawBody
    || (typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {}));

  if (!verifyStripeWebhook(rawBody, signature, webhookSecret)) {
    return res.status(400).json({ error: 'Invalid Stripe signature' });
  }

  let event: any;
  try {
    event = typeof req.body === 'object' && req.body !== null ? req.body : JSON.parse(rawBody);
  } catch {
    return res.status(400).json({ error: 'Invalid webhook payload' });
  }

  const eventId = String(event?.id || '');
  const eventType = String(event?.type || '');
  if (!eventId || !eventType) return res.status(400).json({ error: 'Invalid event envelope' });

  try {
    const inserted = await query(
      `INSERT INTO stripe_webhook_events (stripe_event_id, event_type, status)
       VALUES ($1, $2, 'received')
       ON CONFLICT (stripe_event_id) DO NOTHING
       RETURNING id`,
      [eventId, eventType]
    );
    if (inserted.rows.length === 0) {
      return res.json({ received: true, duplicate: true });
    }

    await processStripeEvent(event);
    await query(
      `UPDATE stripe_webhook_events
       SET status = 'processed', processed_at = CURRENT_TIMESTAMP, error_message = NULL
       WHERE stripe_event_id = $1`,
      [eventId]
    );
    return res.json({ received: true });
  } catch (error: any) {
    console.error('Stripe webhook processing error:', error);
    await query(
      `UPDATE stripe_webhook_events
       SET status = 'failed', processed_at = CURRENT_TIMESTAMP, error_message = $2
       WHERE stripe_event_id = $1`,
      [eventId, String(error?.message || 'Unknown webhook processing error').slice(0, 900)]
    );
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;
