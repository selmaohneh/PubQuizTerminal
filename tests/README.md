# PubQuizTerminal Tests

This directory contains Playwright tests for the PubQuizTerminal Electron application.

## Running Tests

### Run all tests (headless)
```bash
npm test
```

### Run tests with UI mode (interactive)
```bash
npm run test:ui
```

### Run tests in headed mode (see the browser)
```bash
npm run test:headed
```

### View test report
```bash
npx playwright show-report
```

## Test Structure

- `app.spec.js` - Basic application startup and UI tests

## Writing New Tests

All test files should follow the pattern `*.spec.js` and be placed in the `tests/` directory.

Example test structure for Electron apps:

```javascript
const { test, expect } = require('@playwright/test');
const { _electron: electron } = require('playwright');
const path = require('path');

test.describe('Feature Name', () => {
  let electronApp;
  let window;

  test.beforeEach(async () => {
    electronApp = await electron.launch({
      args: [path.join(__dirname, '..', 'main.js'), '--no-sandbox'],
    });
    window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');
  });

  test.afterEach(async () => {
    await electronApp.close();
  });

  test('test description', async () => {
    // Your test code here
  });
});
```

## Test Artifacts

- Screenshots are saved to `tests/screenshots/`
- Test reports are generated in `playwright-report/`
- Test results are stored in `test-results/`

