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

  test('should display questions with 0, 2, 3, and 4 answer options correctly', async () => {
    const fs = require('fs');
    
    // Wait for the page to load
    await window.waitForLoadState('load');

    // Read the test topic quiz file with different answer options
    const testFilePath = path.join(__dirname, 'test-topic-answers.topicquiz');
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
    await window.waitForSelector('.topic-card');

    // Test cases for each answer option count
    const testCases = [
      {
        topicIndex: 0,
        topicName: 'No Options',
        question: 'What is the largest planet in our solar system?',
        expectedAnswerCount: 0,
        answers: []
      },
      {
        topicIndex: 1,
        topicName: 'Two Options',
        question: 'What is the capital of Japan?',
        expectedAnswerCount: 2,
        answers: ['Tokyo', 'Kyoto']
      },
      {
        topicIndex: 2,
        topicName: 'Three Options',
        question: 'Who painted the Sistine Chapel ceiling?',
        expectedAnswerCount: 3,
        answers: ['Michelangelo', 'Leonardo da Vinci', 'Raphael']
      },
      {
        topicIndex: 3,
        topicName: 'Four Options',
        question: 'What is the smallest prime number?',
        expectedAnswerCount: 4,
        answers: ['2', '1', '3', '0']
      }
    ];

    // Track which topics have been played
    const playedTopics = [];

    for (const testCase of testCases) {
      // After returning from answer view, the first available (non-disabled) topic is auto-selected
      // Find which position is currently selected (first non-played topic)
      let currentPosition = 0;
      for (let i = 0; i < 16; i++) {
        if (!playedTopics.includes(i)) {
          currentPosition = i;
          break;
        }
      }
      
      // Navigate to the target topic from current position
      const targetPosition = testCase.topicIndex;
      
      // Calculate navigation needed
      const currentRow = Math.floor(currentPosition / 4);
      const currentCol = currentPosition % 4;
      const targetRow = Math.floor(targetPosition / 4);
      const targetCol = targetPosition % 4;
      
      // Navigate vertically first
      const rowDiff = targetRow - currentRow;
      if (rowDiff > 0) {
        for (let i = 0; i < rowDiff; i++) {
          await window.keyboard.press('ArrowDown');
        }
      } else if (rowDiff < 0) {
        for (let i = 0; i < Math.abs(rowDiff); i++) {
          await window.keyboard.press('ArrowUp');
        }
      }
      
      // Navigate horizontally
      const colDiff = targetCol - currentCol;
      if (colDiff > 0) {
        for (let i = 0; i < colDiff; i++) {
          await window.keyboard.press('ArrowRight');
        }
      } else if (colDiff < 0) {
        for (let i = 0; i < Math.abs(colDiff); i++) {
          await window.keyboard.press('ArrowLeft');
        }
      }

      // Select the topic by pressing Enter
      await window.keyboard.press('Enter');

      // Wait for question page to load
      await window.waitForLoadState('load');
      
      // Verify topic name is displayed
      const topicNameElement = window.locator('#topic-name');
      await expect(topicNameElement).toHaveText(testCase.topicName);

      // Verify question text is displayed
      const questionText = window.locator('#question-text');
      await expect(questionText).toHaveText(testCase.question);

      if (testCase.expectedAnswerCount === 0) {
        // Verify answer cards are hidden when there are no options
        const answerCards = window.locator('#answer-cards');
        await expect(answerCards).toHaveCSS('display', 'none');
      } else {
        // Verify answer cards are visible
        const answerCards = window.locator('#answer-cards');
        await expect(answerCards).toHaveCSS('display', 'grid');

        // Verify the correct number of answer cards are visible
        const visibleAnswerCards = window.locator('.answer-card').filter({ hasNot: window.locator('[style*="display: none"]') });
        
        // Count visible cards by checking each one
        let visibleCount = 0;
        const allCards = window.locator('.answer-card');
        const cardCount = await allCards.count();
        
        for (let i = 0; i < cardCount; i++) {
          const card = allCards.nth(i);
          const display = await card.evaluate(el => window.getComputedStyle(el).display);
          if (display !== 'none') {
            visibleCount++;
          }
        }
        
        expect(visibleCount).toBe(testCase.expectedAnswerCount);

        // Verify each answer text is present (order may vary due to shuffling)
        for (const answerText of testCase.answers) {
          const answerElement = window.locator('.answer-text', { hasText: answerText });
          await expect(answerElement).toBeVisible();
        }
      }

      // Press Enter to go to answer view
      await window.keyboard.press('Enter');
      await window.waitForLoadState('load');

      // Verify we're on the answer page and the answer is shown
      const answerElement = window.locator('#answer-text');
      await expect(answerElement).toBeVisible();

      // Press Enter to return to topic overview
      await window.keyboard.press('Enter');
      
      // Wait for topic page to load again
      await window.waitForLoadState('load');
      await window.waitForSelector('.topic-card');

      // Verify we're back on the topic overview (at least one topic card should be visible)
      const topicCards = window.locator('.topic-card');
      await expect(topicCards.first()).toBeVisible();
      
      // Mark this topic as played
      playedTopics.push(testCase.topicIndex);
    }

    // Clean up temp file
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  });

  test('should disable topics after playing and prevent re-selection', async () => {
    const fs = require('fs');
    
    // Wait for the page to load
    await window.waitForLoadState('load');

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
    await window.waitForSelector('.topic-card');

    // Get the first topic card (Geography)
    const firstTopicCard = window.locator('.topic-card').first();
    
    // Verify the first topic is NOT disabled initially
    await expect(firstTopicCard).not.toHaveClass(/disabled/);

    // Select the first topic (already selected by default, just press Enter)
    await window.keyboard.press('Enter');

    // Wait for question page to load
    await window.waitForLoadState('load');

    // Verify we're on the question page
    const questionText = window.locator('#question-text');
    await expect(questionText).toBeVisible();

    // Press Enter to go to answer view
    await window.keyboard.press('Enter');
    await window.waitForLoadState('load');

    // Verify we're on the answer page
    const answerElement = window.locator('#answer-text');
    await expect(answerElement).toBeVisible();

    // Press Enter to return to topic overview
    await window.keyboard.press('Enter');
    await window.waitForLoadState('load');
    await window.waitForSelector('.topic-card');

    // Verify we're back on the topic overview
    const topicCards = window.locator('.topic-card');
    await expect(topicCards.first()).toBeVisible();

    // Verify the first topic is NOW disabled
    const firstTopicCardAfter = window.locator('.topic-card').first();
    await expect(firstTopicCardAfter).toHaveClass(/disabled/);

    // The selection should have moved to the next available topic (index 1)
    // Navigate back to the first (disabled) topic
    await window.keyboard.press('ArrowLeft');

    // Verify the disabled topic is now selected (can be selected, but not activated)
    const selectedCard = window.locator('.topic-card.selected');
    await expect(selectedCard).toHaveClass(/disabled/);

    // Try to press Enter on the disabled topic
    await window.keyboard.press('Enter');

    // Wait a moment to ensure no navigation happens
    await window.waitForTimeout(500);

    // Verify we're STILL on the topic overview page (not navigated to question)
    await expect(topicCards.first()).toBeVisible();
    
    // Verify we didn't navigate away by checking the URL
    const currentUrl = await window.evaluate(() => window.location.href);
    expect(currentUrl).toContain('topic.html');
    expect(currentUrl).not.toContain('question.html');

    // Clean up temp file
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  });

  test('should play through all 16 topics and return to main view after last topic', async () => {
    const fs = require('fs');
    
    // Wait for the page to load
    await window.waitForLoadState('load');

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
    await window.waitForSelector('.topic-card');

    // Play through all 16 topics
    for (let topicIndex = 0; topicIndex < 16; topicIndex++) {
      console.log(`Playing topic ${topicIndex + 1}/16`);

      // The first available (non-disabled) topic is always auto-selected
      // Just press Enter to select it
      await window.keyboard.press('Enter');

      // Wait for question page to load
      await window.waitForLoadState('load');

      // Verify we're on the question page
      const questionText = window.locator('#question-text');
      await expect(questionText).toBeVisible();

      // Press Enter to go to answer view
      await window.keyboard.press('Enter');
      await window.waitForLoadState('load');

      // Verify we're on the answer page
      const answerElement = window.locator('#answer-text');
      await expect(answerElement).toBeVisible();

      // Press Enter to continue
      await window.keyboard.press('Enter');
      await window.waitForLoadState('load');

      if (topicIndex < 15) {
        // Not the last topic - should return to topic overview
        await window.waitForSelector('.topic-card');
        
        // Verify we're still on the topic overview
        const topicCards = window.locator('.topic-card');
        await expect(topicCards.first()).toBeVisible();

        // Verify the URL contains topic.html
        const currentUrl = await window.evaluate(() => window.location.href);
        expect(currentUrl).toContain('topic.html');

        // Count disabled topics - should be topicIndex + 1
        const disabledCount = await window.locator('.topic-card.disabled').count();
        expect(disabledCount).toBe(topicIndex + 1);
      } else {
        // Last topic (index 15) - should return to main view
        
        // Wait for main page to load
        await window.waitForSelector('img.icon');

        // Verify we're on the main page (icon is visible)
        const icon = window.locator('img.icon');
        await expect(icon).toBeVisible();

        // Verify the URL contains index.html
        const currentUrl = await window.evaluate(() => window.location.href);
        expect(currentUrl).toContain('index.html');
      }
    }

    // Clean up temp file
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  });
});

