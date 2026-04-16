import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';

import { joinClassNames } from './classNames.js';

type ButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary' | 'ghost';
  }
>;

export function Button({
  children,
  className,
  variant = 'primary',
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      data-variant={variant}
      className={joinClassNames('ui-button', className)}
    >
      {children}
    </button>
  );
}
