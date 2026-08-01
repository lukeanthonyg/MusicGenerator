import { Composition, ParsedPrompt, Track, Note, Section, InstrumentType } from './types';
import { randomSeed, clampBars } from './utils';

const scaleDegrees = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  aeolian: [0, 2, 3, 5, 7, 8, 10]
};

const keyBase = {
  c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11
};

const chordPatterns: Record<string, number[]> = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  diminished: [0, 3, 6]
};

const instrumentDefaults: InstrumentType[] = ['piano', 'pad', 'bass', 'drums'];

const createTrack = (id: string, name: string, instrument: InstrumentType): Track => ({
  id,
  name,
  instrument,
  muted: false,
  solo: false,
  volume: 1,
  notes: []
});

const createNote = (trackId: string, pitch: number, start: number, duration: number, velocity: number, index: number): Note => ({
  id: `${trackId}-${start.toFixed(3)}-${pitch}-${index}`,
  pitch,
  start,
  duration,
  velocity,
  trackId
});

const buildScale = (key: string, mode: string): number[] => {
  const base = keyBase[key as keyof typeof keyBase] ?? 0;
  const degrees = scaleDegrees[mode as keyof typeof scaleDegrees] ?? scaleDegrees.major;
  return degrees.map((degree) => (base + degree) % 12);
};

const chooseChordProgression = (mode: string, rng: () => number): number[] => {
  const common = mode === 'minor' ? [0, 3, 4, 5] : [0, 4, 5, 3];
  const progression = [common[0], common[1], common[2], common[3]];
  return progression.map((degree) => degree + (rng() < 0.2 ? 7 : 0));
};

const noteForScale = (scale: number[], octave: number, degree: number) => 12 * (octave + 1) + scale[degree % scale.length];

const buildChordNotes = (rootMidi: number, type: 'major' | 'minor' | 'diminished') => chordPatterns[type].map((interval) => rootMidi + interval);

const pick = <T>(list: T[], rng: () => number) => list[Math.floor(rng() * list.length)];

export const generateComposition = (parsed: ParsedPrompt, seed: number): Composition => {
  const rng = randomSeed(seed);
  const bars = clampBars(parsed.bars);
  const beatsPerBar = parsed.timeSignature[0];
  const totalBeats = bars * beatsPerBar;
  const scale = buildScale(parsed.key, parsed.mode);
  const keyMidi = keyBase[parsed.key as keyof typeof keyBase] ?? 0;
  const chordProg = chooseChordProgression(parsed.mode, rng);
  const timeSig = parsed.timeSignature;
  const duration = totalBeats * (60 / parsed.tempo);

  const tracks: Track[] = [];
  const chosenInstruments = parsed.instruments.length ? parsed.instruments.slice(0, 4) as InstrumentType[] : instrumentDefaults;
  const trackTypes: InstrumentType[] = chosenInstruments.map((inst) => {
    if (inst === 'synth' || inst === 'lead') return 'lead';
    if (inst === 'strings' || inst === 'pad') return 'pad';
    if (inst === 'guitar' || inst === 'plucked') return 'pluck';
    if (inst === 'drums') return 'drums';
    if (inst === 'bass') return 'bass';
    return 'piano';
  });

  tracks.push(createTrack('track-melody', 'Melody', trackTypes[0] ?? 'piano'));
  tracks.push(createTrack('track-harmony', 'Harmony', trackTypes[1] ?? 'pad'));
  tracks.push(createTrack('track-bass', 'Bass', trackTypes[2] ?? 'bass'));
  tracks.push(createTrack('track-drums', 'Drums', 'drums'));

  const sections: Section[] = [];
  const sectionCount = Math.min(3, Math.max(1, Math.ceil(bars / 4)));
  const sectionLength = Math.floor(bars / sectionCount);
  for (let i = 0; i < sectionCount; i += 1) {
    sections.push({
      name: i === 0 ? 'Intro' : i === sectionCount - 1 ? 'Ending' : 'Middle',
      startBar: i * sectionLength,
      endBar: i === sectionCount - 1 ? bars : (i + 1) * sectionLength
    });
  }

  const chordRoots = chordProg.map((degree) => 12 + noteForScale(scale, 2, degree));
  const chordDuration = beatsPerBar * (1 / 1);
  const harmonyTrack = tracks.find((track) => track.id === 'track-harmony');
  const melodyTrack = tracks.find((track) => track.id === 'track-melody');
  const bassTrack = tracks.find((track) => track.id === 'track-bass');
  const drumsTrack = tracks.find((track) => track.id === 'track-drums');

  chordRoots.forEach((root, idx) => {
    const startBeat = idx * chordDuration;
    const chordType = idx % 3 === 1 && parsed.mode !== 'major' ? 'minor' : 'major';
    const chordNotes = buildChordNotes(root, chordType as 'major' | 'minor' | 'diminished');
    if (harmonyTrack) {
      harmonyTrack.notes.push(...chordNotes.map((pitch, noteIdx) => createNote(harmonyTrack.id, pitch, startBeat, chordDuration, 0.5, idx * 10 + noteIdx)));
    }
    if (bassTrack) {
      const bassPitch = noteForScale(scale, 1, chordProg[idx] % scale.length) - 12;
      bassTrack.notes.push(createNote(bassTrack.id, bassPitch, startBeat, beatsPerBar, 0.7, idx));
    }
  });

  if (melodyTrack) {
    let previousDegree = 0;
    for (let bar = 0; bar < bars; bar += 1) {
      const chordIndex = Math.min(chordRoots.length - 1, bar);
      const chordRoot = chordRoots[chordIndex];
      const phraseLength = rng() < 0.5 ? 2 : 4;
      let position = bar * beatsPerBar;
      for (let step = 0; step < phraseLength; step += 1) {
        const degree = (previousDegree + Math.floor(rng() * 3) - 1 + scale.length) % scale.length;
        previousDegree = degree;
        const pitch = noteForScale(scale, 3, degree);
        const duration = Math.max(0.25, beatsPerBar / phraseLength);
        melodyTrack.notes.push(createNote(melodyTrack.id, pitch, position, duration, 0.9, bar * 10 + step));
        position += duration;
      }
    }
  }

  if (drumsTrack) {
    for (let bar = 0; bar < bars; bar += 1) {
      const start = bar * beatsPerBar;
      for (let beat = 0; beat < beatsPerBar; beat += 1) {
        drumsTrack.notes.push(createNote(drumsTrack.id, 36, start + beat, 0.25, 0.9, bar * beatsPerBar + beat));
        if (beat % 2 === 0) {
          drumsTrack.notes.push(createNote(drumsTrack.id, 38, start + beat + 0.5, 0.25, 0.7, bar * beatsPerBar + beat + 100));
        }
      }
    }
  }

  return {
    id: `composition-${seed}-${Date.now()}`,
    prompt: parsed.prompt,
    seed,
    interpretation: {
      moods: parsed.mood,
      style: parsed.style,
      key: parsed.key.toUpperCase(),
      mode: parsed.mode,
      tempo: parsed.tempo,
      timeSignature: `${timeSig[0]}/${timeSig[1]}`,
      bars,
      instruments: chosenInstruments,
      structure: parsed.structure,
      descriptors: [...parsed.texture, ...parsed.energy]
    },
    tempo: parsed.tempo,
    key: parsed.key,
    mode: parsed.mode,
    timeSignature: timeSig,
    bars,
    duration,
    tracks,
    sections,
    createdAt: new Date().toISOString()
  };
};
