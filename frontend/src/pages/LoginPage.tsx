import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// ─── CSS Keyframes (injected once) ───
const styleId = 'metamech-login-anim';
if (typeof document !== 'undefined' && !document.getElementById(styleId)) {
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    @keyframes mm-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
    @keyframes mm-fade-up { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes mm-glow-pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }
    @keyframes mm-grid-drift { 0% { background-position: 0 0; } 100% { background-position: 60px 60px; } }
    @keyframes mm-shimmer { 0% { left: -150%; } 100% { left: 150%; } }
  `;
  document.head.appendChild(style);
}

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  useEffect(() => { setMounted(true); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError('Please fill in all fields'); return; }
    setIsLoading(true); setError('');
    try { await login(email, password); navigate(from, { replace: true }); }
    catch (error: any) { setError(error.message); }
    finally { setIsLoading(false); }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 14px', fontSize: 14,
    background: 'var(--mm-bg-input)', border: '1px solid var(--mm-border)',
    borderRadius: 8, color: 'var(--mm-text-primary)', outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxSizing: 'border-box',
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--mm-bg-app)', fontFamily: "'Inter', sans-serif", padding: 24,
      position: 'relative', overflow: 'hidden',
    }}>
      {/* ─── Animated background: subtle grid drift ─── */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.04,
        backgroundImage: 'linear-gradient(var(--mm-border) 1px, transparent 1px), linear-gradient(90deg, var(--mm-border) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
        animation: 'mm-grid-drift 20s linear infinite',
      }} />

      {/* ─── Ambient glow orbs ─── */}
      <div style={{
        position: 'absolute', top: '15%', left: '20%', width: 300, height: 300, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)',
        animation: 'mm-glow-pulse 6s ease-in-out infinite', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '10%', right: '15%', width: 250, height: 250, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)',
        animation: 'mm-glow-pulse 8s ease-in-out infinite 2s', pointerEvents: 'none',
      }} />

      {/* ─── Content ─── */}
      <div style={{
        width: '100%', maxWidth: 420, position: 'relative', zIndex: 1,
        opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 0.6s ease, transform 0.6s ease',
      }}>
        {/* ─── Brand ─── */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          {/* Original MetaMech logo */}
          <img
            src="/metamech-logo.png"
            alt="MetaMech"
            style={{
              display: 'block', margin: '0 auto 14px auto',
              height: 54, maxWidth: 280, objectFit: 'contain',
              animation: 'mm-float 5s ease-in-out infinite',
              filter: 'drop-shadow(0 4px 16px rgba(6,182,212,0.15))',
            }}
          />
          <h1 style={{
            fontSize: 20, fontWeight: 700, color: 'var(--mm-text-primary)',
            fontFamily: "'Orbitron', monospace", letterSpacing: '0.06em',
            margin: '0 0 6px 0',
            animation: 'mm-fade-up 0.7s ease 0.2s both',
          }}>
            Simulation Studio
          </h1>
          <p style={{
            fontSize: 13, color: 'var(--mm-text-tertiary)', margin: 0, lineHeight: 1.5,
            animation: 'mm-fade-up 0.7s ease 0.35s both',
          }}>
            Industrial layout, simulation &amp; automation planning
          </p>
        </div>

        {/* ─── Login Card ─── */}
        <div style={{
          background: 'var(--mm-bg-panel)', border: '1px solid var(--mm-border)',
          borderRadius: 14, padding: '36px 32px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.2)',
          animation: 'mm-fade-up 0.7s ease 0.4s both',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Card shimmer accent */}
          <div style={{
            position: 'absolute', top: 0, left: '-150%', width: '80%', height: 2,
            background: 'linear-gradient(90deg, transparent, rgba(6,182,212,0.4), transparent)',
            animation: 'mm-shimmer 4s ease-in-out infinite 1s',
          }} />

          <h2 style={{
            fontSize: 15, fontWeight: 600, color: 'var(--mm-text-primary)',
            textAlign: 'center', margin: '0 0 24px 0',
          }}>
            Sign in to your account
          </h2>

          {error && (
            <div style={{
              background: 'var(--mm-accent-danger-muted)',
              border: '1px solid rgba(248,113,113,0.3)',
              color: 'var(--mm-accent-danger)',
              padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 20,
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--mm-text-secondary)', marginBottom: 6, letterSpacing: '0.03em' }}>
                Email Address
              </label>
              <input type="email" autoComplete="email" value={email}
                onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com"
                disabled={isLoading} style={inputStyle}
                onFocus={(e) => { e.target.style.borderColor = 'var(--mm-accent-primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(6,182,212,0.1)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'var(--mm-border)'; e.target.style.boxShadow = 'none'; }}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--mm-text-secondary)', marginBottom: 6, letterSpacing: '0.03em' }}>
                Password
              </label>
              <input type="password" autoComplete="current-password" value={password}
                onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password"
                disabled={isLoading} style={inputStyle}
                onFocus={(e) => { e.target.style.borderColor = 'var(--mm-accent-primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(6,182,212,0.1)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'var(--mm-border)'; e.target.style.boxShadow = 'none'; }}
              />
            </div>

            <div style={{ textAlign: 'right', marginBottom: 24 }}>
              <Link to="/forgot-password" style={{ fontSize: 12, color: 'var(--mm-accent-primary)', textDecoration: 'none' }}>
                Forgot password?
              </Link>
            </div>

            <button type="submit" disabled={isLoading} style={{
              width: '100%', padding: '12px 20px', fontSize: 14, fontWeight: 600,
              color: '#fff', background: 'linear-gradient(135deg, #0891b2, #06b6d4)',
              border: 'none', borderRadius: 8,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1,
              transition: 'all 0.2s',
              boxShadow: '0 2px 12px rgba(6,182,212,0.25)',
              fontFamily: "'Inter', sans-serif",
              position: 'relative', overflow: 'hidden',
            }}>
              {isLoading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <div style={{
            textAlign: 'center', marginTop: 24, paddingTop: 20,
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
          display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24, flexWrap: 'wrap',
          animation: 'mm-fade-up 0.7s ease 0.6s both',
        }}>
          {['Conveyor Layout', 'Simulation', 'Robot Planning', 'Palletizing'].map((tag, i) => (
            <span key={tag} style={{
              fontSize: 11, color: 'var(--mm-text-tertiary)', padding: '5px 12px',
              borderRadius: 20, border: '1px solid var(--mm-border-subtle)',
              background: 'var(--mm-bg-panel)',
              animation: `mm-fade-up 0.5s ease ${0.7 + i * 0.08}s both`,
            }}>
              {tag}
            </span>
          ))}
        </div>

        {/* ─── Footer ─── */}
        <p style={{
          textAlign: 'center', fontSize: 11, color: 'var(--mm-text-disabled)', marginTop: 32,
          animation: 'mm-fade-up 0.7s ease 1s both',
        }}>
          © 2025 MetaMech Solutions · metamechsolutions.com
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
