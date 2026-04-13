import type { CSSProperties, PropsWithChildren } from 'react';

export function Card({ children, style }: PropsWithChildren<{ style?: CSSProperties }>) {
  return (
    <div
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        padding: 16,
        backgroundColor: '#fff',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
