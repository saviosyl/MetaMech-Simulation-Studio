import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center px-4">
        <h1 className="font-orbitron text-6xl font-bold text-gradient-teal mb-4">404</h1>
        <h2 className="font-orbitron text-2xl text-white mb-4">Page Not Found</h2>
        <p className="text-gray-400 mb-8 max-w-md mx-auto">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link href="/" className="btn-primary inline-flex items-center gap-2">
          Back to Home
          <ArrowRight size={18} />
        </Link>
      </div>
    </div>
  );
}
