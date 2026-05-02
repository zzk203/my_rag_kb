import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'cd ../backend && '
             + 'rm -f data/knowledge.db && '
             + 'DEBUG=true uvicorn app.main:app --port 8000',
      port: 8000,
      reuseExistingServer: true,
      cwd: '../backend',
    },
    {
      command: 'npm run dev',
      port: 3000,
      reuseExistingServer: true,
    },
  ],
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
  ],
})
