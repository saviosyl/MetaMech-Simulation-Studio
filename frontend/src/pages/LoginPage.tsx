import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AuthPageLayout from '../components/auth/AuthPageLayout';
import AuthCard from '../components/auth/AuthCard';
import AuthHeader from '../components/auth/AuthHeader';
import AuthInput from '../components/auth/AuthInput';
import AuthButton from '../components/auth/AuthButton';
import AuthMessage from '../components/auth/AuthMessage';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [info, setInfo] = useState('');

  const { login, user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const fromLocation = location.state?.from as { pathname: string; search?: string } | undefined;
  const fromState = fromLocation ? `${fromLocation.pathname}${fromLocation.search || ''}` : undefined;
  const nextParam = searchParams.get('next');
  const rawFrom = nextParam || fromState || '/dashboard';
  const from = (
    rawFrom.startsWith('/login')
    || rawFrom.startsWith('/register')
    || rawFrom.startsWith('/verify-email')
    || rawFrom.startsWith('/forgot-password')
    || rawFrom.startsWith('/reset-password')
  )
    ? '/dashboard'
    : rawFrom;

  useEffect(() => {
    const stateMessage = (location.state as any)?.message || '';
    if (stateMessage) setInfo(stateMessage);
  }, [location.state]);

  useEffect(() => {
    if (loading || !user) return;
    if (!user.emailVerified) {
      navigate(`/verify-email?email=${encodeURIComponent(user.email)}&next=${encodeURIComponent(from)}`, { replace: true });
      return;
    }
    if (user.subscription?.entitled) navigate(from, { replace: true });
    else navigate(`/billing?next=${encodeURIComponent(from)}`, { replace: true });
  }, [loading, user, navigate, from]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) { setError('Please enter both email and password.'); return; }
    setIsLoading(true); setError(''); setInfo('');
    try {
      const signedIn = await login(email, password);
      if (!signedIn.emailVerified) {
        navigate(`/verify-email?email=${encodeURIComponent(signedIn.email)}&next=${encodeURIComponent(from)}`, { replace: true });
      } else if (signedIn.subscription?.entitled) navigate(from, { replace: true });
      else navigate(`/billing?next=${encodeURIComponent(from)}`, { replace: true });
    }
    catch (error: any) {
      if (error?.code === 'EMAIL_VERIFICATION_REQUIRED') {
        const unresolvedEmail = error?.email || email.trim().toLowerCase();
        navigate(`/verify-email?email=${encodeURIComponent(unresolvedEmail)}&next=${encodeURIComponent(from)}`, {
          replace: true,
          state: { message: error.message || 'Please verify your email before signing in.' },
        });
        return;
      }
      setError(error.message);
    }
    finally { setIsLoading(false); }
  };

  return (
    <AuthPageLayout>
      <AuthCard>
        <AuthHeader
          title="Welcome back"
          subtitle="Sign in to continue building production-ready simulation layouts in MetaMech Studio."
        />

        {error ? <AuthMessage tone="error">{error}</AuthMessage> : null}
        {info ? <AuthMessage tone="info">{info}</AuthMessage> : null}

        <form onSubmit={handleSubmit}>
          <AuthInput
            id="email"
            label="Email address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            autoComplete="email"
            disabled={isLoading}
          />
          <AuthInput
            id="password"
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            autoComplete="current-password"
            disabled={isLoading}
          />

          <div style={{ textAlign: 'right', marginTop: '-4px', marginBottom: 'var(--mm-space-5)' }}>
            <Link to="/forgot-password" style={{ fontSize: 13, color: 'var(--mm-accent-primary)', textDecoration: 'none', fontWeight: 600 }}>
              Forgot password?
            </Link>
          </div>

          <AuthButton type="submit" isLoading={isLoading} loadingText="Signing in...">
            Sign in
          </AuthButton>
        </form>

        <div style={{ marginTop: 'var(--mm-space-5)', textAlign: 'center', fontSize: 13, color: 'var(--mm-text-tertiary)' }}>
          Don't have an account?{' '}
          <Link to={`/register?next=${encodeURIComponent(from)}`} style={{ color: 'var(--mm-accent-primary)', fontWeight: 600, textDecoration: 'none' }}>
            Create account
          </Link>
        </div>
      </AuthCard>
    </AuthPageLayout>
  );
};

export default LoginPage;
