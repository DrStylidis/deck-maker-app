import { defineConfig } from '@playwright/test'

/**
 * Two projects:
 *  site — the local HTML over a tiny stdlib server (http:// origin makes
 *         route mocking, anchors, and JS-off contexts behave like production).
 *         Runs on every push/PR (npm test).
 *  live — the deployed https://theunintended.me + the GitHub release download
 *         URLs. Weekly cron + after each desktop release (npm run test:live).
 */
export default defineConfig({
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { screenshot: 'only-on-failure' },
  projects: [
    {
      name: 'site',
      testDir: 'tests/site',
      use: { baseURL: 'http://localhost:4173' },
    },
    {
      name: 'live',
      testDir: 'tests/live',
      use: { baseURL: 'https://theunintended.me' },
    },
  ],
  webServer: {
    command: 'node tests/serve.mjs 4173',
    url: 'http://localhost:4173/index.html',
    reuseExistingServer: !process.env.CI,
  },
})
