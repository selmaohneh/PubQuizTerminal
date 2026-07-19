# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PubQuizTerminal is an Electron-based quiz application with five distinct quiz types. The app uses a terminal-like interface with keyboard-only navigation. All quiz data is loaded from external files with custom extensions. Supports both single-file loading and folder playlists for sequential quiz playback.

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

**Web app (quiz rooms):**
```bash
npm run web  # Serve webapp/ locally on port 3000 (override with PORT env var)
```

## Architecture

The repository contains two apps that share the same quiz file formats:

1. **Electron app** (legacy, still functional): keyboard-driven single-screen quiz terminal
2. **Web app** (`/webapp/`, fully static): quizmaster hosts a room with a random code, players join from their smartphones over the internet — this is the foundation the app is being rebuilt on

### Web App (webapp/)

Rooms run over **Supabase Realtime** channels (project `myxtvqljoufgqgikcspm`, config in `webapp/config.js` — the publishable key is a public client key and safe to commit). There is no backend server; the quizmaster's browser is the room authority. Deployed to GitHub Pages via `.github/workflows/deploy-pages.yml` (push to `master` touching `webapp/`); local preview via `npm run web` (`scripts/serve-webapp.js`, maps `/` → `index.html`, `/host` → `host.html`).

- **webapp/room-protocol.js**: Shared protocol pieces (`window.RoomProtocol`): room-code generation (4 chars, ambiguous characters excluded), channel naming (`room-<CODE>`), presence helpers, Supabase client factory.
- **webapp/quiz-validation.js**: Browser port of the validation rules in `menu.js` — keep the two in sync (`window.QuizValidation`).
- **webapp/host.html/js**: Quizmaster page (`HostController`). Creates a room (subscribes to the channel, checks presence for a competing host, tracks `{role:'host'}`), answers `join-request` broadcasts, derives player connected-state from presence, loads a single quiz file or folder (via `webkitdirectory`, sorted alphabetically like Electron playlists) and broadcasts `room:update`. Room (code + playlist) is persisted in `sessionStorage`, so a reload reclaims the room and rebuilds players from presence.
- **webapp/index.html + join.js**: Player join page (mobile-first, `JoinController`). Subscribes to the room channel, requires a host in presence (else "Raum nicht gefunden"), sends `join-request`, waits for the matching `join-response`, then tracks `{role:'player', playerId, name}`. Rejoins automatically after reload via `sessionStorage`; code can be pre-filled via `/?code=XXXX`.
- **webapp/vendor/supabase.js**: Vendored supabase-js UMD bundle (copied from `node_modules/@supabase/supabase-js/dist/umd/supabase.js`).

Broadcast events: `join-request` (player→host), `join-response` (host→players, filtered by `playerId`), `answer-submit` (player→host), `room:update` (public room state incl. `game`), `room:closed`. Duplicate names are rejected while the name's holder is connected; a disconnected player may rejoin under the same name.

**Gameplay — Topic Quiz (`.topicquiz`, typed answers)**: Host starts it from the playlist (▶ on playable types, see `PLAYABLE_EXTENSIONS` in `host.js`). State machine in `HostController.game` (`{quizIndex, phase: 'topics'|'question'|'revealed', topicIndex, playedTopics, answers}`), included in `room:update` as `game` and persisted in the host's `sessionStorage`. Phase `topics`: host sees the 4x4 topic grid (played topics disabled/struck through, like the Electron app), players see a read-only topic list. Host picks a topic → phase `question`: players type an answer (`answer-submit`, identified by `playerId`, may resubmit until reveal; a rejoining player gets `yourAnswer` in the `join-response`). Reveal is gated: only allowed when every **connected** player has answered. Pre-reveal the host UI shows only who answered (projector-safe). Results compare answers via `RoomProtocol.answersMatch` (case-insensitive, trimmed, collapsed whitespace) and are shown to everyone on reveal. `backToTopics()` marks the topic played and returns to the grid (auto-ends the quiz after the last topic); `endQuiz()` marks the playlist entry `played` and returns everyone to the lobby. `falseAnswers` in topic data are ignored in the web app (typed answers instead of multiple choice).

Room state lives only in the channel/browser while the room is open. Other quiz types (pair/sort/image/title) are not yet playable in the web app.

### Main Process (main.js)
- Creates BrowserWindow with `nodeIntegration: true` and `contextIsolation: false`
- Handles IPC messages for page navigation via `show-main-page` event
- Delegates menu/file handling to MenuController
- Opens DevTools when `--dev` flag is passed

### Menu System (menu.js)
- **MenuController** orchestrates the menu and IPC communication
- **QuizFileHandler** handles File > Open dialog and quiz file/folder operations
- Validates quiz data based on file extension using dedicated validator methods
- Stores quiz data in `temp-quiz-data.json` for persistence between page loads (includes `loadTimestamp` field)
- For image quizzes, also stores original file path in `temp-original-path.txt`
- For folder playlists, stores list in `temp-playlist.json` with current index
- Routes to appropriate quiz view based on extension via `QUIZ_TYPES` mapping
- Handles `quiz-completed` IPC event to advance playlist or return to main menu

