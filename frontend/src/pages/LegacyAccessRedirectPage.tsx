import React from 'react';
import { Navigate, useLocation, useSearchParams } from 'react-router-dom';

interface LegacyAccessRedirectPageProps {
  target: 'signin' | 'signup' | 'verify' | 'membership' | 'forgot' | 'reset';
}

const LegacyAccessRedirectPage: React.FC<LegacyAccessRedirectPageProps> = ({ target }) => {
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const next = searchParams.get('next');
  const email = searchParams.get('email');
  const token = searchParams.get('token');

  if (target === 'forgot') {
    const params = new URLSearchParams();
    if (next) params.set('next', next);
    return <Navigate to={`/simulation/access/forgot-password${params.toString() ? `?${params.toString()}` : ''}`} replace state={location.state} />;
  }

  if (target === 'reset') {
    const params = new URLSearchParams();
    if (token) params.set('token', token);
    if (next) params.set('next', next);
    return <Navigate to={`/simulation/access/reset-password${params.toString() ? `?${params.toString()}` : ''}`} replace state={location.state} />;
  }

  const params = new URLSearchParams();
  if (next) params.set('next', next);

  if (target === 'signin' || target === 'signup') {
    params.set('mode', target);
  } else {
    params.set('state', target);
    if (email) params.set('email', email);
    if (token) params.set('token', token);
  }

  return <Navigate to={`/simulation/access?${params.toString()}`} replace state={location.state} />;
};

export default LegacyAccessRedirectPage;

