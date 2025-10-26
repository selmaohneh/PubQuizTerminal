const { test, expect } = require('@playwright/test');
const { _electron: electron } = require('playwright');
const path = require('path');

test.describe.serial('Topic Quiz', () => {
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

  test('should load topic quiz, display all 16 topics, then return to main menu on Escape', async () => {
    const fs = require('fs');
    
    // Wait for the page to load
    await window.waitForLoadState('load');

    // Verify we're on the main page (icon is visible)
    const icon = window.locator('img.icon');
    await expect(icon).toBeVisible();

    // Read the test topic quiz file
    const testFilePath = path.join(__dirname, 'test-topic.topicquiz');
    const quizData = JSON.parse(fs.readFileSync(testFilePath, 'utf8'));

    // Create temp-quiz-data.json with the quiz data
    const tempFilePath = path.join(__dirname, '..', 'temp-quiz-data.json');
    const dataToSave = {
      quizData: quizData,
      loadTimestamp: Date.now()
    };
    fs.writeFileSync(tempFilePath, JSON.stringify(dataToSave));

    // Navigate to topic quiz page
    await window.evaluate(() => {
      window.location.href = 'topicquiz/topic.html';
    });

    // Wait for topic page to load
    await window.waitForLoadState('load');

    // Wait for topic cards to be rendered
    await window.waitForSelector('.topic-card');

    // Verify all 16 topic cards are visible
    const topicCards = window.locator('.topic-card');
    await expect(topicCards).toHaveCount(16);

    // Verify each topic name is displayed correctly
    const expectedTopics = [
      'Geography', 'History', 'Science', 'Sports',
      'Movies', 'Music', 'Literature', 'Art',
      'Technology', 'Food & Drink', 'Nature', 'Politics',
      'Fashion', 'Travel', 'Games', 'Miscellaneous'
    ];

    for (let i = 0; i < expectedTopics.length; i++) {
      const topicCard = topicCards.nth(i);
      const topicTitle = topicCard.locator('.topic-title');
      await expect(topicTitle).toHaveText(expectedTopics[i]);
    }

    // Verify first topic is selected by default
    const firstCard = topicCards.first();
    await expect(firstCard).toHaveClass(/selected/);

    // Take a screenshot of the topic overview
    await window.screenshot({ path: 'topicquiz/screenshots/topic-overview.png' });

    // Press Escape key to return to main menu
    await window.keyboard.press('Escape');

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

