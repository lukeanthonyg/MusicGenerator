import { Composition, Track, Note } from './types';

const writeString = (view: DataView, offset: number, string: string) => {
  for (let i = 0; i < string.length; i += 1) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
};

const numberToVarInt = (value: number) => {
  const bytes = [];
  let buffer = value & 0x7f;
  while ((value >>= 7)) {
    buffer <<= 8;
    buffer |= ((value & 0x7f) | 0x80);
  }
  while (true) {
    bytes.push(buffer & 0xff);
    if (buffer & 0x80) buffer >>= 8;
    else break;
  }
  return new Uint8Array(bytes);
};

const midiHeader = (tracks: number) => {
  const header = new Uint8Array(14);
  const view = new DataView(header.buffer);
  writeString(view, 0, 'MThd');
  view.setUint32(4, 6);
  view.setUint16(8, 1);
  view.setUint16(10, tracks);
  view.setUint16(12, 480);
  return header;
};

const trackChunk = (events: Uint8Array) => {
  const chunk = new Uint8Array(8 + events.length);
  const view = new DataView(chunk.buffer);
  writeString(view, 0, 'MTrk');
  view.setUint32(4, events.length);
  chunk.set(events, 8);
  return chunk;
};

const noteEvent = (delta: number, type: number, channel: number, note: number, velocity: number) => {
  const deltaBytes = numberToVarInt(delta);
  return new Uint8Array([...deltaBytes, type | channel, note, velocity]);
};

const setTempoEvent = (tempo: number) => {
  const microseconds = Math.round(60000000 / tempo);
  return new Uint8Array([0x00, 0xff, 0x51, 0x03, (microseconds >> 16) & 0xff, (microseconds >> 8) & 0xff, microseconds & 0xff]);
};

const createTrackEvents = (track: Track, tempo: number) => {
  const events: Uint8Array[] = [setTempoEvent(tempo)];
  const noteEvents: Array<{ tick: number; type: 'on' | 'off'; note: number; velocity: number }> = [];
  track.notes.forEach((note) => {
    const startTick = Math.round(note.start * 480);
    const duration = Math.max(1, Math.round(note.duration * 480));
    noteEvents.push({ tick: startTick, type: 'on', note: note.pitch, velocity: Math.round(note.velocity * 100) });
    noteEvents.push({ tick: startTick + duration, type: 'off', note: note.pitch, velocity: 0 });
  });

  noteEvents.sort((a, b) => {
    if (a.tick !== b.tick) return a.tick - b.tick;
    if (a.type === b.type) return 0;
    return a.type === 'off' ? -1 : 1;
  });

  let lastTick = 0;
  noteEvents.forEach((noteEventData) => {
    const delta = noteEventData.tick - lastTick;
    const event = noteEvent(
      delta,
      noteEventData.type === 'on' ? 0x90 : 0x80,
      0,
      noteEventData.note,
      noteEventData.velocity
    );
    events.push(event);
    lastTick = noteEventData.tick;
  });

  events.push(new Uint8Array([0x00, 0xff, 0x2f, 0x00]));
  return concat(events);
};

const concat = (arrays: Uint8Array[]) => {
  const length = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(length);
  let offset = 0;
  arrays.forEach((arr) => {
    result.set(arr, offset);
    offset += arr.length;
  });
  return result;
};

export const exportMidi = (composition: Composition): Blob => {
  const trackChunks: Uint8Array[] = [];
  composition.tracks.forEach((track) => {
    trackChunks.push(trackChunk(createTrackEvents(track, composition.tempo)));
  });
  const header = midiHeader(composition.tracks.length);
  const output = concat([header, ...trackChunks]);
  return new Blob([output], { type: 'audio/midi' });
};
