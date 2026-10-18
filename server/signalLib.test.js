import { describe, expect, it } from 'vitest';
import {
  MAX_ROOM_LEN,
  MAX_ROOM_PEERS,
  cleanRoom,
  cleanStr,
  pickNextHost,
  validSignalData
} from './signalLib.js';

describe('cleanRoom', () => {
  it('uppercases and keeps only A-Z, 0-9 and dashes', () => {
    expect(cleanRoom('  meet-42 ')).toBe('MEET-42');
    expect(cleanRoom('a b/c')).toBe('ABC');
  });

  it('rejects empty or junk input', () => {
    expect(cleanRoom(null)).toBe('');
    expect(cleanRoom('   ')).toBe('');
    expect(cleanRoom('<script>')).toBe('SCRIPT');
  });

  it('truncates to MAX_ROOM_LEN', () => {
    expect(cleanRoom('x'.repeat(200))).toHaveLength(MAX_ROOM_LEN);
  });
});

describe('cleanStr', () => {
  it('returns empty string for non-strings', () => {
    expect(cleanStr(123, 5)).toBe('');
    expect(cleanStr(null, 5)).toBe('');
  });

  it('truncates strings to max', () => {
    expect(cleanStr('hello world', 5)).toBe('hello');
  });
});

describe('validSignalData', () => {
  it('accepts sdp and candidate payloads', () => {
    expect(validSignalData({ sdp: { type: 'offer', sdp: 'v=0' } })).toBe(true);
    expect(validSignalData({ candidate: { candidate: 'candidate:...' } })).toBe(true);
  });

  it('rejects everything else', () => {
    expect(validSignalData(null)).toBe(false);
    expect(validSignalData('string')).toBe(false);
    expect(validSignalData({})).toBe(false);
    expect(validSignalData({ sdp: 'not-an-object' })).toBe(false);
  });
});

describe('pickNextHost', () => {
  it('keeps the current host when another peer leaves', () => {
    expect(pickNextHost(['a', 'b'], 'b', 'a')).toBe('a');
  });

  it('promotes the first remaining peer when the host leaves', () => {
    expect(pickNextHost(['b', 'c'], 'a', 'a')).toBe('b');
  });

  it('returns null when the room empties', () => {
    expect(pickNextHost([], 'a', 'a')).toBe(null);
  });
});

describe('limits', () => {
  it('caps rooms at 8 participants', () => {
    expect(MAX_ROOM_PEERS).toBe(8);
  });
});
