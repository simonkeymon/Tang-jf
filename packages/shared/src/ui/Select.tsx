import type { PropsWithChildren, SelectHTMLAttributes } from 'react';

import { joinClassNames } from './classNames.js';

export function Select({
  children,
  className,
  ...props
}: PropsWithChildren<SelectHTMLAttributes<HTMLSelectElement>>) {
  return (
    <select {...props} className={joinClassNames('ui-select', className)}>
      {children}
    </select>
  );
}
