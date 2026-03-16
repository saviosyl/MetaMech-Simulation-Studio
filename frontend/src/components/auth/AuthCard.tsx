import React from 'react';

interface AuthCardProps {
  children: React.ReactNode;
}

const AuthCard: React.FC<AuthCardProps> = ({ children }) => (
  <div
    style={{
      width: '100%',
      maxWidth: 460,
      margin: '0 auto',
      borderRadius: 'var(--mm-radius-xl)',
      border: '1px solid var(--mm-border-subtle)',
      background: 'var(--mm-bg-surface)',
      boxShadow: 'var(--mm-shadow-md)',
      padding: 'clamp(20px, 3vw, 40px)',
      backdropFilter: 'blur(6px)',
    }}
  >
    {children}
  </div>
);

export default AuthCard;
