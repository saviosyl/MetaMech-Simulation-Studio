import type { CSSProperties, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';

const styles: Record<Variant, CSSProperties> = {
  primary: {
    background: 'linear-gradient(135deg, #3F7CFF 0%, #20C7C9 100%)',
    color: '#FFFFFF',
    border: 'none',
  },
  secondary: {
    background: '#FFFFFF',
    color: '#10263A',
    border: '1px solid #DCE4EC',
  },
  ghost: {
    background: 'transparent',
    color: '#10263A',
    border: '1px solid transparent',
  },
};

export function ButtonLink({
  href,
  children,
  variant = 'primary',
  className = '',
}: {
  href: string;
  children: ReactNode;
  variant?: Variant;
  className?: string;
}) {
  return (
    <a
      href={href}
      className={`mm-btn mm-btn-${variant} ${className}`.trim()}
      style={{
        ...styles[variant],
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        padding: '0.85rem 1.35rem',
        borderRadius: '12px',
        fontWeight: 700,
        fontSize: '0.95rem',
        textDecoration: 'none',
        transition: 'transform var(--mm-duration) var(--mm-ease), box-shadow var(--mm-duration) var(--mm-ease)',
      }}
    >
      {children}
    </a>
  );
}
