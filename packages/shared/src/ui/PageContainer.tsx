import type { PropsWithChildren } from 'react';

export function PageContainer({ children }: PropsWithChildren) {
  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: 16, paddingBottom: 96 }}>
      {children}
    </main>
  );
}
