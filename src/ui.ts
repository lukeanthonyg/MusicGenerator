import { Composition, Note, Track } from './types';
import { parsePrompt } from './utils';
import { generateComposition } from './composer';
import { AudioEngine } from './audio';
import { saveProject, loadProject, clearProject } from './storage';
import { exportMidi } from './midi';

const audioEngine = new AudioEngine();
let currentComposition: Composition | null = null;
let currentSeed = 1;
let isDirty = false;
let playInterval: number | null = null;

const createElement = <K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string | number | boolean> = {}, children: Array<Node | string> = []) => {
  const el = document.createElement(tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (typeof value === 'boolean') {
      if (value) el.setAttribute(key, '');
    } else {
      el.setAttribute(key, String(value));
    }
  });
  children.forEach((child) => {
    if (typeof child === 'string') el.appendChild(document.createTextNode(child));
    else el.appendChild(child);
  });
  return el;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const initApp = async (container: HTMLElement | null) => {
  if (!container) return;
  container.innerHTML = '';
  container.className = 'app-shell';

  const header = createHeader();
  const promptArea = createPromptArea();
  const transport = createTransport();
  const main = createMainArea();
  const status = createStatusBar();

  container.append(header, promptArea, transport, main, status);
  attachActions({ container, status, promptArea, transport, main });
  await restoreAutosave();
};

const createHeader = () => {
  const title = createElement('div', { class: 'title' }, [createElement('h1', {}, ['MusicGenerator'])]);
  const actions = createElement('div', { class: 'header-actions' }, [
    createElement('button', { type: 'button', class: 'action-button', 'data-action': 'new' }, ['New project']),
    createElement('button', { type: 'button', class: 'action-button', 'data-action': 'save' }, ['Save project']),
    createElement('button', { type: 'button', class: 'action-button', 'data-action': 'open' }, ['Open project']),
    createElement('button', { type: 'button', class: 'action-button', 'data-action': 'export' }, ['Export MIDI']),
    createElement('button', { type: 'button', class: 'action-button', 'data-action': 'help' }, ['Help'])
  ]);
  return createElement('header', { class: 'top-bar' }, [title, actions]);
};

const createPromptArea = () => {
  const textarea = createElement('textarea', { placeholder: 'Describe the music you want…', rows: 4, class: 'prompt-input', 'aria-label': 'Music prompt' });
  const generate = createElement('button', { type: 'button', class: 'primary-button', 'data-action': 'generate' }, ['Generate Music']);
  const regenerate = createElement('button', { type: 'button', class: 'secondary-button', 'data-action': 'regenerate', disabled: true }, ['Regenerate Variation']);
  const mic = createElement('button', { type: 'button', class: 'secondary-button', 'data-action': 'mic' }, ['🎤']);
  const suggestions = createElement('div', { class: 'prompt-suggestions' }, [
    'Example: Create a cheerful 8-bar piano piece in C major at 110 BPM.'
  ]);
  return createElement('section', { class: 'prompt-panel' }, [textarea, createElement('div', { class: 'prompt-actions' }, [generate, regenerate, mic]), suggestions]);
};

const createTransport = () => {
  const play = createElement('button', { type: 'button', class: 'transport-button', 'data-action': 'play', disabled: true }, ['Play']);
  const pause = createElement('button', { type: 'button', class: 'transport-button', 'data-action': 'pause', disabled: true }, ['Pause']);
  const stop = createElement('button', { type: 'button', class: 'transport-button', 'data-action': 'stop', disabled: true }, ['Stop']);
  const loop = createElement('button', { type: 'button', class: 'transport-button', 'data-action': 'loop', 'aria-pressed': 'false' }, ['Loop']);
  const time = createElement('div', { class: 'time-display' }, ['0:00 / 0:00']);
  const tempo = createElement('input', { type: 'range', min: 60, max: 160, value: 100, class: 'tempo-slider', 'data-action': 'tempo' }, []);
  const volume = createElement('input', { type: 'range', min: 0, max: 1, step: 0.01, value: 1, class: 'volume-slider', 'data-action': 'volume' }, []);
  return createElement('section', { class: 'transport-panel' }, [createElement('div', { class: 'transport-controls' }, [play, pause, stop, loop]), createElement('div', { class: 'transport-status' }, [time, createElement('label', {}, ['Tempo', tempo]), createElement('label', {}, ['Volume', volume])])]);
};

