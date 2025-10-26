const { test, expect } = require('@playwright/test');
const { _electron: electron } = require('playwright');
const path = require('path');

test.describe.serial('Title Quiz', () => {
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

  test('should load title quiz, display title and subtitle, then return to main menu on Enter', async () => {
    const fs = require('fs');
    
    // Wait for the page to load
    await window.waitForLoadState('load');

    // Verify we're on the main page (icon is visible)
    const icon = window.locator('img.icon');
    await expect(icon).toBeVisible();

    // Read the test title quiz file
    const testFilePath = path.join(__dirname, 'test-title.title');
    const quizData = JSON.parse(fs.readFileSync(testFilePath, 'utf8'));

    // Create temp-quiz-data.json with the quiz data
    const tempFilePath = path.join(__dirname, '..', 'temp-quiz-data.json');
    const dataToSave = {
      quizData: quizData,
      loadTimestamp: Date.now()
    };
    fs.writeFileSync(tempFilePath, JSON.stringify(dataToSave));

    // Navigate to title quiz page
    await window.evaluate(() => {
      window.location.href = 'titlequiz/title.html';
    });

    // Wait for title page to load
    await window.waitForLoadState('load');

    // Wait for the title text to be populated (ensures JS has loaded the data)
    const titleText = window.locator('#titleText');
    await expect(titleText).toHaveText('Geography and Nature', { timeout: 10000 });

    // Verify subtitle is displayed correctly
    const subtitleText = window.locator('#subtitleText');
    await expect(subtitleText).toBeVisible();
    await expect(subtitleText).toHaveText('Round 3');

    // Press Enter key to return to main menu
    await window.keyboard.press('Enter');

    // Wait for navigation back to main page
    await window.waitForLoadState('load');

    // Verify we're back on the main page (icon is visible again)
    const iconAfter = window.locator('img.icon');
    await expect(iconAfter).toBeVisible();

    // Clean up temp file
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  });
});

