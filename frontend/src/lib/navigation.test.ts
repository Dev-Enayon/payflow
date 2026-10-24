import { describe, expect, it } from 'vitest';
import { safeInternalPath } from './navigation';

describe('safeInternalPath', () => {
  it('allows internal paths', () => {
    expect(safeInternalPath('/admin')).toBe('/admin');
    expect(safeInternalPath('/dashboard?tab=keys#top')).toBe('/dashboard?tab=keys#top');
  });

  it('rejects external and malformed redirect targets', () => {
    expect(safeInternalPath(null)).toBeNull();
    expect(safeInternalPath('https://evil.example')).toBeNull();
    expect(safeInternalPath('//evil.example')).toBeNull();
    expect(safeInternalPath('/\\evil.example')).toBeNull();
    expect(safeInternalPath('/\nevil')).toBeNull();
  });
});
