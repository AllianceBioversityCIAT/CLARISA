export function classNameCleaner(className: string): string {
  const matcher = /class\s+(\w+)/;
  return matcher.test(className) ? className.match(matcher)[1] : className;
}
