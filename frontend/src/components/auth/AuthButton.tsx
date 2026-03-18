import React from 'react';

interface AuthButtonProps {
  children: React.ReactNode;
  loadingText?: string;
  isLoading?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  onClick?: () => void;
}

const AuthButton: React.FC<AuthButtonProps> = ({
  children,
  loadingText = 'Working...',
  isLoading,
  disabled,
  type = 'button',
  onClick,
}) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled || isLoading}
    className="mm-auth-button"
    style={{
      width: '100%',
      height: 50,
      borderRadius: '14px',
      border: 'none',
      background: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)',
      color: '#ffffff',
      fontSize: 15,
      fontWeight: 600,
      letterSpacing: '0.01em',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      cursor: 'pointer',
      opacity: disabled || isLoading ? 0.7 : 1,
      transition: 'opacity 0.15s ease, transform 0.15s ease',
      boxShadow: '0 8px 20px rgba(8,145,178,0.25)',
    }}
  >
    {isLoading ? (
      <>
        <span
          style={{
            width: 14,
            height: 14,
            borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.5)',
            borderTopColor: '#fff',
            display: 'inline-block',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        {loadingText}
      </>
    ) : (
      children
    )}
  </button>
);

export default AuthButton;
