import { describe, expect, it } from 'vitest';
import { expiryStatus } from './expiryStatus.js';

function daysFromNow(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

describe('expiryStatus', () => {
  it('returns unknown for a missing date', () => {
    expect(expiryStatus(null).level).toBe('unknown');
    expect(expiryStatus(undefined).level).toBe('unknown');
  });

  it('returns critical for a date already in the past', () => {
    expect(expiryStatus(daysFromNow(-5)).level).toBe('critical');
  });

  it('returns critical for a date under 30 days away', () => {
    expect(expiryStatus(daysFromNow(15)).level).toBe('critical');
  });

  it('returns warning for a date between 30 and 90 days away', () => {
    expect(expiryStatus(daysFromNow(60)).level).toBe('warning');
  });

  it('returns ok for a date more than 90 days away', () => {
    expect(expiryStatus(daysFromNow(200)).level).toBe('ok');
  });
});
