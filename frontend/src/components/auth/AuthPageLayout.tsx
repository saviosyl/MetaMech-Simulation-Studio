import React from 'react';

interface AuthPageLayoutProps {
  children: React.ReactNode;
}

const AuthPageLayout: React.FC<AuthPageLayoutProps> = ({ children }) => (
  <div
    style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'clamp(16px, 3vw, 24px)',
      background: `
        radial-gradient(1200px 520px at 10% -10%, rgba(8,145,178,0.1), transparent 60%),
        radial-gradient(900px 420px at 92% 112%, rgba(37,99,235,0.08), transparent 62%),
        linear-gradient(180deg, var(--mm-bg-app) 0%, color-mix(in oklab, var(--mm-bg-app) 90%, #ffffff 10%) 100%)
      `,
      position: 'relative',
      overflow: 'hidden',
    }}
  >
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        opacity: 0.22,
        backgroundImage:
          'linear-gradient(var(--mm-border-subtle) 1px, transparent 1px), linear-gradient(90deg, var(--mm-border-subtle) 1px, transparent 1px)',
        backgroundSize: '64px 64px',
        maskImage: 'radial-gradient(circle at center, black, transparent 78%)',
        pointerEvents: 'none',
      }}
    />
    <div style={{ width: '100%', maxWidth: 480, position: 'relative', zIndex: 1 }}>
      {children}
    </div>
  </div>
);

export default AuthPageLayout;
