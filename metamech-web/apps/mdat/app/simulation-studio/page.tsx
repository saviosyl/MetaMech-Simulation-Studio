'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Mail, Lock, Eye, EyeOff, ArrowRight, Crown, LogIn } from 'lucide-react';

// ============================================================
// ADMIN ACCOUNTS — Premium Plus subscribers
// In production, move this to a backend API + database.
// For now, this allows you to test the simulation tool.
// ============================================================
const ADMIN_ACCOUNTS = [
  { email: 'saviosyl@gmail.com', password: '@Meta123456', role: 'admin' },
];

// The URL of the Simulation Studio app (integrated into this app)
const STUDIO_URL = 'https://metamech-studio.pages.dev';

export default function SimulationStudioPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [authenticated, setAuthenticated] = useState(false);

  // Check if already logged in
  useEffect(() => {
    const session = localStorage.getItem('sim_studio_session');
    if (session) {
      try {
        const data = JSON.parse(session);
        if (data.expires > Date.now()) {
          setAuthenticated(true);
        } else {
          localStorage.removeItem('sim_studio_session');
        }
      } catch {
        localStorage.removeItem('sim_studio_session');
      }
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Simulate network delay for UX
    setTimeout(() => {
      const account = ADMIN_ACCOUNTS.find(
        (a) => a.email.toLowerCase() === email.toLowerCase() && a.password === password
      );

      if (!account) {
        setError('Invalid credentials or this email is not linked to a Premium Plus subscription.');
        setLoading(false);
        return;
      }

      // Store session (7 days)
      const session = {
        email: account.email,
        role: account.role,
        expires: Date.now() + 7 * 24 * 3600 * 1000,
      };
      localStorage.setItem('sim_studio_session', JSON.stringify(session));

      // Generate a simple auth token for the simulation app
      const token = btoa(JSON.stringify({ email: account.email, role: account.role, exp: session.expires }));

      setAuthenticated(true);
      setLoading(false);

      // Redirect to integrated simulation studio dashboard
      window.location.href = STUDIO_URL;
    }, 800);
  };

  const handleLogout = () => {
    localStorage.removeItem('sim_studio_session');
    setAuthenticated(false);
    setEmail('');
    setPassword('');
  };

  const handleGoToStudio = () => {
    window.location.href = STUDIO_URL;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy via-navy-light to-navy flex flex-col">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-[400px] h-[400px] bg-teal/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-20 right-10 w-[300px] h-[300px] bg-gold/8 rounded-full blur-[100px]" />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(6, 182, 212, 0.5) 1px, transparent 1px),
              linear-gradient(90deg, rgba(6, 182, 212, 0.5) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* Top Bar */}
      <div className="relative z-10 w-full px-6 py-4">
        <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-cyan-400 transition-colors">
          <ArrowLeft size={18} />
          <span className="text-sm">Back to MetaMech</span>
        </Link>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 pb-12">
        <div className="w-full max-w-md">
          {/* Logo & Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center mb-4">
              <div className="relative p-2 rounded-xl bg-white border-2 border-cyan-500/40 shadow-[0_0_30px_rgba(6,182,212,0.4)]">
                <Image
                  src="/metamech-logo.png"
                  alt="MetaMech"
                  width={48}
                  height={48}
                  className="h-12 w-auto"
                />
              </div>
            </div>
            <h1 className="font-orbitron text-2xl sm:text-3xl font-bold text-white mb-2">
              <span className="text-gradient-teal">Simulation</span>{' '}
              <span className="text-gradient-gold">Studio</span>
            </h1>
            <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-gold/10 border border-gold/20 rounded-full">
              <Crown size={14} className="text-gold" />
              <span className="text-xs font-medium text-gold">Premium Plus Exclusive</span>
            </div>
          </div>

          {/* Already authenticated */}
          {authenticated ? (
            <div className="glass-card p-8 border border-white/10 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-teal/10 border border-teal/20 flex items-center justify-center">
                <Crown size={28} className="text-teal" />
              </div>
              <h2 className="font-orbitron text-lg text-white mb-2">Welcome Back!</h2>
              <p className="text-sm text-gray-400 mb-6">You&apos;re logged in as a Premium Plus member.</p>
              <button
                onClick={handleGoToStudio}
                className="w-full py-3 bg-gradient-to-r from-teal to-teal-light text-navy font-bold rounded-lg hover:shadow-glow-teal transition-all duration-300 flex items-center justify-center gap-2 mb-3"
              >
                Open Simulation Studio
                <ArrowRight size={16} />
              </button>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
              >
                Sign out
              </button>
            </div>
          ) : (
            /* Login Form */
            <div className="glass-card p-8 border border-white/10">
              <div className="flex items-center gap-2 mb-6">
                <LogIn size={18} className="text-teal" />
                <h2 className="font-orbitron text-lg text-white">Sign In</h2>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Email</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your-email@company.com"
                      required
                      className="w-full pl-10 pr-4 py-3 bg-navy/60 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/50 transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full pl-10 pr-12 py-3 bg-navy/60 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/50 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-teal to-teal-light text-navy font-bold rounded-lg hover:shadow-glow-teal transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-navy/30 border-t-navy rounded-full animate-spin" />
                  ) : (
                    <>
                      Sign In &amp; Launch Studio
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-4 border-t border-white/10">
                <p className="text-xs text-gray-500 text-center leading-relaxed">
                  This tool is exclusively available to <strong className="text-gold">Premium Plus</strong> subscribers.
                  Your credentials were sent to the email used for your purchase.
                </p>
              </div>
            </div>
          )}

          <p className="text-center text-xs text-gray-500 mt-6">
            © {new Date().getFullYear()} MetaMech Solutions. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
