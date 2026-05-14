import api from '../utils/api';

export type BillingPlan = 'monthly' | 'yearly';

export async function createCheckoutSession(plan: BillingPlan): Promise<string> {
  const response = await api.post('/billing/create-checkout-session', { plan });
  const url = response.data?.checkoutUrl as string | undefined;
  if (!url) throw new Error('Checkout session URL was not returned.');
  return url;
}

export async function createPortalSession(): Promise<string> {
  const response = await api.post('/billing/create-portal-session');
  const url = response.data?.portalUrl as string | undefined;
  if (!url) throw new Error('Billing portal URL was not returned.');
  return url;
}
