const { test, expect } = require('@playwright/test');
const { _electron: electron } = require('playwright');
const path = require('path');

test.describe('PubQuizTerminal App', () => {
  let electronApp;
  let window;

  test.beforeEach(async () => {
    // Launch Electron app
    electronApp = await electron.launch({
      args: [path.join(__dirname, '..', 'main.js'), '--no-sandbox'],
    });

    // Get the first window
    window = await electronApp.firstWindow();
    
    // Wait for the window to be ready
    await window.waitForLoadState('domcontentloaded');
  });

  test.afterEach(async () => {
    // Close the app
    await electronApp.close();
  });

  test('should start the app and display the icon image', async () => {
    // Wait for the page to load
    await window.waitForLoadState('load');

    // Check if the icon image is visible
    const icon = window.locator('img.icon');
    await expect(icon).toBeVisible();

    // Verify the icon has the correct src attribute
    await expect(icon).toHaveAttribute('src', 'icon.png');
    
    // Verify the icon has the correct alt text
    await expect(icon).toHaveAttribute('alt', 'PubQuizTerminal Icon');

    // Take a screenshot for verification
    await window.screenshot({ path: 'tests/screenshots/app-startup.png' });
  });
});

