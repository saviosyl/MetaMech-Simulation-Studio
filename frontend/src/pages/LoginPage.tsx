import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--mm-bg-app)',
        fontFamily: "'Inter', sans-serif",
        padding: '24px',
      }}
    >
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* ─── Brand ─── */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          {/* Logo mark */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 56,
            height: 56,
            borderRadius: 14,
            background: 'linear-gradient(135deg, #0891b2, #06b6d4)',
            marginBottom: 16,
            boxShadow: '0 4px 24px rgba(6, 182, 212, 0.2)',
          }}>
            <span style={{ fontSize: 24, fontWeight: 800, color: '#fff', fontFamily: "'Orbitron', monospace" }}>M</span>
          </div>
          <h1 style={{
            fontSize: 22,
            fontWeight: 700,
            color: 'var(--mm-text-primary)',
            fontFamily: "'Orbitron', monospace",
            letterSpacing: '0.05em',
            margin: '0 0 6px 0',
          }}>
            MetaMech Studio
          </h1>
          <p style={{
            fontSize: 13,
            color: 'var(--mm-text-tertiary)',
            margin: 0,
            lineHeight: 1.5,
          }}>
            Industrial layout, simulation &amp; automation planning
          </p>
        </div>

        {/* ─── Login Card ─── */}
        <div style={{
          background: 'var(--mm-bg-panel)',
          border: '1px solid var(--mm-border)',
          borderRadius: 12,
          padding: '32px 28px',
          boxShadow: 'var(--mm-shadow-lg)',
        }}>
          <h2 style={{
            fontSize: 16,
            fontWeight: 600,
            color: 'var(--mm-text-primary)',
            textAlign: 'center',
            margin: '0 0 24px 0',
          }}>
            Sign in to your account
          </h2>

          {error && (
            <div style={{
              background: 'var(--mm-accent-danger-muted)',
              border: '1px solid rgba(248, 113, 113, 0.3)',
              color: 'var(--mm-accent-danger)',
              padding: '10px 14px',
              borderRadius: 8,
              fontSize: 13,
              marginBottom: 20,
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 18 }}>
              <label style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--mm-text-secondary)',
                marginBottom: 6,
                letterSpacing: '0.03em',
              }}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  fontSize: 14,
                  background: 'var(--mm-bg-input)',
                  border: '1px solid var(--mm-border)',
                  borderRadius: 8,
                  color: 'var(--mm-text-primary)',
                  outline: 'none',
                  transition: 'border-color 0.15s',
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--mm-accent-primary)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--mm-border)'}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--mm-text-secondary)',
                marginBottom: 6,
                letterSpacing: '0.03em',
              }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  fontSize: 14,
                  background: 'var(--mm-bg-input)',
                  border: '1px solid var(--mm-border)',
                  borderRadius: 8,
                  color: 'var(--mm-text-primary)',
                  outline: 'none',
                  transition: 'border-color 0.15s',
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--mm-accent-primary)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--mm-border)'}
              />
            </div>

            <div style={{ textAlign: 'right', marginBottom: 24 }}>
              <Link
                to="/forgot-password"
                style={{ fontSize: 12, color: 'var(--mm-accent-primary)', textDecoration: 'none' }}
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '11px 20px',
                fontSize: 14,
                fontWeight: 600,
                color: '#fff',
                background: 'linear-gradient(135deg, #0891b2, #06b6d4)',
                border: 'none',
                borderRadius: 8,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.6 : 1,
                transition: 'all 0.15s',
                boxShadow: '0 2px 12px rgba(6, 182, 212, 0.25)',
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {isLoading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <div style={{
            textAlign: 'center',
            marginTop: 24,
            paddingTop: 20,
            borderTop: '1px solid var(--mm-border-subtle)',
          }}>
            <span style={{ fontSize: 13, color: 'var(--mm-text-tertiary)' }}>
              Don't have an account?{' '}
              <Link to="/register" style={{ color: 'var(--mm-accent-primary)', fontWeight: 600, textDecoration: 'none' }}>
                Create Account
              </Link>
            </span>
          </div>
        </div>

        {/* ─── Feature pills ─── */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 8,
          marginTop: 24,
          flexWrap: 'wrap',
        }}>
          {['Conveyor Layout', 'Simulation', 'Robot Planning', 'Palletizing'].map(tag => (
            <span
              key={tag}
              style={{
                fontSize: 11,
                color: 'var(--mm-text-tertiary)',
                padding: '4px 10px',
                borderRadius: 20,
                border: '1px solid var(--mm-border-subtle)',
                background: 'var(--mm-bg-panel)',
              }}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* ─── Footer ─── */}
        <p style={{
          textAlign: 'center',
          fontSize: 11,
          color: 'var(--mm-text-disabled)',
          marginTop: 32,
        }}>
          © 2025 MetaMech Solutions · metamechsolutions.com
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
