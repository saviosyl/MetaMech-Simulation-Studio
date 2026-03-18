import React from 'react';

type AuthMessageTone = 'error' | 'success' | 'info';

interface AuthMessageProps {
  tone: AuthMessageTone;
  children: React.ReactNode;
}

const palette: Record<AuthMessageTone, { border: string; background: string; text: string }> = {
  error: {
    border: 'rgba(220,38,38,0.28)',
    background: 'rgba(220,38,38,0.08)',
    text: 'var(--mm-accent-danger)',
  },
  success: {
    border: 'rgba(5,150,105,0.24)',
    background: 'rgba(5,150,105,0.08)',
    text: 'var(--mm-accent-success)',
  },
  info: {
    border: 'rgba(8,145,178,0.24)',
    background: 'rgba(8,145,178,0.08)',
    text: 'var(--mm-accent-primary)',
  },
};

const AuthMessage: React.FC<AuthMessageProps> = ({ tone, children }) => {
  const style = palette[tone];
  return (
    <div
      style={{
        marginBottom: 'var(--mm-space-5)',
        borderRadius: 'var(--mm-radius-md)',
        border: `1px solid ${style.border}`,
        background: style.background,
        color: style.text,
        padding: '10px 12px',
        fontSize: 13,
        lineHeight: 1.5,
      }}
    >
      {children}
    </div>
  );
};

export default AuthMessage;
