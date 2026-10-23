import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  formatCurrency,
  formatDate,
  formatNgn,
  formatTimeAgo,
  getInitials,
  truncateMiddle,
} from './utils';

describe('formatting helpers', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('formats kobo as NGN currency', () => {
    const formatted = formatCurrency(123_456);
    expect(formatted).toContain('1,234.56');
    expect(formatted).toContain('₦');
  });

  it('formats major units without dividing by 100', () => {
    expect(formatNgn(2_500)).toContain('2,500.00');
  });

  it('returns a placeholder for missing dates', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate(undefined)).toBe('—');
  });

  it('describes recent timestamps relative to now', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-23T12:00:00Z'));

    expect(formatTimeAgo(new Date('2026-10-23T11:59:40Z'))).toBe('Just now');
    expect(formatTimeAgo(new Date('2026-10-23T11:35:00Z'))).toBe('25m ago');
    expect(formatTimeAgo(new Date('2026-10-23T09:00:00Z'))).toBe('3h ago');
    expect(formatTimeAgo(new Date('2026-10-21T12:00:00Z'))).toBe('2d ago');
  });

  it('builds initials from the first two name parts', () => {
    expect(getInitials('Ada Lovelace')).toBe('AL');
    expect(getInitials('  payflow   merchant ')).toBe('PM');
    expect(getInitials('Admin')).toBe('A');
  });

  it('truncates long values in the middle', () => {
    expect(truncateMiddle('short', 26)).toBe('short');
    const truncated = truncateMiddle('https://example.com/very/long/webhook/path', 24);
    expect(truncated.length).toBeLessThanOrEqual(24);
    expect(truncated).toContain('...');
    expect(truncated.startsWith('https://')).toBe(true);
  });
});
