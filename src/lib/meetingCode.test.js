import { describe, expect, it } from 'vitest';
import { makeMeetingCode, sanitizeMeetingCode } from './meetingCode.js';

describe('makeMeetingCode', () => {
  it('returns 7 characters from the safe uppercase alphabet', () => {
    for (let i = 0; i < 100; i++) {
      expect(makeMeetingCode()).toMatch(/^[A-Z2-9]{7}$/);
    }
  });

  it('never produces ambiguous characters', () => {
    for (let i = 0; i < 200; i++) {
      expect(makeMeetingCode()).not.toMatch(/[01IO]/);
    }
  });

  it('produces unique codes across many draws', () => {
    const codes = new Set(Array.from({ length: 2000 }, () => makeMeetingCode()));
    expect(codes.size).toBe(2000);
  });
});

describe('sanitizeMeetingCode', () => {
  it('uppercases and strips invalid characters', () => {
    expect(sanitizeMeetingCode('  ab cd-ef! ')).toBe('ABCD-EF');
  });

  it('returns empty string for nullish values and coerces numbers', () => {
    expect(sanitizeMeetingCode(null)).toBe('');
    expect(sanitizeMeetingCode(undefined)).toBe('');
    expect(sanitizeMeetingCode(42)).toBe('42');
  });

  it('truncates to the room length limit', () => {
    expect(sanitizeMeetingCode('a'.repeat(100))).toHaveLength(32);
  });
});
