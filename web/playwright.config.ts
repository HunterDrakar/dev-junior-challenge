import { defineConfig, devices } from '@playwright/test';

/**
 * e2e de navegador: roda contra o projeto já de pé (docker compose up), sem
 * nada simulado. No CI usa o Chromium do Playwright; localmente dá para usar o
 * Chrome instalado com E2E_CANAL=chrome.
 */
export default defineConfig({
  testDir: './e2e',
  reporter: 'list',
  use: {
    baseURL: process.env.E2E_URL ?? 'http://localhost:5173',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], channel: process.env.E2E_CANAL },
    },
  ],
});
