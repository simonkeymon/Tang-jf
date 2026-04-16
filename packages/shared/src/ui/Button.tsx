import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';

type ButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary' | 'ghost';
  }
>;

export function Button({ children, style, variant = 'primary', ...props }: ButtonProps) {
  const variantStyles =
    variant === 'secondary'
      ? {
          backgroundColor: '#e9efff',
          color: '#2751db',
          border: '1px solid rgba(39, 81, 219, 0.16)',
        }
      : variant === 'ghost'
        ? {
            backgroundColor: 'transparent',
            color: '#2751db',
            border: '1px solid rgba(39, 81, 219, 0.18)',
          }
        : {
            background: 'linear-gradient(135deg, rgba(39, 81, 219, 1), rgba(79, 125, 255, 0.95))',
            color: '#fff',
            border: 'none',
          };

  return (
    <button
      {...props}
      style={{
        padding: '0.8rem 1.25rem',
        borderRadius: 14,
        cursor: 'pointer',
        fontWeight: 600,
        boxShadow: '0 12px 26px rgba(39, 81, 219, 0.15)',
        ...variantStyles,
        ...style,
      }}
    >
      {children}
    </button>
  );
}
