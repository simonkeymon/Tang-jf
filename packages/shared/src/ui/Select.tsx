import type { PropsWithChildren, SelectHTMLAttributes } from 'react';

export function Select({
  children,
  ...props
}: PropsWithChildren<SelectHTMLAttributes<HTMLSelectElement>>) {
  return (
    <select
      {...props}
      style={{
        width: '100%',
        padding: '0.7rem 0.8rem',
        border: '1px solid #d1d5db',
        borderRadius: 8,
        ...(props.style ?? {}),
      }}
    >
      {children}
    </select>
  );
}
