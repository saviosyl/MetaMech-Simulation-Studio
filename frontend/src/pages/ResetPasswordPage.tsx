import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import AuthPageLayout from '../components/auth/AuthPageLayout';
import AuthCard from '../components/auth/AuthCard';
import AuthHeader from '../components/auth/AuthHeader';
import AuthInput from '../components/auth/AuthInput';
import AuthButton from '../components/auth/AuthButton';
import AuthMessage from '../components/auth/AuthMessage';

const ResetPasswordPage: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = useMemo(() => params.get('token') || '', [params]);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!token) {
      setError('Reset token is missing. Use the link from your email.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post('/auth/reset-password', { token, password });
      setMessage(response.data.message || 'Password reset successful.');
      setTimeout(() => navigate('/login', { replace: true }), 1200);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Unable to reset password. The link may be invalid or expired.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthPageLayout>
      <AuthCard>
        <AuthHeader
          title="Set a new password"
          subtitle="Choose a strong password for your MetaMech account."
        />

        {error ? <AuthMessage tone="error">{error}</AuthMessage> : null}
        {message ? <AuthMessage tone="success">{message}</AuthMessage> : null}

        <form onSubmit={handleSubmit}>
          <AuthInput
            id="password"
            label="New password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimum 8 characters"
            disabled={isLoading}
          />
          <AuthInput
            id="confirmPassword"
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repeat your new password"
            disabled={isLoading}
          />
          <div style={{ marginTop: 'var(--mm-space-6)' }}>
            <AuthButton type="submit" isLoading={isLoading} loadingText="Resetting password...">
              Reset password
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

export default ResetPasswordPage;