const createMainArea = () => {
  const interpretation = createElement('section', { class: 'interpretation-panel' }, [createElement('h2', {}, ['Interpretation']), createElement('div', { class: 'interpretation-details' })]);
  const trackPanel = createElement('section', { class: 'track-panel' }, [createElement('h2', {}, ['Tracks']), createElement('div', { class: 'track-list' })]);
  const editPanel = createElement('section', { class: 'edit-panel' }, [
    createElement('h2', {}, ['Edit Note']),
    createElement('div', { class: 'edit-details' }, ['Select a note from the piano roll to edit it.']),
    createElement('div', { class: 'edit-actions' }, [
      createElement('button', { type: 'button', class: 'action-button', 'data-action': 'undo', disabled: true }, ['Undo']),
      createElement('button', { type: 'button', class: 'action-button', 'data-action': 'redo', disabled: true }, ['Redo']),
      createElement('button', { type: 'button', class: 'action-button', 'data-action': 'delete-note', disabled: true }, ['Delete note'])
    ])
  ]);
  const pianoRoll = createElement('section', { class: 'piano-roll-panel' }, [createElement('h2', {}, ['Piano Roll']), createElement('div', { class: 'piano-roll' })]);
  return createElement('main', { class: 'workspace' }, [interpretation, trackPanel, editPanel, pianoRoll]);
};

const createStatusBar = () => createElement('div', { class: 'status-bar' }, ['Ready']);

const attachActions = ({ container, status, promptArea, transport, main }: { container: HTMLElement; status: HTMLElement; promptArea: HTMLElement; transport: HTMLElement; main: HTMLElement; }) => {
  container.addEventListener('click', async (event) => {
    const target = event.target as HTMLElement;
    const action = target.getAttribute('data-action');
    if (!action) return;
    if (action === 'generate') await handleGenerate();
    if (action === 'regenerate') await handleRegenerate();
    if (action === 'mic') await handleMic();
    if (action === 'play') handlePlay();
    if (action === 'pause') handlePause();
    if (action === 'stop') handleStop();
    if (action === 'loop') toggleLoop(target);
    if (action === 'new') await handleNewProject();
    if (action === 'save') await handleSaveProject();
    if (action === 'open') await handleOpenProject();
    if (action === 'export') {
      console.log('export button clicked');
      await handleExportMidi();
    }
    if (action === 'help') showHelp();
    if (action === 'mute') handleTrackMute(target.getAttribute('data-track') || '');
  });

  transport.addEventListener('input', (event) => {
    const target = event.target as HTMLInputElement;
    const action = target.getAttribute('data-action');
    if (action === 'tempo' && currentComposition) {
      currentComposition.tempo = Number(target.value);
      audioEngine.setTempo(currentComposition.tempo);
      updateStatus('Tempo updated');
    }
    if (action === 'volume') {
      audioEngine.setVolume(Number(target.value));
    }
  });
};

const getPromptTextarea = () => document.querySelector('.prompt-input') as HTMLTextAreaElement | null;
const getRegenerateButton = () => document.querySelector('[data-action="regenerate"]') as HTMLButtonElement | null;
const getPlayButton = () => document.querySelector('[data-action="play"]') as HTMLButtonElement | null;
const getPauseButton = () => document.querySelector('[data-action="pause"]') as HTMLButtonElement | null;
const getStopButton = () => document.querySelector('[data-action="stop"]') as HTMLButtonElement | null;
const getTimeDisplay = () => document.querySelector('.time-display') as HTMLElement | null;
const getInterpretationPanel = () => document.querySelector('.interpretation-details') as HTMLElement | null;
const getTrackList = () => document.querySelector('.track-list') as HTMLElement | null;
const getPianoRoll = () => document.querySelector('.piano-roll') as HTMLElement | null;

const updateStatus = (message: string) => {
  const status = document.querySelector('.status-bar');
  if (status) status.textContent = message;
};

const handleGenerate = async () => {
  const textarea = getPromptTextarea();
  if (!textarea) return;
  const prompt = textarea.value.trim();
  if (!prompt) {
    updateStatus('Please enter a prompt');
    return;
  }
  updateStatus('Generating music…');
  setGenerating(true);
  try {
    const parsed = parsePrompt(prompt);
    currentSeed = Math.floor(Math.random() * 1000000);
    const composition = generateComposition(parsed, currentSeed);
    currentComposition = composition;
    isDirty = true;
    audioEngine.setComposition(composition);
    updateUIForComposition(composition);
    enableTransport(true);
    getRegenerateButton()?.removeAttribute('disabled');
    updateStatus('Generated successfully');
  } catch (error) {
    console.error(error);
    updateStatus('Failed to generate music');
  } finally {
    setGenerating(false);
  }
};

