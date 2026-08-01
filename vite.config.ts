import { defineConfig } from 'vite';

export default defineConfig({
  base: '/MusicGenerator/',
  server: {
    host: '0.0.0.0',
    port: 4173
  },
  preview: {
    port: 4173,
    host: '0.0.0.0'
  }
});
