import React from 'react';

interface AuthHeaderProps {
  title: string;
  subtitle: string;
}

const AuthHeader: React.FC<AuthHeaderProps> = ({ title, subtitle }) => (
  <div style={{ textAlign: 'center', marginBottom: 'var(--mm-space-6)' }}>
    <img
      src="/simulation-studio-logo.png"
      alt="Simulation Studio"
      style={{
        width: 'min(100%, 320px)',
        height: 56,
        objectFit: 'cover',
        objectPosition: 'center 45%',
        margin: '0 auto 14px',
        borderRadius: 10,
      }}
    />
    <h1
      style={{
        fontSize: 'clamp(28px, 3.4vw, 32px)',
        fontWeight: 700,
        color: 'var(--mm-text-primary)',
        margin: '0 0 8px',
        letterSpacing: '-0.01em',
      }}
    >
      {title}
    </h1>
    <p
      style={{
        margin: 0,
        fontSize: 15,
        fontWeight: 500,
        color: 'var(--mm-text-tertiary)',
        lineHeight: 1.55,
      }}
    >
      {subtitle}
    </p>
  </div>
);

export default AuthHeader;