const handleRegenerate = async () => {
  if (!currentComposition) return;
  updateStatus('Regenerating variation…');
  setGenerating(true);
  try {
    const parsed = parsePrompt(currentComposition.prompt);
    currentSeed += 1;
    const composition = generateComposition(parsed, currentSeed);
    currentComposition = composition;
    isDirty = true;
    audioEngine.setComposition(composition);
    updateUIForComposition(composition);
    updateStatus('Variation generated');
  } catch (error) {
    console.error(error);
    updateStatus('Variation generation failed');
  } finally {
    setGenerating(false);
  }
};

const handleMic = async () => {
  updateStatus('Speech transcription is not supported in this browser');
};

const handlePlay = () => {
  if (!currentComposition) return;
  audioEngine.play();
  updateStatus('Playing');
  schedulePlayhead();
  getPlayButton()?.setAttribute('disabled', '');
  getPauseButton()?.removeAttribute('disabled');
  getStopButton()?.removeAttribute('disabled');
};

const handlePause = () => {
  audioEngine.pause();
  updateStatus('Paused');
  if (playInterval) {
    window.clearInterval(playInterval);
    playInterval = null;
  }
  getPlayButton()?.removeAttribute('disabled');
};

const handleStop = () => {
  audioEngine.stop();
  if (playInterval) {
    window.clearInterval(playInterval);
    playInterval = null;
  }
  updateStatus('Stopped');
  getPlayButton()?.removeAttribute('disabled');
  getPauseButton()?.setAttribute('disabled', '');
  updateTimeDisplay(0, currentComposition?.duration ?? 0);
};

const toggleLoop = (button: HTMLElement) => {
  const pressed = button.getAttribute('aria-pressed') === 'true';
  button.setAttribute('aria-pressed', pressed ? 'false' : 'true');
  updateStatus(pressed ? 'Loop disabled' : 'Loop enabled');
};

const setGenerating = (active: boolean) => {
  const generate = document.querySelector('[data-action="generate"]') as HTMLButtonElement | null;
  if (generate) {
    generate.textContent = active ? 'Generating…' : 'Generate Music';
    if (active) generate.setAttribute('disabled', '');
    else generate.removeAttribute('disabled');
  }
};

const updateUIForComposition = (composition: Composition) => {
  renderInterpretation(composition);
  renderTracks(composition.tracks);
  renderPianoRoll(composition.tracks, composition.timeSignature);
  updateTimeDisplay(0, composition.duration);
};

const renderInterpretation = (composition: Composition) => {
  const container = getInterpretationPanel();
  if (!container) return;
  container.innerHTML = '';
  const entries = [
    ['Mood', composition.interpretation.moods.join(', ')],
    ['Style', composition.interpretation.style],
    ['Key', `${composition.interpretation.key} ${composition.interpretation.mode}`],
    ['Tempo', `${composition.interpretation.tempo} BPM`],
    ['Time', composition.interpretation.timeSignature],
    ['Bars', String(composition.interpretation.bars)],
    ['Instruments', composition.interpretation.instruments.join(', ')]
  ];
  entries.forEach(([label, value]) => {
    const row = createElement('div', { class: 'interpretation-row' }, [createElement('strong', {}, [label + ': ']), createElement('span', {}, [value])]);
    container.appendChild(row);
  });
};

const renderTracks = (tracks: Track[]) => {
  const container = getTrackList();
  if (!container) return;
  container.innerHTML = '';
  tracks.forEach((track) => {
    const row = createElement('div', { class: 'track-item' }, [
      createElement('span', { class: 'track-name' }, [track.name]),
      createElement('span', { class: 'track-instrument' }, [track.instrument]),
      createElement('button', { type: 'button', class: 'track-button', 'data-action': 'mute', 'data-track': track.id }, [track.muted ? 'Unmute' : 'Mute'])
    ]);
    container.appendChild(row);
  });
};

