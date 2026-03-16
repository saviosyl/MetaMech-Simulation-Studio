import React from 'react';

interface AuthInputProps {
  id: string;
  name?: string;
  label: string;
  type?: React.HTMLInputTypeAttribute;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  autoComplete?: string;
  disabled?: boolean;
  error?: string;
}

const AuthInput: React.FC<AuthInputProps> = ({
  id,
  name,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  autoComplete,
  disabled,
  error,
}) => (
  <div style={{ marginBottom: 'var(--mm-space-4)' }}>
    <label
      htmlFor={id}
      style={{
        display: 'block',
        marginBottom: 8,
        fontSize: 14,
        fontWeight: 600,
        color: 'var(--mm-text-secondary)',
      }}
    >
      {label}
    </label>
    <input
      id={id}
      name={name}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      autoComplete={autoComplete}
      disabled={disabled}
      className="mm-auth-input"
      style={{
        width: '100%',
        height: 48,
        padding: '0 14px',
        borderRadius: 'var(--mm-radius-md)',
        border: `1px solid ${error ? 'rgba(220,38,38,0.45)' : 'var(--mm-border)'}`,
        background: error ? 'rgba(220,38,38,0.04)' : 'var(--mm-bg-input)',
        color: 'var(--mm-text-primary)',
        fontSize: 14,
        outline: 'none',
        transition: 'all 0.15s ease',
      }}
    />
    {error ? (
      <div style={{ fontSize: 12, color: 'var(--mm-accent-danger)', marginTop: 6 }}>
        {error}
      </div>
    ) : null}
  </div>
);

export default AuthInput;
