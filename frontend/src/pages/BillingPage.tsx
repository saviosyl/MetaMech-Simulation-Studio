import React from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { simulationStripeLinks, simulationUrls } from '../content/simulationMarketingContent';

const BillingPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, checkAuth, logout } = useAuth();

  const sub = user?.subscription;
  const status = sub?.status || 'none';
  const entitled = !!sub?.entitled;
  const [notice, setNotice] = React.useState('');
  const fromLocation = location.state?.from as { pathname: string; search?: string } | undefined;
  const fromState = fromLocation ? `${fromLocation.pathname}${fromLocation.search || ''}` : undefined;
  const rawNext = searchParams.get('next') || fromState || '/dashboard';
  const next = (
    rawNext.startsWith('/billing')
    || rawNext.startsWith('/login')
    || rawNext.startsWith('/register')
    || rawNext.startsWith('/verify-email')
    || rawNext.startsWith('/forgot-password')
    || rawNext.startsWith('/reset-password')
  )
    ? '/dashboard'
    : rawNext;

  const statusLabel =
    status === 'pending_verification'
      ? 'Email verification required'
      : status === 'past_due'
      ? 'Payment pending'
      : status === 'canceled'
        ? 'Subscription canceled'
        : status === 'expired'
          ? 'Subscription expired'
          : status === 'none'
            ? 'No active subscription'
            : status;

  const guidance =
    status === 'expired'
      ? 'Your trial/subscription period ended. Renew access to continue using the workspace.'
      : status === 'past_due'
        ? 'Payment is pending. Update billing status, then refresh access.'
        : status === 'canceled'
          ? 'This subscription was canceled. Renew or reactivate to continue.'
          : status === 'none'
            ? 'No active plan is linked to this account yet.'
            : 'Active subscription is required for editor and project APIs.';

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6 py-12">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(6,182,212,0.15),transparent_35%),radial-gradient(circle_at_80%_85%,rgba(139,92,246,0.12),transparent_40%)] pointer-events-none" />
      <div className="relative z-10 w-full max-w-2xl bg-slate-900/95 rounded-2xl shadow-2xl border border-slate-700 p-8 text-slate-100">
        <a href={simulationUrls.productHome} className="inline-flex mb-4" title="Simulation home">
          <img
            src="/simulation-studio-logo.png"
            alt="Simulation Studio"
            className="h-14 w-full max-w-[340px] rounded-lg object-cover"
            style={{ objectPosition: 'center 45%' }}
          />
        </a>
        <h1 className="text-2xl font-bold mb-2">Simulation access required</h1>
        <p className="text-slate-300 mb-6">
          You are signed in, but this account currently does not have an active entitlement for the simulation workspace.
        </p>
        {notice && (
          <div className="mb-4 rounded-lg border border-amber-400/40 bg-amber-300/10 px-4 py-3 text-amber-200 text-sm">
            {notice}
          </div>
        )}

        <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-4 mb-6">
          <div className="text-sm text-slate-200 mb-2">
            <strong>Status:</strong>{' '}
            <span className={`font-semibold ${entitled ? 'text-teal-300' : 'text-amber-300'}`}>
              {statusLabel}
            </span>
          </div>
          <div className="text-sm text-slate-200">
            <strong>Current period end:</strong>{' '}
            {sub?.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleString() : 'not available'}
          </div>
          <div className="text-sm text-slate-200">
            <strong>Plan:</strong> {sub?.planCode || 'not set'}
          </div>
          <div className="text-sm text-slate-300 mt-2">
            <strong>Return path after activation:</strong> {next}
          </div>
          <div className="text-sm text-slate-300 mt-2">
            <strong>Guidance:</strong> {guidance}
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={async () => {
              const refreshedUser = await checkAuth();
              if (refreshedUser?.subscription?.entitled) {
                navigate(next, { replace: true });
              } else {
                setNotice('Subscription is still inactive. Update status in billing first, then refresh access.');
              }
            }}
            className="w-full bg-teal-500 text-slate-950 py-3 rounded-lg font-semibold hover:bg-teal-400 transition-colors"
          >
            I renewed — refresh access
          </button>
          <div className="w-full rounded-lg border border-slate-700 bg-slate-800/70 p-3">
            <a
              href={simulationStripeLinks.monthly.url}
              className="w-full bg-slate-100 text-slate-900 py-2.5 rounded-lg font-semibold hover:bg-white transition-colors inline-flex items-center justify-center"
            >
              MetaMech Simulation – Monthly
            </a>
            <div className="mt-2 text-2xl font-bold text-white">€49.00</div>
            <div className="mt-0.5 text-xs text-slate-300 font-semibold">per month</div>
          </div>
          <div className="w-full rounded-lg border border-slate-700 bg-slate-800/70 p-3">
            <a
              href={simulationStripeLinks.yearly.url}
              className="w-full bg-slate-100 text-slate-900 py-2.5 rounded-lg font-semibold hover:bg-white transition-colors inline-flex items-center justify-center"
            >
              Subscribe to MetaMech Simulation – Yearly
            </a>
            <div className="mt-2 text-2xl font-bold text-white">€499.00</div>
            <div className="mt-0.5 text-xs text-slate-300 font-semibold">per year</div>
            <div className="mt-0.5 text-xs text-teal-300 font-semibold">€41.58 / month billed annually</div>
          </div>
          <button
            onClick={async () => {
              await logout();
              navigate('/login', { replace: true });
            }}
            className="w-full bg-transparent text-slate-200 py-3 rounded-lg font-semibold border border-slate-600 hover:bg-slate-800 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default BillingPage;
