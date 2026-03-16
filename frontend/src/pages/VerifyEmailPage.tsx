import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

const VerifyEmailPage: React.FC = () => {
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const token = useMemo(() => params.get('token') || '', [params]);
  const next = useMemo(() => params.get('next') || '/dashboard', [params]);
  const [email, setEmail] = useState(params.get('email') || user?.email || '');

  const [verifyLoading, setVerifyLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState((location.state as any)?.message || '');
  const [devVerificationLink, setDevVerificationLink] = useState((location.state as any)?.devVerificationLink || '');
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (!email && user?.email) setEmail(user.email);
  }, [email, user?.email]);

  useEffect(() => {
    if (!user) return;
    if (user.emailVerified && user.subscription?.entitled) {
      navigate(next, { replace: true });
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
        setVerified(true);
        setMessage(response.data?.message || 'Email verified successfully. You can now sign in.');
      } catch (err: any) {
        setError(err?.response?.data?.error || 'Unable to verify email. The link may be invalid or expired.');
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            <span className="text-teal-600">MetaMech</span> Studio
          </h1>
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
            <div className="bg-teal-50 border border-teal-200 text-teal-700 px-4 py-3 rounded-lg mb-4">
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
              <button
                onClick={() => navigate(`/login?next=${encodeURIComponent(next)}`, { replace: true })}
                className="w-full bg-teal-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-teal-700 transition-colors"
              >
                Continue to Sign In
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
