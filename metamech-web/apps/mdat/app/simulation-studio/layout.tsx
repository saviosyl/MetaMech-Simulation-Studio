'use client';

export default function SimulationStudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-navy text-white">
      {children}
    </div>
  );
}