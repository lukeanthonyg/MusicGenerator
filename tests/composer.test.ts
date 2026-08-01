import { describe, it, expect } from 'vitest';
import { parsePrompt } from '../src/utils';
import { generateComposition } from '../src/composer';

describe('generateComposition', () => {
  it('creates structured composition data', () => {
    const prompt = 'Create a cheerful 8-bar piano piece in C major at 110 BPM.';
    const parsed = parsePrompt(prompt);
    const composition = generateComposition(parsed, 42);
    expect(composition.tracks.length).toBeGreaterThanOrEqual(3);
    expect(composition.duration).toBeGreaterThan(0);
    expect(composition.tracks.some((track) => track.notes.length > 0)).toBe(true);
    expect(composition.tempo).toBe(110);
    expect(composition.key).toBe('c');
  });

  it('is deterministic with same seed', () => {
    const parsed = parsePrompt('Generate a sad 8 bar ambient piece.');
    const a = generateComposition(parsed, 99);
    const b = generateComposition(parsed, 99);
    expect(a.tracks.map((t) => t.notes.length)).toEqual(b.tracks.map((t) => t.notes.length));
  });
});
