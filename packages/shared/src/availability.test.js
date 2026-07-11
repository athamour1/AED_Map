import { describe, expect, it } from 'vitest';
import { evaluateAvailability, formatSchedule } from './availability.js';

describe('evaluateAvailability', () => {
  it('is false when isAvailable is false, regardless of schedule', () => {
    expect(evaluateAvailability({ isAvailable: false, is24h: true })).toBe(false);
  });

  it('is true for a 24h location that is marked available', () => {
    expect(evaluateAvailability({ isAvailable: true, is24h: true })).toBe(true);
  });

  it('is false when not 24h and no schedule is provided', () => {
    expect(evaluateAvailability({ isAvailable: true, is24h: false, schedule: null })).toBe(false);
  });

  it('is true when the current time falls within today\'s schedule window', () => {
    const now = new Date();
    const currentDay = String(now.getDay());
    const pad = (n) => String(n).padStart(2, '0');
    const open = `${pad(Math.max(0, now.getHours() - 1))}:00`;
    const close = `${pad(Math.min(23, now.getHours() + 1))}:59`;

    const result = evaluateAvailability({
      isAvailable: true,
      is24h: false,
      schedule: { [currentDay]: [{ open, close }] },
    });
    expect(result).toBe(true);
  });

  it('is false when today has no schedule entry', () => {
    const now = new Date();
    const otherDay = String((now.getDay() + 1) % 7);
    const result = evaluateAvailability({
      isAvailable: true,
      is24h: false,
      schedule: { [otherDay]: [{ open: '00:00', close: '23:59' }] },
    });
    expect(result).toBe(false);
  });
});

describe('formatSchedule', () => {
  it('returns "Closed" for an empty or missing schedule', () => {
    expect(formatSchedule(null)).toBe('Closed');
    expect(formatSchedule([])).toBe('Closed');
  });

  it('joins multiple time blocks', () => {
    expect(
      formatSchedule([
        { open: '08:00', close: '12:00' },
        { open: '13:00', close: '17:00' },
      ]),
    ).toBe('08:00 - 12:00, 13:00 - 17:00');
  });
});
