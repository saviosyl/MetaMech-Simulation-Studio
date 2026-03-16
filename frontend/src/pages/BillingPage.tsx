import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const BillingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, checkAuth, logout } = useAuth();

  const sub = user?.subscription;
  const status = sub?.status || 'none';
  const entitled = !!sub?.entitled;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          <span className="text-teal-600">MetaMech</span> Subscription Required
        </h1>
        <p className="text-gray-600 mb-6">
          Your account is authenticated, but an active subscription is required to use the simulation workspace.
        </p>

        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 mb-6">
          <div className="text-sm text-gray-700 mb-2">
            <strong>Current status:</strong>{' '}
            <span className={`font-semibold ${entitled ? 'text-teal-600' : 'text-amber-600'}`}>
              {status}
            </span>
          </div>
          <div className="text-sm text-gray-700">
            <strong>Period end:</strong> {sub?.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleString() : 'n/a'}
          </div>
          <div className="text-sm text-gray-700">
            <strong>Plan:</strong> {sub?.planCode || 'none'}
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={async () => {
              await checkAuth();
              navigate('/dashboard');
            }}
            className="w-full bg-teal-600 text-white py-3 rounded-lg font-medium hover:bg-teal-700 transition-colors"
          >
            Refresh Subscription Status
          </button>
          <button
            onClick={() => window.alert('Billing portal integration is Phase 2. Update subscription status in DB for now.')}
            className="w-full bg-gray-900 text-white py-3 rounded-lg font-medium hover:bg-black transition-colors"
          >
            Renew / Manage Subscription
          </button>
          <button
            onClick={logout}
            className="w-full bg-white text-gray-700 py-3 rounded-lg font-medium border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default BillingPage;
