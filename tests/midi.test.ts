import { describe, it, expect } from 'vitest';
import { parsePrompt } from '../src/utils';
import { generateComposition } from '../src/composer';
import { exportMidi } from '../src/midi';

describe('MIDI export', () => {
  it('produces a valid nonempty MIDI blob', () => {
    const parsed = parsePrompt('Create a cheerful 8-bar piano piece in C major at 110 BPM.');
    const composition = generateComposition(parsed, 123);
    const blob = exportMidi(composition);
    expect(blob.size).toBeGreaterThan(0);
    expect(blob.type).toBe('audio/midi');
  });

  it('exports a MIDI file with a valid header', async () => {
    const parsed = parsePrompt('Create a cheerful 8-bar piano piece in C major at 110 BPM.');
    const composition = generateComposition(parsed, 456);
    const blob = exportMidi(composition);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const header = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
    expect(header).toBe('MThd');
  });
});
