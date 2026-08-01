import { describe, it, expect } from 'vitest';
import { parsePrompt, randomSeed } from '../src/utils';

describe('parsePrompt', () => {
  it('detects mood key tempo and bars', () => {
    const parsed = parsePrompt('Create a cheerful 8-bar piano piece in C major at 110 BPM.');
    expect(parsed.mood).toContain('happy');
    expect(parsed.key).toBe('c');
    expect(parsed.mode).toBe('major');
    expect(parsed.tempo).toBe(110);
    expect(parsed.bars).toBe(8);
  });

  it('uses defaults for missing values', () => {
    const parsed = parsePrompt('Generate cinematic music.');
    expect(parsed.style).toBe('cinematic');
    expect(parsed.tempo).toBeGreaterThan(0);
    expect(parsed.bars).toBe(8);
  });
});

describe('randomSeed', () => {
  it('reproduces deterministic numbers for same seed', () => {
    const a = randomSeed(123);
    const b = randomSeed(123);
    expect(a()).toBe(b());
    expect(a()).toBe(b());
  });
});
