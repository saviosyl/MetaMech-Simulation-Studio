import api from '../utils/api';
import { simulationStripeLinks } from '../content/simulationMarketingContent';

export type BillingPlan = 'monthly' | 'yearly';

export function fallbackStripeCheckoutUrl(plan: BillingPlan): string {
  return plan === 'monthly'
    ? simulationStripeLinks.monthly.url
    : simulationStripeLinks.yearly.url;
}

export async function createCheckoutSession(plan: BillingPlan): Promise<string> {
  try {
    const response = await api.post('/billing/create-checkout-session', { plan });
    const url = response.data?.checkoutUrl as string | undefined;
    if (!url) throw new Error('Checkout session URL was not returned.');
    return url;
  } catch (error: any) {
    const status = error?.response?.status;
    // Safety fallback: if backend billing is unavailable, open direct Stripe payment link.
    if (!status || status === 404 || status >= 500) {
      return fallbackStripeCheckoutUrl(plan);
    }
    throw error;
  }
}

export async function createPortalSession(): Promise<string> {
  const response = await api.post('/billing/create-portal-session');
  const url = response.data?.portalUrl as string | undefined;
  if (!url) throw new Error('Billing portal URL was not returned.');
  return url;
}
