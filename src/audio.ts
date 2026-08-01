import { Composition, Track, Note, InstrumentType } from './types';

const chooseWave = (type: InstrumentType): OscillatorNode['type'] => {
  if (type === 'bass') return 'sawtooth';
  if (type === 'lead') return 'square';
  if (type === 'pad') return 'sine';
  return 'triangle';
};

const frequencyFromMidi = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

export class AudioEngine {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private scheduled: OscillatorNode[] = [];
  private composition: Composition | null = null;
  private startTime = 0;
  private pauseOffset = 0;
  private isPlaying = false;
  private tempo = 120;
  private volume = 1;
  private trackStates: Record<string, { muted: boolean; volume: number }> = {};

  private ensureContext() {
    if (!this.context) {
      this.context = new AudioContext();
      this.masterGain = this.context.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.context.destination);
    }
  }

  initialize(): Promise<void> {
    this.ensureContext();
    return Promise.resolve();
  }

  setVolume(value: number) {
    this.volume = value;
    if (this.masterGain) this.masterGain.gain.value = value;
  }

  setTempo(bpm: number) {
    this.tempo = bpm;
  }

  setTrackState(trackId: string, muted: boolean, volume: number) {
    this.trackStates[trackId] = { muted, volume };
  }

  setComposition(composition: Composition) {
    this.composition = composition;
    this.tempo = composition.tempo;
    this.trackStates = {};
    composition.tracks.forEach((track) => {
      this.trackStates[track.id] = { muted: track.muted, volume: track.volume };
    });
  }

  play(offset = 0) {
    if (!this.composition) return;
    this.ensureContext();
    if (!this.context) return;
    if (this.context.state === 'suspended') {
      this.context.resume();
    }
    this.stop();
    this.startTime = this.context.currentTime - offset;
    this.isPlaying = true;
    this.scheduleNotes(offset);
  }

  pause() {
    if (!this.context || !this.isPlaying) return;
    this.pauseOffset = this.currentTime();
    this.stop();
    this.isPlaying = false;
  }

  stop() {
    this.scheduled.forEach((osc) => {
      try {
        osc.stop();
      } catch {
        // ignore
      }
    });
    this.scheduled = [];
  }

  currentTime() {
    if (!this.context || !this.isPlaying) return this.pauseOffset;
    return Math.max(0, this.context.currentTime - this.startTime);
  }

  seek(time: number) {
    if (!this.composition) return;
    this.pauseOffset = Math.max(0, Math.min(time, this.composition.duration));
    if (this.isPlaying) {
      this.play(this.pauseOffset);
    }
  }

  private scheduleNotes(offset: number) {
    if (!this.context || !this.composition) return;
    const now = this.context.currentTime;
    const lookAhead = 0.1;
    const activeTracks = this.composition.tracks.filter((track) => !this.trackStates[track.id]?.muted);
    const notes = activeTracks.flatMap((track) => track.notes.map((note) => ({ track, note })));
    notes.forEach(({ track, note }) => {
      const noteStart = note.start * (60 / this.tempo);
      const noteEnd = noteStart + note.duration * (60 / this.tempo);
      if (noteEnd < offset) return;
      const playbackStart = now + Math.max(0, noteStart - offset);
      const playbackDuration = Math.max(0.05, noteEnd - Math.max(offset, noteStart));
      const oscillator = this.context.createOscillator();
      oscillator.type = chooseWave(track.instrument);
      oscillator.frequency.value = frequencyFromMidi(note.pitch);
      const trackGain = this.context.createGain();
      const volume = (this.trackStates[track.id]?.volume ?? 1) * note.velocity;
      trackGain.gain.setValueAtTime(volume, playbackStart);
      trackGain.gain.linearRampToValueAtTime(0.001, playbackStart + playbackDuration);
      oscillator.connect(trackGain).connect(this.masterGain!);
      oscillator.start(playbackStart);
      oscillator.stop(playbackStart + playbackDuration);
      this.scheduled.push(oscillator);
    });
  }

  getDuration() {
    return this.composition?.duration ?? 0;
  }
}
