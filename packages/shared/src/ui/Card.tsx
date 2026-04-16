import type { CSSProperties, PropsWithChildren } from 'react';

export function Card({
  children,
  style,
  className,
}: PropsWithChildren<{ style?: CSSProperties; className?: string }>) {
  return (
    <div
      className={className}
      style={{
        border: '1px solid rgba(130, 149, 191, 0.2)',
        borderRadius: 20,
        padding: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.92)',
        boxShadow: '0 14px 38px rgba(37, 54, 88, 0.08)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
