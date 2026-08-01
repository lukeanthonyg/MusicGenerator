# MusicGenerator

MusicGenerator is a browser-based procedural music app that composes playable MIDI from text prompts. It supports:

- Prompt-driven composition
- Piano roll visualization
- Playback via Web Audio
- MIDI export
- Local project save/load in browser storage
- GitHub Pages deployment

## Setup

Install dependencies:

```bash
npm install
```

## Development

Run the app locally:

```bash
npm run dev
```

Open the app in a browser at the URL shown by Vite.

## Build

Create a production build:

```bash
npm run build
```

## Tests

Run unit tests only:

```bash
npm run test:unit
```

Run the full automated suite including Playwright E2E:

```bash
npm run test
```

## Preview

Preview the production build locally:

```bash
npm run preview
```

## Deployment

This repository is configured to deploy to GitHub Pages from `main` using the workflow in `.github/workflows/pages.yml`.

The app uses the Vite base path `/MusicGenerator/`, so it is ready to publish at:

`https://lukeanthonyg.github.io/MusicGenerator/`

## Notes

- The app uses browser localStorage for save/load.
- MIDI export downloads a `.mid` file using the browser download flow.
- Playback requires a modern browser and a user interaction to start audio.