const renderPianoRoll = (tracks: Track[], timeSignature: [number, number]) => {
  const container = getPianoRoll();
  if (!container) return;
  container.innerHTML = '';
  container.style.setProperty('--bars', String(tracks[0]?.notes.length ? Math.ceil(Math.max(...tracks.flatMap((track) => track.notes.map((note) => note.start + note.duration))) / timeSignature[0]) : 8));
  tracks.forEach((track) => {
    const lane = createElement('div', { class: 'piano-roll-track' }, [createElement('div', { class: 'piano-roll-track-label' }, [track.name])]);
    const grid = createElement('div', { class: 'piano-roll-grid' }, []);
    track.notes.forEach((note) => {
      const noteEl = createElement('div', { class: 'piano-roll-note' }, [track.instrument === 'drums' ? '●' : '']);
      noteEl.style.left = `${(note.start / (timeSignature[0] * (Number(getComputedStyle(container).getPropertyValue('--bars') || 8)))) * 100}%`;
      noteEl.style.width = `${(note.duration / (timeSignature[0] * (Number(getComputedStyle(container).getPropertyValue('--bars') || 8)))) * 100}%`;
      noteEl.style.bottom = `${(note.pitch - 48) * 4}px`;
      lane.appendChild(noteEl);
    });
    container.appendChild(lane);
  });
};

const updateTimeDisplay = (current: number, total: number) => {
  const display = getTimeDisplay();
  if (!display) return;
  const format = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  };
  display.textContent = `${format(current)} / ${format(total)}`;
};

const schedulePlayhead = () => {
  if (playInterval) window.clearInterval(playInterval);
  playInterval = window.setInterval(() => {
    const time = audioEngine.currentTime();
    updateTimeDisplay(time, currentComposition?.duration ?? 0);
    if (currentComposition && time >= currentComposition.duration) {
      handleStop();
    }
  }, 100);
};

const restoreAutosave = async () => {
  const composition = await loadProject();
  if (composition) {
    currentComposition = composition;
    audioEngine.setComposition(composition);
    updateUIForComposition(composition);
    enableTransport(true);
    updateStatus('Loaded saved project');
  }
};

const handleNewProject = async () => {
  if (isDirty && !window.confirm('Discard unsaved changes?')) return;
  currentComposition = null;
  isDirty = false;
  const textarea = getPromptTextarea();
  if (textarea) textarea.value = '';
  updateStatus('New project ready');
  renderInterpretation({ moods: [], style: '', key: '', mode: '', tempo: 0, timeSignature: '', bars: 0, instruments: [], structure: [], descriptors: [] } as any);
  renderTracks([]);
  if (getPianoRoll()) getPianoRoll()!.innerHTML = '';
  enableTransport(false);
};

const handleSaveProject = async () => {
  if (!currentComposition) {
    updateStatus('Nothing to save');
    return;
  }
  const success = await saveProject(currentComposition);
  updateStatus(success ? 'Project saved locally' : 'Save failed');
};

const handleOpenProject = async () => {
  const composition = await loadProject();
  if (!composition) {
    updateStatus('No saved project found');
    return;
  }
  currentComposition = composition;
  audioEngine.setComposition(composition);
  updateUIForComposition(composition);
  enableTransport(true);
  updateStatus('Project opened');
};

const createMidiExportBlob = () => {
  if (!currentComposition) {
    updateStatus('Generate music before export');
    return null;
  }
  try {
    const blob = exportMidi(currentComposition);
    window.__lastExportBlobSize__ = blob.size;
    window.__lastExportFileName__ = 'musicgenerator.mid';
    return blob;
  } catch (error) {
    console.error(error);
    updateStatus('MIDI export failed');
    return null;
  }
};

const handleExportMidi = () => {
  const blob = createMidiExportBlob();
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'musicgenerator.mid';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    link.remove();
    URL.revokeObjectURL(url);
  }, 100);
  updateStatus('MIDI exported');
};

window.musicGeneratorExport = () => {
  createMidiExportBlob();
};

window.musicGeneratorCreateExportBlobSize = () => {
  const blob = createMidiExportBlob();
  return blob?.size ?? 0;
};

const showHelp = () => {
  window.alert('MusicGenerator creates procedural compositions from text prompts. Use Generate Music, then Play. Save and export MIDI from the header.');
};

const handleTrackMute = (trackId: string) => {
  if (!currentComposition) return;
  const track = currentComposition.tracks.find((item) => item.id === trackId);
  if (!track) return;
  track.muted = !track.muted;
  audioEngine.setTrackState(track.id, track.muted, track.volume);
  updateUIForComposition(currentComposition);
  updateStatus(track.muted ? `${track.name} muted` : `${track.name} unmuted`);
};

const enableTransport = (enabled: boolean) => {
  if (enabled) {
    getPlayButton()?.removeAttribute('disabled');
    getStopButton()?.removeAttribute('disabled');
  } else {
    getPlayButton()?.setAttribute('disabled', '');
    getPauseButton()?.setAttribute('disabled', '');
    getStopButton()?.setAttribute('disabled', '');
  }
};
