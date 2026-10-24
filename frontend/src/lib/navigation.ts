export function safeInternalPath(value: string | null): string | null {
  if (!value) return null;
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return null;
  for (let index = 0; index < value.length; index += 1) {
    if (value.charCodeAt(index) < 0x20) return null;
  }
  return value;
}