### Shared Services (/shared/)
- **utils.js**: Common utilities like `shuffleArray`, `hashString`, and Electron module helpers
- **storage-service.js**: Local/session storage abstractions
- **sound-service.js**: Sound effects wrapper
- **error-handler.js**: Centralized error handling

### Validators (/validators/)
- **validator-factory.js**: Factory pattern for quiz validation
- Individual validator classes per quiz type (topic, pair, sort, image)
- **base-validator.js**: Base validation logic

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
  - Uses `loadTimestamp` from temp-quiz-data.json to detect new files and reset state
  - Disables played topics until app restart or new quiz file loaded
  - Stores timestamp in `localStorage.quizLoadTimestamp` for comparison

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
- **Completion**: Sends `quiz-completed` IPC to advance playlist

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
- **Completion**: Sends `quiz-completed` IPC to advance playlist

#### 4. Image Quiz (`/imagequiz/`)
- **Format**: Array of objects with `image` (filename) and `answer` properties
- **Extension**: `.imagequiz`
- **File**: `image.html` (single page)
- **Gameplay**:
  - Shows images sequentially on Enter press (question phase)
  - After all images shown, shows each image with answer (results phase)
  - Returns to main menu after final image+answer shown
- **Image Paths**: Resolved relative to `.imagequiz` file directory using `temp-original-path.txt`
- **Completion**: Sends `quiz-completed` IPC to advance playlist

#### 5. Title Quiz (`/titlequiz/`)
- **Format**: Object with `title` (required) and `subtitle` (optional) properties
- **Extension**: `.title`
- **File**: `title.html` (single page)
- **Display**: Shows title prominently with optional subtitle above
- **Navigation**: Press Enter to proceed
- **Completion**: Sends `quiz-completed` IPC to advance playlist

### Common Patterns

**Quiz Data Loading:**
All quiz types read from `temp-quiz-data.json` created by MenuController:
```javascript
const fs = require('fs');
const path = require('path');
const tempFilePath = path.join(__dirname, '..', 'temp-quiz-data.json');
const rawData = fs.readFileSync(tempFilePath, 'utf8');
const data = JSON.parse(rawData);
const quizData = data.quizData || data; // Handle wrapped or unwrapped format
const loadTimestamp = data.loadTimestamp; // Optional timestamp for file reload detection
```

**Quiz Completion:**
Send `quiz-completed` IPC event to advance playlist or return to main:
```javascript
const { ipcRenderer } = require('electron');
ipcRenderer.send('quiz-completed');
```

**Return to Main (legacy):**
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
├── menu.js                    # MenuController + QuizFileHandler - file/folder loading and validation
├── renderer.js                # Main page controller
├── sound-manager.js           # Global sound system
├── index.html                 # Main menu page
├── css/main.css              # Shared styles
├── sound-effects/            # Audio files
├── shared/                   # Shared utilities and services
│   ├── utils.js              # Array shuffling, hashing, Electron helpers
│   ├── storage-service.js    # Storage abstractions
│   ├── sound-service.js      # Sound wrapper
│   └── error-handler.js      # Error handling
├── validators/               # Quiz validation modules
│   ├── validator-factory.js  # Factory for validators
│   ├── base-validator.js     # Base validation
│   └── *-validator.js        # Per-quiz-type validators
├── topicquiz/                # Topic quiz (16 topics, grid navigation)
│   ├── topic.html/css/js     # Grid selector (TopicController)
│   ├── question.html/css/js  # Question display
│   └── answer.html/css/js    # Answer display
├── pairquiz/                 # Pair matching quiz
│   └── pair.html/css/js      # Single page with three columns (PairController)
├── sortquiz/                 # Sorting quiz
│   └── sort.html/css/js      # Single page with vertical graph (SortController)
├── imagequiz/                # Image identification quiz
│   └── image.html/css/js     # Single page with sequential images (ImageController)
└── titlequiz/                # Title display screen
    └── title.html/css/js     # Title display (TitleController)
```

## Key Implementation Details

- All navigation is keyboard-only (arrow keys + Enter)
- Quiz pages use `nodeIntegration: true` to access file system and IPC
- Topic quiz persists state across page loads but resets on app restart or new file (via timestamp comparison)
- Pair/Sort/Image/Title quizzes send `quiz-completed` IPC on completion to support playlists
- Sort quiz implements dynamic spot array that rebuilds after each placement
- Image quiz requires original file path to resolve relative image paths
- Each quiz type has a dedicated controller class that initializes on DOM load
- Controllers manage game state, navigation, rendering, and sound effects
- Playlist mode: File > Open Folder loads all quiz files alphabetically, plays sequentially
- Menu shortcuts: Cmd/Ctrl+O (open file), Cmd/Ctrl+Shift+O (open folder)
