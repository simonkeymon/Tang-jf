import type { CSSProperties, PropsWithChildren } from 'react';

import { joinClassNames } from './classNames.js';

export function Card({
  children,
  style,
  className,
}: PropsWithChildren<{ style?: CSSProperties; className?: string }>) {
  return (
    <div className={joinClassNames('ui-card', className)} style={style}>
      {children}
    </div>
  );
}
