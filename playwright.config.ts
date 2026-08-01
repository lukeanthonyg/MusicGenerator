import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  testMatch: ['**/*.spec.ts'],
  timeout: 60000,
  expect: {
    timeout: 10000
  },
  reporter: 'list',
  use: {
    actionTimeout: 0,
    acceptDownloads: true,
    downloadsPath: 'test-results/downloads',
    baseURL: 'http://127.0.0.1:4173/MusicGenerator/',
    browserName: 'chromium'
  },
  webServer: {
    command: 'npm run build && npx vite preview --port 4173',
    url: 'http://127.0.0.1:4173/MusicGenerator/',
    cwd: process.cwd(),
    timeout: 60000,
    reuseExistingServer: false
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});
