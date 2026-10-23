import { describe, expect, it } from 'vitest';
import { ngnToKobo, koboToNgn } from '../src/utils/amount';
import { ApiError } from '../src/utils/errors';

describe('amount conversion', () => {
  it('converts NGN to kobo using integer arithmetic', () => {
    expect(ngnToKobo('1000')).toBe(100000);
    expect(ngnToKobo('1500.50')).toBe(150050);
    expect(ngnToKobo(2000)).toBe(200000);
  });

  it('converts kobo back to NGN', () => {
    expect(koboToNgn(150050)).toBe(1500.5);
  });

  it('rejects invalid decimals', () => {
    expect(() => ngnToKobo('1000.123')).toThrow(ApiError);
  });

  it('rejects non-numeric strings', () => {
    expect(() => ngnToKobo('abc')).toThrow(ApiError);
  });
});
