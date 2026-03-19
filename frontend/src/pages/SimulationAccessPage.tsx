import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import AuthPageLayout from '../components/auth/AuthPageLayout';
import AuthCard from '../components/auth/AuthCard';
import AuthHeader from '../components/auth/AuthHeader';
import AuthInput from '../components/auth/AuthInput';
import AuthButton from '../components/auth/AuthButton';
import AuthMessage from '../components/auth/AuthMessage';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';

type AccessMode = 'signin' | 'signup';
type AccessState = 'verify' | 'membership' | null;

const sanitizeNext = (raw: string | null): string => {
  const value = (raw || '/dashboard').trim();
  if (!value.startsWith('/')) return '/dashboard';
  const blockedPrefixes = [
    '/simulation/access',
    '/login',
    '/register',
    '/verify-email',
    '/billing',
    '/forgot-password',
    '/reset-password',
  ];
  if (blockedPrefixes.some((prefix) => value.startsWith(prefix))) return '/dashboard';
  return value;
};

const buildAccessUrl = (
  next: string,
  options: { mode?: AccessMode; state?: Exclude<AccessState, null>; email?: string; token?: string }
) => {
  const params = new URLSearchParams();
  params.set('next', next);
  if (options.mode) params.set('mode', options.mode);
  if (options.state) params.set('state', options.state);
  if (options.email) params.set('email', options.email);
  if (options.token) params.set('token', options.token);
  return `/simulation/access?${params.toString()}`;
};

const SimulationAccessPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading, login, register, checkAuth, logout } = useAuth();

  const next = useMemo(() => sanitizeNext(searchParams.get('next')), [searchParams]);
  const stateParam = searchParams.get('state');
  const modeParam = searchParams.get('mode');
  const tokenParam = searchParams.get('token') || '';
  const emailParam = (searchParams.get('email') || '').trim();
  const mode: AccessMode = modeParam === 'signup' ? 'signup' : 'signin';
  const accessState: AccessState = stateParam === 'verify' || stateParam === 'membership' ? stateParam : null;

  const [signinEmail, setSigninEmail] = useState(emailParam);
  const [signinPassword, setSigninPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState(emailParam);
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [formInfo, setFormInfo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [verifyEmail, setVerifyEmail] = useState(emailParam || user?.email || '');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const [devVerificationLink, setDevVerificationLink] = useState('');
  const [membershipNotice, setMembershipNotice] = useState('');
  const verifiedTokenRef = useRef<string>('');

  const gotoAccess = (
    options: { mode?: AccessMode; state?: Exclude<AccessState, null>; email?: string; token?: string },
    replace = true
  ) => navigate(buildAccessUrl(next, options), { replace });

  useEffect(() => {
    if (!location.state) return;
    const maybeMessage = (location.state as any).message as string | undefined;
    const maybeDevVerification = (location.state as any).devVerificationLink as string | undefined;
    if (maybeMessage) setVerifyMessage(maybeMessage);
    if (maybeDevVerification) setDevVerificationLink(maybeDevVerification);
  }, [location.state]);

  useEffect(() => {
    if (loading) return;

    if (user?.emailVerified && user.subscription?.entitled) {
      navigate(next, { replace: true });
      return;
    }
    if (user && !user.emailVerified && accessState !== 'verify') {
      gotoAccess({ state: 'verify', email: user.email });
      return;
    }
    if (user && user.emailVerified && !user.subscription?.entitled && accessState !== 'membership') {
      gotoAccess({ state: 'membership' });
    }
  }, [loading, user, accessState, navigate, next]);

  useEffect(() => {
    if (accessState !== 'verify') return;
    if (!tokenParam || verifiedTokenRef.current === tokenParam) return;

    const verifyByToken = async () => {
      verifiedTokenRef.current = tokenParam;
      setVerifyLoading(true);
      setVerifyError('');
      setVerifyMessage('');
      try {
        const response = await api.post('/auth/verify-email', { token: tokenParam });
        setVerifyMessage(response.data?.message || 'Email verified successfully. You can sign in now.');
        await checkAuth();
      } catch (err: any) {
        setVerifyError(err?.response?.data?.error || 'Unable to verify email. The link may be invalid or expired.');
        setVerifyMessage('Request a fresh verification email below.');
      } finally {
        setVerifyLoading(false);
      }
    };

    verifyByToken();
  }, [accessState, tokenParam, checkAuth]);

  useEffect(() => {
    if (!verifyEmail && user?.email) setVerifyEmail(user.email);
  }, [verifyEmail, user?.email]);

  const submitSignin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signinEmail.trim() || !signinPassword) {
      setFormError('Please enter both email and password.');
      return;
    }
    setIsSubmitting(true);
    setFormError('');
    setFormInfo('');
    try {
      const signedIn = await login(signinEmail, signinPassword);
      if (!signedIn.emailVerified) {
        gotoAccess({ state: 'verify', email: signedIn.email });
        return;
      }
      if (!signedIn.subscription?.entitled) {
        gotoAccess({ state: 'membership' });
        return;
      }
      navigate(next, { replace: true });
    } catch (err: any) {
      if (err?.code === 'EMAIL_VERIFICATION_REQUIRED') {
        const unresolvedEmail = err?.email || signinEmail.trim().toLowerCase();
        gotoAccess({ state: 'verify', email: unresolvedEmail });
        setVerifyMessage(err?.message || 'Please verify your email before signing in.');
        return;
      }
      setFormError(err?.message || 'Unable to sign in.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupName.trim() || !signupEmail.trim() || !signupPassword) {
      setFormError('Please fill in all fields.');
      return;
    }
    if (signupPassword.length < 8) {
      setFormError('Password must be at least 8 characters long.');
      return;
    }
    if (signupPassword !== signupConfirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }
    setIsSubmitting(true);
    setFormError('');
    setFormInfo('');
    try {
      const created = await register(signupEmail, signupPassword, signupName);
      navigate(buildAccessUrl(next, { state: 'verify', email: created.email }), {
        replace: true,
        state: {
          message: created.message,
          devVerificationLink: created.devVerificationLink || '',
        },
      });
    } catch (err: any) {
      setFormError(err?.message || 'Unable to create account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resendVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyError('');
    setVerifyMessage('');
    setDevVerificationLink('');
    if (!verifyEmail.trim()) {
      setVerifyError('Please enter your email address.');
      return;
    }

    setResendLoading(true);
    try {
      const response = await api.post('/auth/resend-verification', { email: verifyEmail.trim().toLowerCase() });
      setVerifyMessage(response.data?.message || 'Verification email sent.');
      setDevVerificationLink(response.data?.devVerificationLink || '');
    } catch (err: any) {
      setVerifyError(err?.response?.data?.error || 'Unable to resend verification email.');
    } finally {
      setResendLoading(false);
    }
  };

  const refreshMembership = async () => {
    setMembershipNotice('');
    const refreshed = await checkAuth();
    if (refreshed?.emailVerified && refreshed.subscription?.entitled) {
      navigate(next, { replace: true });
      return;
    }
    setMembershipNotice('Access is still inactive. Select a plan or refresh again after entitlement update.');
  };

  const membershipStatus = user?.subscription?.status || 'none';
  const membershipGuidance =
    membershipStatus === 'expired'
      ? 'Your trial or access period has ended. Continue with Full Access to re-enter the Simulation workspace.'
      : membershipStatus === 'past_due'
        ? 'Payment is pending. Once payment is completed, refresh access.'
        : 'An active Simulation entitlement is required to enter the workspace.';

  const renderAuthMode = () => (
    <>
      <div style={{ display: 'flex', gap: 8, marginBottom: 'var(--mm-space-5)' }}>
        <button
          onClick={() => gotoAccess({ mode: 'signin' })}
          style={{
            flex: 1,
            height: 42,
            borderRadius: 10,
            border: '1px solid var(--mm-border)',
            background: mode === 'signin' ? 'var(--mm-accent-primary-muted)' : 'var(--mm-bg-panel)',
            color: mode === 'signin' ? 'var(--mm-accent-primary)' : 'var(--mm-text-secondary)',
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          Sign in
        </button>
        <button
          onClick={() => gotoAccess({ mode: 'signup' })}
          style={{
            flex: 1,
            height: 42,
            borderRadius: 10,
            border: '1px solid var(--mm-border)',
            background: mode === 'signup' ? 'var(--mm-accent-primary-muted)' : 'var(--mm-bg-panel)',
            color: mode === 'signup' ? 'var(--mm-accent-primary)' : 'var(--mm-text-secondary)',
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          Create account
        </button>
      </div>

      <AuthMessage tone="info">
        One clean Simulation access flow: account first, then workspace access. The 1-Day Trial starts after email verification.
      </AuthMessage>

      {formError ? <AuthMessage tone="error">{formError}</AuthMessage> : null}
      {formInfo ? <AuthMessage tone="info">{formInfo}</AuthMessage> : null}

      {mode === 'signin' ? (
        <form onSubmit={submitSignin}>
          <AuthInput
            id="signin-email"
            label="Email address"
            type="email"
            value={signinEmail}
            onChange={(e) => setSigninEmail(e.target.value)}
            placeholder="you@company.com"
            autoComplete="email"
            disabled={isSubmitting}
          />
          <AuthInput
            id="signin-password"
            label="Password"
            type="password"
            value={signinPassword}
            onChange={(e) => setSigninPassword(e.target.value)}
            placeholder="Enter your password"
            autoComplete="current-password"
            disabled={isSubmitting}
          />
          <div style={{ textAlign: 'right', marginTop: '-4px', marginBottom: 'var(--mm-space-5)' }}>
            <Link
              to={`/simulation/access/forgot-password?next=${encodeURIComponent(next)}`}
              style={{ fontSize: 13, color: 'var(--mm-accent-primary)', textDecoration: 'none', fontWeight: 600 }}
            >
              Forgot password?
            </Link>
          </div>
          <AuthButton type="submit" isLoading={isSubmitting} loadingText="Signing in...">
            Sign in
          </AuthButton>
        </form>
      ) : (
        <form onSubmit={submitSignup}>
          <AuthInput
            id="signup-name"
            label="Full name"
            type="text"
            value={signupName}
            onChange={(e) => setSignupName(e.target.value)}
            placeholder="John Doe"
            disabled={isSubmitting}
          />
          <AuthInput
            id="signup-email"
            label="Email address"
            type="email"
            value={signupEmail}
            onChange={(e) => setSignupEmail(e.target.value)}
            placeholder="you@company.com"
            autoComplete="email"
            disabled={isSubmitting}
          />
          <AuthInput
            id="signup-password"
            label="Password"
            type="password"
            value={signupPassword}
            onChange={(e) => setSignupPassword(e.target.value)}
            placeholder="Minimum 8 characters"
            autoComplete="new-password"
            disabled={isSubmitting}
          />
          <AuthInput
            id="signup-confirm-password"
            label="Confirm password"
            type="password"
            value={signupConfirmPassword}
            onChange={(e) => setSignupConfirmPassword(e.target.value)}
            placeholder="Re-enter your password"
            autoComplete="new-password"
            disabled={isSubmitting}
          />
          <AuthButton type="submit" isLoading={isSubmitting} loadingText="Creating account...">
            Start 1-Day Trial
          </AuthButton>
        </form>
      )}

      <div style={{ marginTop: 'var(--mm-space-5)', textAlign: 'center', fontSize: 13, color: 'var(--mm-text-tertiary)' }}>
        <Link to="/simulation" style={{ color: 'var(--mm-accent-primary)', fontWeight: 600, textDecoration: 'none' }}>
          Back to Simulation intro
        </Link>
      </div>
    </>
  );

  const renderVerifyState = () => (
    <>
      {!tokenParam ? (
        <AuthMessage tone="info">
          Enter your email below to resend a verification link and activate your Simulation access.
        </AuthMessage>
      ) : null}
      {verifyLoading ? <AuthMessage tone="info">Verifying your email…</AuthMessage> : null}
      {verifyError ? <AuthMessage tone="error">{verifyError}</AuthMessage> : null}
      {verifyMessage ? <AuthMessage tone="success">{verifyMessage}</AuthMessage> : null}
      {devVerificationLink ? (
        <AuthMessage tone="info">
          <strong>Development verification link:</strong>
          <br />
          <a href={devVerificationLink} style={{ color: 'var(--mm-accent-primary)', textDecoration: 'underline', wordBreak: 'break-all' }}>
            {devVerificationLink}
          </a>
        </AuthMessage>
      ) : null}

      <form onSubmit={resendVerification}>
        <AuthInput
          id="verify-email"
          label="Email address"
          type="email"
          value={verifyEmail}
          onChange={(e) => setVerifyEmail(e.target.value)}
          placeholder="you@company.com"
          autoComplete="email"
          disabled={resendLoading}
        />
        <AuthButton type="submit" isLoading={resendLoading} loadingText="Sending verification...">
          Resend verification email
        </AuthButton>
      </form>

      <div style={{ marginTop: 'var(--mm-space-5)', display: 'grid', gap: 10 }}>
        <button
          onClick={() => gotoAccess({ mode: 'signin', email: verifyEmail })}
          style={{
            height: 44,
            borderRadius: 12,
            border: '1px solid var(--mm-border)',
            background: 'var(--mm-bg-panel)',
            color: 'var(--mm-text-secondary)',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Back to sign in
        </button>
      </div>
    </>
  );

  const renderMembershipState = () => (
    <>
      <AuthMessage tone="info">{membershipGuidance}</AuthMessage>
      {membershipNotice ? <AuthMessage tone="info">{membershipNotice}</AuthMessage> : null}
      {user ? (
        <div
          style={{
            border: '1px solid var(--mm-border-subtle)',
            borderRadius: 12,
            padding: '12px 14px',
            marginBottom: 'var(--mm-space-5)',
            fontSize: 13,
            color: 'var(--mm-text-secondary)',
            display: 'grid',
            gap: 6,
            background: 'var(--mm-bg-panel)',
          }}
        >
          <div><strong>Status:</strong> {user.subscription?.status || 'none'}</div>
          <div><strong>Plan:</strong> {user.subscription?.planCode || 'not set'}</div>
          <div><strong>Period end:</strong> {user.subscription?.currentPeriodEnd || 'n/a'}</div>
        </div>
      ) : (
        <AuthMessage tone="info">Sign in to view your current Simulation access status.</AuthMessage>
      )}

      <div style={{ display: 'grid', gap: 10 }}>
        {user ? (
          <>
            <Link
              to="/simulation/pricing"
              style={{
                height: 44,
                borderRadius: 12,
                border: '1px solid var(--mm-border)',
                background: 'var(--mm-bg-panel)',
                color: 'var(--mm-text-secondary)',
                textDecoration: 'none',
                fontSize: 13,
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              View pricing
            </Link>
            <AuthButton type="button" onClick={refreshMembership}>
              I updated access — refresh
            </AuthButton>
            <button
              onClick={async () => {
                await logout();
                gotoAccess({ mode: 'signin' });
              }}
              style={{
                height: 42,
                borderRadius: 10,
                border: '1px solid var(--mm-border)',
                background: 'transparent',
                color: 'var(--mm-text-secondary)',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Sign out
            </button>
          </>
        ) : (
          <button
            onClick={() => gotoAccess({ mode: 'signin' })}
            style={{
              height: 44,
              borderRadius: 12,
              border: '1px solid var(--mm-border)',
              background: 'var(--mm-bg-panel)',
              color: 'var(--mm-text-secondary)',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Sign in
          </button>
        )}
      </div>
    </>
  );

  return (
    <AuthPageLayout>
      <AuthCard>
        <AuthHeader
          title={
            accessState === 'verify'
              ? 'Verify your email'
              : accessState === 'membership'
                ? 'Simulation access required'
                : mode === 'signup'
                  ? 'Create your Simulation account'
                  : 'Sign in to Simulation Studio'
          }
          subtitle={
            accessState === 'verify'
              ? 'Verify your email to activate your one-time trial and continue.'
              : accessState === 'membership'
                ? 'Continue with Full Access to enter the Simulation workspace.'
                : 'Sign in or create your account to enter Simulation Studio.'
          }
        />

        {loading ? (
          <AuthMessage tone="info">Loading your access state…</AuthMessage>
        ) : accessState === 'verify' ? (
          renderVerifyState()
        ) : accessState === 'membership' ? (
          renderMembershipState()
        ) : (
          renderAuthMode()
        )}
      </AuthCard>
    </AuthPageLayout>
  );
};

export default SimulationAccessPage;

