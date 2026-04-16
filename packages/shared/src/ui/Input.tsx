import type { InputHTMLAttributes } from 'react';

import { joinClassNames } from './classNames.js';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={joinClassNames('ui-input', className)} />;
}
