import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AuthPageLayout from '../components/auth/AuthPageLayout';
import AuthCard from '../components/auth/AuthCard';
import AuthHeader from '../components/auth/AuthHeader';
import AuthInput from '../components/auth/AuthInput';
import AuthButton from '../components/auth/AuthButton';
import AuthMessage from '../components/auth/AuthMessage';

const RegisterPage: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { register, user, loading } = useAuth();
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
    if (loading || !user) return;
    if (!user.emailVerified) {
      navigate(`/verify-email?email=${encodeURIComponent(user.email)}&next=${encodeURIComponent(from)}`, { replace: true });
      return;
    }
    if (user.subscription?.entitled) navigate(from, { replace: true });
    else navigate(`/billing?next=${encodeURIComponent(from)}`, { replace: true });
  }, [loading, user, navigate, from]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password || !formData.displayName) {
      setError('Please fill in all fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const created = await register(formData.email, formData.password, formData.displayName);
      navigate(`/verify-email?email=${encodeURIComponent(created.email)}&next=${encodeURIComponent(from)}`, {
        replace: true,
        state: {
          message: created.message,
          devVerificationLink: created.devVerificationLink || '',
        },
      });
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthPageLayout>
      <AuthCard>
        <AuthHeader
          title="Create your MetaMech account"
          subtitle="Design industrial layouts, validate flow, and run simulation workflows with engineering-grade controls."
        />

        {error ? <AuthMessage tone="error">{error}</AuthMessage> : null}

        <form onSubmit={handleSubmit}>
          <AuthInput
            id="displayName"
            name="displayName"
            label="Full name"
            type="text"
            value={formData.displayName}
            onChange={handleChange}
            placeholder="John Doe"
            disabled={isLoading}
          />
          <AuthInput
            id="email"
            name="email"
            label="Email address"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="your@company.com"
            autoComplete="email"
            disabled={isLoading}
          />
          <AuthInput
            id="password"
            name="password"
            label="Password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Minimum 8 characters"
            autoComplete="new-password"
            disabled={isLoading}
          />
          <AuthInput
            id="confirmPassword"
            name="confirmPassword"
            label="Confirm password"
            type="password"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="Re-enter your password"
            autoComplete="new-password"
            disabled={isLoading}
          />

          <div style={{ marginTop: 'var(--mm-space-6)' }}>
            <AuthButton type="submit" isLoading={isLoading} loadingText="Creating account...">
              Create account
            </AuthButton>
          </div>
        </form>

        <div style={{ marginTop: 'var(--mm-space-5)', fontSize: 13, color: 'var(--mm-text-tertiary)', textAlign: 'center' }}>
          Already have an account?{' '}
          <Link to={`/login?next=${encodeURIComponent(from)}`} style={{ color: 'var(--mm-accent-primary)', fontWeight: 600, textDecoration: 'none' }}>
            Sign in
          </Link>
        </div>

        <p style={{ marginTop: 'var(--mm-space-5)', fontSize: 12, color: 'var(--mm-text-disabled)', textAlign: 'center', lineHeight: 1.5 }}>
          By creating an account, you agree to our Terms and Privacy Policy.
        </p>
      </AuthCard>
    </AuthPageLayout>
  );
};

export default RegisterPage;