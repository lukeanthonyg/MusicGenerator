import { ParsedPrompt } from './types';

const pick = <T>(list: T[], fallback: T): T => list[Math.floor(Math.random() * list.length)] ?? fallback;

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const parsePrompt = (text: string): ParsedPrompt => {
  const lower = text.toLowerCase();

  const moodMap: Record<string, string> = {
    cheerful: 'happy',
    happy: 'happy',
    sad: 'sad',
    mysterious: 'mysterious',
    tense: 'tense',
    peaceful: 'peaceful',
    romantic: 'romantic',
    heroic: 'heroic',
    ominous: 'ominous',
    playful: 'playful',
    dreamy: 'dreamy',
    energetic: 'energetic',
    dark: 'dark',
    triumphant: 'triumphant'
  };
  const styleSynonyms: Record<string, string> = {
    'video game': 'video game',
    'video-game': 'video game',
    'jazz inspired': 'jazz-inspired',
    jazz: 'jazz-inspired'
  };
  const moods = Object.keys(moodMap);
  const styles = ['cinematic', 'orchestral', 'classical', 'electronic', 'ambient', 'pop', 'rock', 'jazz-inspired', 'fantasy', 'video game', 'chiptune', 'lullaby'];
  const instruments = ['piano', 'strings', 'synth', 'bass', 'drums', 'guitar', 'pad', 'brass', 'plucked', 'voice'];
  const keys = ['c', 'd', 'e', 'f', 'g', 'a', 'b'];
  const modes = ['major', 'minor', 'dorian', 'mixolydian', 'phrygian', 'lydian', 'aeolian'];
  const timeSignatures: Array<[number, number]> = [[4, 4], [3, 4], [6, 8], [5, 4], [2, 4]];

  const detectedMoods = moods.reduce<string[]>((result, mood) => {
    if (lower.includes(mood)) {
      result.push(moodMap[mood] ?? mood);
    }
    return result;
  }, []);
  let detectedStyle = styles.find((s) => lower.includes(s));
  if (!detectedStyle) {
    Object.entries(styleSynonyms).forEach(([key, value]) => {
      if (lower.includes(key)) detectedStyle = value;
    });
  }
  detectedStyle = detectedStyle ?? 'cinematic';
  const detectedInstruments = instruments.filter((i) => lower.includes(i)).map((inst) => inst === 'strings' ? 'pad' : inst);
  const detectedKey = keys.find((k) => new RegExp(`\b${k}\b`).test(lower)) ?? 'c';
  const detectedMode = modes.find((m) => lower.includes(m)) ?? 'major';
  const detectedTimeSignature = timeSignatures.find(([num, denom]) => lower.includes(`${num}/${denom}`)) ?? [4, 4];

  const tempoMatch = lower.match(/(\d{2,3})\s*bpm/) || lower.match(/tempo\s*(?:of\s*)?(\d{2,3})/) || lower.match(/(slow|medium|fast|upbeat|energetic|calm|steady)/);
  let tempo = 100;
  if (tempoMatch) {
    const num = Number(tempoMatch[1]);
    if (!Number.isNaN(num)) tempo = clamp(num, 60, 180);
    else if (tempoMatch[1].includes('slow')) tempo = 70;
    else if (tempoMatch[1].includes('fast') || tempoMatch[1].includes('energetic') || tempoMatch[1].includes('upbeat')) tempo = 140;
    else if (tempoMatch[1].includes('medium') || tempoMatch[1].includes('steady')) tempo = 100;
    else if (tempoMatch[1].includes('calm')) tempo = 80;
  }

  const barsMatch = lower.match(/(\d+)\s*-?\s*bar/) || lower.match(/(\d+)\s*measures/) || lower.match(/(\d+)\s*bars/);
  const bars = barsMatch ? clamp(Number(barsMatch[1]), 4, 32) : 8;

  const structure: string[] = [];
  if (/intro/.test(lower)) structure.push('intro');
  if (/verse/.test(lower)) structure.push('verse');
  if (/chorus/.test(lower)) structure.push('chorus');
  if (/climax/.test(lower) || /ending/.test(lower)) structure.push('ending');
  if (/loop/.test(lower) || /repeating/.test(lower)) structure.push('loop');

  const texture: string[] = [];
  ['sparse', 'full', 'rhythmic', 'legato', 'staccato', 'arpeggio', 'pad'].forEach((word) => { if (lower.includes(word)) texture.push(word); });

  const energy: string[] = [];
  if (/starts softly/.test(lower) || /begins softly/.test(lower)) energy.push('soft start');
  if (/builds/.test(lower) || /becomes heroic/.test(lower) || /grows/.test(lower)) energy.push('build');
  if (/quiet/.test(lower) || /gentle/.test(lower)) energy.push('gentle');

  const loop = /loop/.test(lower) || /repeating/.test(lower) || /loopable/.test(lower);

  return {
    prompt: text,
    mood: detectedMoods.length ? detectedMoods : ['mysterious'],
    style: detectedStyle,
    instruments: detectedInstruments.length ? detectedInstruments : ['piano', 'pad'],
    tempo,
    key: detectedKey,
    mode: detectedMode,
    timeSignature: detectedTimeSignature,
    bars,
    structure,
    texture,
    energy,
    loop
  };
};

export const midiNoteNumber = (pitch: string): number => {
  const map: Record<string, number> = { c: 0, 'c#': 1, db: 1, d: 2, 'd#': 3, eb: 3, e: 4, f: 5, 'f#': 6, gb: 6, g: 7, 'g#': 8, ab: 8, a: 9, 'a#': 10, bb: 10, b: 11 };
  return map[pitch.toLowerCase()] ?? 0;
};

export const randomSeed = (seed: number): () => number => {
  let state = seed % 2147483647;
  if (state <= 0) state += 2147483646;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
};

export const identity = (value: string) => value;

export const clampBars = (bars: number) => clamp(bars, 4, 32);
