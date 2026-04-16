import type { CSSProperties, PropsWithChildren } from 'react';

import { joinClassNames } from './classNames.js';

export function PageContainer({
  children,
  className,
  style,
}: PropsWithChildren<{ className?: string; style?: CSSProperties }>) {
  return (
    <main className={joinClassNames('ui-page-container', className)} style={style}>
      {children}
    </main>
  );
}
