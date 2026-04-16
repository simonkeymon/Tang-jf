import type { CSSProperties, PropsWithChildren } from 'react';

export function PageContainer({
  children,
  className,
  style,
}: PropsWithChildren<{ className?: string; style?: CSSProperties }>) {
  return (
    <main
      className={className ?? 'page-container'}
      style={{
        maxWidth: 1040,
        margin: '0 auto',
        padding: '24px 16px 104px',
        ...style,
      }}
    >
      {children}
    </main>
  );
}
