import type { InputHTMLAttributes } from 'react';

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{
        width: '100%',
        padding: '0.7rem 0.8rem',
        border: '1px solid #d1d5db',
        borderRadius: 8,
        ...(props.style ?? {}),
      }}
    />
  );
}
