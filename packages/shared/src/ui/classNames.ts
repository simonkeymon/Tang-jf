export function joinClassNames(...values: Array<string | undefined | null | false>) {
  return values.filter(Boolean).join(' ');
}
