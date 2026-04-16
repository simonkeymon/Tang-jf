import type { InputHTMLAttributes } from 'react';

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{
        width: '100%',
        padding: '0.8rem 0.9rem',
        border: '1px solid rgba(130, 149, 191, 0.24)',
        borderRadius: 14,
        backgroundColor: 'rgba(248, 250, 255, 0.96)',
        ...(props.style ?? {}),
      }}
    />
  );
}
