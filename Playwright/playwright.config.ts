import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  
  // Long timeout for AutoPause tests (5 minutes)
  timeout: 5 * 60 * 1000,
  
  // Expect timeout
  expect: {
    timeout: 10000
  },
  
  // Run tests in parallel - but our tests use shared server state, so run serially
  fullyParallel: false,
  workers: 1,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Reporter to use
  reporter: [
    ['list'],
    ['html', { open: 'never' }]
  ],

  // Shared settings for all projects
  use: {
    // Base URL for the Nuxt TimeReward application
    baseURL: 'http://localhost:4000',
    
    // Collect trace when retrying the failed test
    trace: 'on-first-retry',
    
    // Screenshot on failure
    screenshot: 'only-on-failure',
    
    // Video recording
    video: 'retain-on-failure',
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chrome',
      use: { 
        ...devices['Desktop Chrome'],
        channel: 'chrome', // Use installed Chrome instead of Chromium
      },
    },
  ],

  // Run your local dev server before starting the tests
  // Commented out - assumes server is already running
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'http://localhost:4000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
