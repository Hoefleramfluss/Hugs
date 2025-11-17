import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        baseURL:
          process.env.PW_BASE_URL ||
          process.env.NEXT_PUBLIC_BASE_URL ||
          'http://localhost:3000',
      },
    },
  ],
});
