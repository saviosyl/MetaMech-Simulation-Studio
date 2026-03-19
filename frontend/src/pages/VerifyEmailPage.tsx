import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { simulationUrls } from '../content/simulationMarketingContent';

const VerifyEmailPage: React.FC = () => {
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const token = useMemo(() => params.get('token') || '', [params]);
  const next = useMemo(() => {
    const raw = params.get('next') || '/dashboard';
    if (
      raw.startsWith('/login')
      || raw.startsWith('/register')
      || raw.startsWith('/verify-email')
      || raw.startsWith('/forgot-password')
      || raw.startsWith('/reset-password')
    ) {
      return '/dashboard';
    }
    return raw;
  }, [params]);
  const [email, setEmail] = useState(params.get('email') || user?.email || '');

  const [verifyLoading, setVerifyLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState((location.state as any)?.message || '');
  const [devVerificationLink, setDevVerificationLink] = useState((location.state as any)?.devVerificationLink || '');
  const [verified, setVerified] = useState(false);
  const [trialGranted, setTrialGranted] = useState(false);
  const [trialReason, setTrialReason] = useState('');

  useEffect(() => {
    if (!email && user?.email) setEmail(user.email);
  }, [email, user?.email]);

  useEffect(() => {
    if (!user) return;
    if (user.emailVerified && user.subscription?.entitled) {
      navigate(next, { replace: true });
      return;
    }
    if (user.emailVerified && !user.subscription?.entitled) {
      navigate(`/billing?next=${encodeURIComponent(next)}`, { replace: true });
    }
  }, [user, next, navigate]);

  useEffect(() => {
    const doVerify = async () => {
      if (!token) return;
      setVerifyLoading(true);
      setError('');
      setMessage('');
      try {
        const response = await api.post('/auth/verify-email', { token });
        const granted = !!response.data?.trialGranted;
        const reason = String(response.data?.trialReason || '');
        setTrialGranted(granted);
        setTrialReason(reason);
        setVerified(true);
        setMessage(response.data?.message || (granted
          ? 'Email verified successfully. Your 1-day trial is now active.'
          : 'Email verified successfully. Sign in to continue.'));
      } catch (err: any) {
        setError(err?.response?.data?.error || 'Unable to verify email. The link may be invalid or expired.');
        setMessage('If your verification link has expired, request a new one below.');
      } finally {
        setVerifyLoading(false);
      }
    };

    doVerify();
  }, [token]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setDevVerificationLink('');
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    setResendLoading(true);
    try {
      const response = await api.post('/auth/resend-verification', { email: email.trim().toLowerCase() });
      setMessage(response.data?.message || 'Verification email sent.');
      setVerified(false);
      setDevVerificationLink(response.data?.devVerificationLink || '');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Unable to resend verification email. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-6">
      <div className="container mx-auto max-w-md">
        <div className="text-center mb-8">
          <a href={simulationUrls.productHome} className="inline-flex mx-auto mb-3" title="Simulation home">
            <img
              src="/simulation-studio-logo.png"
              alt="Simulation Studio"
              className="h-14 w-full max-w-[320px] rounded-lg object-cover"
              style={{ objectPosition: 'center 45%' }}
            />
          </a>
          <p className="text-gray-600">Email verification required</p>
        </div>

        <div className="bg-white shadow-lg rounded-xl p-8">
          <h2 className="text-2xl font-semibold text-gray-900 text-center mb-3">Verify your email</h2>
          <p className="text-gray-600 text-center mb-6">
            Confirm your email to unlock your one-time 1-day trial.
          </p>

          {verifyLoading && (
            <div className="bg-teal-50 border border-teal-200 text-teal-700 px-4 py-3 rounded-lg mb-4">
              Verifying your email…
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}
          {message && (
            <div className={`px-4 py-3 rounded-lg mb-4 border ${
              trialReason === 'identity_conflict' || trialReason === 'already_used'
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-teal-50 border-teal-200 text-teal-700'
            }`}>
              {message}
            </div>
          )}

          {devVerificationLink && (
            <div className="text-left bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-lg text-sm mb-4">
              <div className="font-semibold mb-1">Development verification link</div>
              <a href={devVerificationLink} className="underline break-all">{devVerificationLink}</a>
            </div>
          )}

          {verified ? (
            <div className="space-y-3">
              {!trialGranted && (
                <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  Your email is verified, but trial access is not active for this account. You can still sign in and continue from billing/subscription.
                </div>
              )}
              <button
                onClick={() => navigate(`/login?next=${encodeURIComponent(next)}`, {
                  replace: true,
                  state: {
                    message: trialGranted
                      ? 'Email verified and trial activated. You can sign in now.'
                      : 'Email verified. Sign in to continue.',
                  },
                })}
                className="w-full bg-teal-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-teal-700 transition-colors"
              >
                Continue to Sign In
              </button>
              <button
                onClick={() => {
                  setVerified(false);
                  setError('');
                  setMessage('Need a fresh link? Resend verification below.');
                }}
                className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Need another verification email?
              </button>
            </div>
          ) : (
            <form onSubmit={handleResend} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  disabled={resendLoading}
                />
              </div>
              <button
                type="submit"
                disabled={resendLoading}
                className="w-full bg-gray-900 text-white py-3 px-4 rounded-lg font-medium hover:bg-black transition-colors disabled:opacity-60"
              >
                {resendLoading ? 'Sending verification...' : 'Resend verification email'}
              </button>
              <p className="text-xs text-gray-500 text-center">
                For security, the same message may be shown even if an account does not exist.
              </p>
            </form>
          )}

          <div className="mt-8 text-center">
            <Link to={`/login?next=${encodeURIComponent(next)}`} className="text-teal-600 hover:text-teal-700 font-medium">
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
