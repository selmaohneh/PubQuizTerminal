const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './',
  testMatch: ['**/tests/**/*.spec.js', '**/*quiz/**/*.spec.js'],
  timeout: 30000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Run tests serially to avoid temp file conflicts
  reporter: 'html',
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
});

