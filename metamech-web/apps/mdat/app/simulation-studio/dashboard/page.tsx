'use client';

import { useEffect } from 'react';

/**
 * Redirect to the new MetaMech Simulation Studio
 * The full studio is now hosted at metamech-studio.pages.dev
 */
export default function DashboardRedirect() {
  useEffect(() => {
    window.location.href = 'https://metamech-studio.pages.dev/dashboard';
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4" />
        <p className="text-gray-400 text-lg">Redirecting to MetaMech Simulation Studio...</p>
        <a 
          href="https://metamech-studio.pages.dev/dashboard" 
          className="text-cyan-400 hover:text-cyan-300 text-sm mt-2 inline-block"
        >
          Click here if not redirected
        </a>
      </div>
    </div>
  );
}
