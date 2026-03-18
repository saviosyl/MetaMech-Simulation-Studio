import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireSubscription?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requireSubscription = true }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} state={{ from: location }} replace />;
  }

  if (!user.emailVerified) {
    return <Navigate to={`/verify-email?email=${encodeURIComponent(user.email)}&next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  if (requireSubscription && !user.subscription?.entitled) {
    return <Navigate to={`/billing?next=${encodeURIComponent(location.pathname + location.search)}`} state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;