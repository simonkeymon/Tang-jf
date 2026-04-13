import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';

type ButtonProps = PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>;

export function Button({ children, style, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      style={{
        padding: '0.8rem 1.25rem',
        backgroundColor: '#0070f3',
        color: '#fff',
        border: 'none',
        borderRadius: 8,
        cursor: 'pointer',
        ...style,
      }}
    >
      {children}
    </button>
  );
}
