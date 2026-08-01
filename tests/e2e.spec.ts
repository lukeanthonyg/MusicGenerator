import { test, expect } from '@playwright/test';

test('main workflow works', async ({ page }) => {
  await page.goto('/');
  await page.fill('.prompt-input', 'Create a cheerful 8-bar piano piece in C major at 110 BPM.');
  await page.click('[data-action="generate"]');
  await expect(page.locator('.status-bar')).toHaveText(/Generated successfully/);
  const trackCount = await page.locator('.piano-roll-track').count();
  expect(trackCount).toBeGreaterThan(0);
  await page.click('[data-action="play"]');
  await expect(page.locator('.status-bar')).toHaveText(/Playing/);
  await page.waitForTimeout(1000);
  await page.click('[data-action="stop"]');
  await page.waitForFunction(() => typeof window.musicGeneratorCreateExportBlobSize === 'function');
  const exportedSize = await page.evaluate(() => window.musicGeneratorCreateExportBlobSize());
  expect(exportedSize).toBeGreaterThan(0);
});
