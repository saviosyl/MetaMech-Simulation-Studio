import React from 'react';

interface AuthHeaderProps {
  title: string;
  subtitle: string;
}

const AuthHeader: React.FC<AuthHeaderProps> = ({ title, subtitle }) => (
  <div style={{ textAlign: 'center', marginBottom: 'var(--mm-space-6)' }}>
    <img
      src="/metamech-logo.png"
      alt="MetaMech"
      style={{ height: 44, maxWidth: 220, objectFit: 'contain', margin: '0 auto 16px' }}
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
