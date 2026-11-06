// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Recria o __dirname para ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lê o arquivo .env
dotenv.config({ path: path.resolve(__dirname, '.env') });

const e2ePort = Number(process.env.E2E_PORT ?? 3100);
const baseURL = process.env.BASE_URL ?? `http://localhost:${e2ePort}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Sobe o servidor Next.js automaticamente antes de rodar os testes E2E
  webServer: {
    command: `npm run dev -- --port ${e2ePort}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120 * 1000,
  },
});