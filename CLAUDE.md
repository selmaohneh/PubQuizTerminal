# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PubQuizTerminal is an Electron-based quiz application with four distinct quiz types. The app uses a terminal-like interface with keyboard-only navigation. All quiz data is loaded from external files with custom extensions.

## Development Commands

**Running the application:**
```bash
npm run dev    # Development mode with DevTools open
npm start      # Production mode
```

**Building:**
```bash
npm run build  # Build for current platform
npm run dist   # Create distributable packages
```

## Architecture

### Main Process (main.js)
- Creates BrowserWindow with `nodeIntegration: true` and `contextIsolation: false`
- Handles IPC messages for page navigation via `show-main-page` event
- Delegates menu/file handling to MenuController
- Opens DevTools when `--dev` flag is passed

### Menu System (menu.js)
- **MenuController** orchestrates the menu and IPC communication
- **QuizFileHandler** handles File > Open dialog and quiz file operations
- Validates quiz data based on file extension using dedicated validator methods
- Stores quiz data in `temp-quiz-data.json` for persistence between page loads
- For image quizzes, also stores original file path in `temp-original-path.txt`
- Routes to appropriate quiz view based on extension via `QUIZ_TYPES` mapping

### Sound System (sound-manager.js)
- Global SoundManager instance provides audio effects
- Sounds are in `/sound-effects/` directory, always accessed via `../` from quiz subdirectories
- Available sounds: ding, correct, buzzer, error, completed
- Implements audio unlock on first user interaction (for browser compatibility)
- Check availability with `typeof soundManager !== 'undefined'` before using

### Quiz Types

All quiz types are in subdirectories with their own HTML/CSS/JS files:

#### 1. Topic Quiz (`/topicquiz/`)
- **Format**: Array of 16 topics with `name`, `question`, `answer`, `falseAnswers` (optional)
- **Extension**: `.topicquiz`
- **Pages**: `topic.html` (4x4 grid selector) → `question.html` (question view) → `answer.html` (answer view)
- **Navigation**: Arrow keys navigate grid, Enter selects topic
- **State Management**:
  - Tracks played topics in `localStorage.playedTopics`
  - Session detection via `sessionStorage.quizSessionActive`
  - Quiz data hash comparison to detect new files and reset state
  - Disables played topics until app restart or new quiz file loaded
  - Hash generation uses stringified topic name/question/answer

#### 2. Pair Quiz (`/pairquiz/`)
- **Format**: Array of objects with `left` and `right` properties
  - Valid pairs: both `left` and `right` are non-empty strings
  - Extra item: `left` is empty/falsy, `right` has value (max 1 extra item)
  - Must have 1-10 valid pairs, max 11 total items
- **Extension**: `.pairquiz`
- **File**: `pair.html` (single page with three columns)
- **Gameplay**:
  - Select left item, then right item to make a pair
  - Correct pairs move to center column with connection line
  - Wrong pair or selecting the extra item ends game
  - Matched items become invisible but maintain layout (`visibility: hidden`)
  - Game completes when all valid pairs are matched
- **Result Screen**: Shows all correct pairs and highlights extra item in red

#### 3. Sort Quiz (`/sortquiz/`)
- **Format**: Object with `upperLabel`, `lowerLabel`, and `items` array (2-11 strings)
- **Extension**: `.sortquiz`
- **File**: `sort.html` (single page with three columns)
- **Gameplay**:
  - Items split: 1 random item starts in center, 5 in left, 5 in right columns
  - Select item, then navigate center column to choose placement position
  - Preview item shows where it will be placed (yellow highlight with `.preview-item` class)
  - Items must be placed in ascending order (by original index)
  - Wrong placement ends game
  - Dynamic graph rebuilds after each placement using `rebuildSortedArray()`: maintains spots between all items
  - Dynamic scaling reduces font/spacing when many items present (`applyCenterGraphScaling()`)
- **Center Column**: Vertical graph with connectors between items

#### 4. Image Quiz (`/imagequiz/`)
- **Format**: Array of objects with `image` (filename) and `answer` properties
- **Extension**: `.imagequiz`
- **File**: `image.html` (single page)
- **Gameplay**:
  - Shows images sequentially on Enter press (question phase)
  - After all images shown, shows each image with answer (results phase)
  - Returns to main menu after final image+answer shown
- **Image Paths**: Resolved relative to `.imagequiz` file directory using `temp-original-path.txt`

### Common Patterns

**Quiz Data Loading:**
All quiz types read from `temp-quiz-data.json` created by MenuController:
```javascript
const fs = require('fs');
const path = require('path');
const tempFilePath = path.join(__dirname, '..', 'temp-quiz-data.json');
const quizData = JSON.parse(fs.readFileSync(tempFilePath, 'utf8'));
```

**Return to Main:**
```javascript
const { ipcRenderer } = require('electron');
ipcRenderer.send('show-main-page');
```

**Sound Integration:**
```javascript
// Check availability
if (typeof soundManager !== 'undefined') {
    soundManager.playCorrect();  // or playDing(), playBuzzer(), playError(), playCompleted()
}
```

## File Structure

```
/
├── main.js                    # Electron main process
├── menu.js                    # MenuController + QuizFileHandler - file loading and validation
├── renderer.js                # Main page controller
├── sound-manager.js           # Global sound system
├── index.html                 # Main menu page
├── css/main.css              # Shared styles
├── sound-effects/            # Audio files
├── topicquiz/                # Topic quiz (16 topics, grid navigation)
│   ├── topic.html/css/js     # Grid selector (TopicController)
│   ├── question.html/css/js  # Question display
│   └── answer.html/css/js    # Answer display
├── pairquiz/                 # Pair matching quiz
│   └── pair.html/css/js      # Single page with three columns (PairController)
├── sortquiz/                 # Sorting quiz
│   └── sort.html/css/js      # Single page with vertical graph (SortController)
└── imagequiz/                # Image identification quiz
    └── image.html/css/js     # Single page with sequential images (ImageController)
```

## Key Implementation Details

- All navigation is keyboard-only (arrow keys + Enter)
- Quiz pages use `nodeIntegration: true` to access file system and IPC
- Topic quiz persists state across page loads but resets on app restart or new file
- Pair/Sort quizzes show results screen on game end (completion or error)
- Sort quiz implements dynamic spot array that rebuilds after each placement
- Image quiz requires original file path to resolve relative image paths
- Each quiz type has a dedicated controller class that initializes on DOM load
- Controllers manage game state, navigation, rendering, and sound effects
