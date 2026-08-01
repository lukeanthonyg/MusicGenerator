export type InstrumentType = 'piano' | 'bass' | 'pad' | 'lead' | 'pluck' | 'drums';

export interface Note {
  id: string;
  pitch: number;
  start: number;
  duration: number;
  velocity: number;
  trackId: string;
}

export interface Track {
  id: string;
  name: string;
  instrument: InstrumentType;
  muted: boolean;
  solo: boolean;
  volume: number;
  notes: Note[];
}

export interface Section {
  name: string;
  startBar: number;
  endBar: number;
}

export interface Interpretation {
  moods: string[];
  style: string;
  key: string;
  mode: string;
  tempo: number;
  timeSignature: string;
  bars: number;
  instruments: string[];
  structure: string[];
  descriptors: string[];
}

export interface Composition {
  id: string;
  prompt: string;
  seed: number;
  interpretation: Interpretation;
  tempo: number;
  key: string;
  mode: string;
  timeSignature: [number, number];
  bars: number;
  duration: number;
  tracks: Track[];
  sections: Section[];
  createdAt: string;
}

export interface ParsedPrompt {
  prompt: string;
  mood: string[];
  style: string;
  instruments: string[];
  tempo: number;
  key: string;
  mode: string;
  timeSignature: [number, number];
  bars: number;
  structure: string[];
  texture: string[];
  energy: string[];
  loop: boolean;
  durationSeconds?: number;
}
