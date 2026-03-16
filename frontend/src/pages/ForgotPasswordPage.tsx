import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import AuthPageLayout from '../components/auth/AuthPageLayout';
import AuthCard from '../components/auth/AuthCard';
import AuthHeader from '../components/auth/AuthHeader';
import AuthInput from '../components/auth/AuthInput';
import AuthButton from '../components/auth/AuthButton';
import AuthMessage from '../components/auth/AuthMessage';

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [devResetLink, setDevResetLink] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/forgot-password', { email });
      setMessage(response.data.message);
      setDevResetLink(response.data.devResetLink || '');
      setIsSubmitted(true);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <AuthPageLayout>
        <AuthCard>
          <AuthHeader
            title="Check your email"
            subtitle="If your account exists, we’ve sent a secure password reset link."
          />
          <AuthMessage tone="success">{message}</AuthMessage>
          <AuthMessage tone="info">
            Didn't receive the email? Check spam/junk folders or request a new reset link.
          </AuthMessage>
          {devResetLink ? (
            <AuthMessage tone="info">
              <strong>Development reset link:</strong>
              <br />
              <a href={devResetLink} style={{ color: 'var(--mm-accent-primary)', textDecoration: 'underline', wordBreak: 'break-all' }}>
                {devResetLink}
              </a>
            </AuthMessage>
          ) : null}
          <div style={{ display: 'grid', gap: 12 }}>
            <AuthButton
              type="button"
              onClick={() => {
                setIsSubmitted(false);
                setMessage('');
                setEmail('');
                setDevResetLink('');
              }}
            >
              Request another link
            </AuthButton>
            <Link
              to="/login"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: 48,
                borderRadius: 'var(--mm-radius-md)',
                textDecoration: 'none',
                border: '1px solid var(--mm-border)',
                color: 'var(--mm-text-secondary)',
                background: 'var(--mm-bg-panel)',
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              Back to sign in
            </Link>
          </div>
        </AuthCard>
      </AuthPageLayout>
    );
  }

  return (
    <AuthPageLayout>
      <AuthCard>
        <AuthHeader
          title="Forgot your password?"
          subtitle="Enter your account email and we’ll send a reset link if the account exists."
        />

        {error ? <AuthMessage tone="error">{error}</AuthMessage> : null}

        <form onSubmit={handleSubmit}>
          <AuthInput
            id="email"
            label="Email address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@company.com"
            autoComplete="email"
            disabled={isLoading}
          />

          <div style={{ marginTop: 'var(--mm-space-6)' }}>
            <AuthButton type="submit" isLoading={isLoading} loadingText="Sending reset link...">
              Send reset link
            </AuthButton>
          </div>
        </form>

        <div style={{ marginTop: 'var(--mm-space-5)', textAlign: 'center' }}>
          <Link to="/login" style={{ color: 'var(--mm-accent-primary)', fontWeight: 600, textDecoration: 'none', fontSize: 13 }}>
            Back to sign in
          </Link>
        </div>
      </AuthCard>
    </AuthPageLayout>
  );
};

export default ForgotPasswordPage;