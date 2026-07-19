# PubQuizTerminal

A terminal-based pub quiz application built with Electron. Features five different quiz types with keyboard-only navigation and support for playlist mode.

## Getting Started

### Prerequisites

- Node.js (version 16 or higher)
- npm (comes with Node.js)

### Installation

1. Navigate to the project directory:
   ```bash
   cd PubQuizTerminal
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Running the Application

```bash
npm start
```

## Quiz Rooms (Web Mode)

The web mode turns every player's smartphone into a quiz terminal — over the internet, no LAN required. The quizmaster creates a room with a random code, and players join by entering the code and a name. Rooms run over [Supabase Realtime](https://supabase.com/docs/guides/realtime) channels; the web app itself is fully static, so there is no server to operate.

### Hosting

The app deploys to GitHub Pages automatically via `.github/workflows/deploy-pages.yml` on every push to `master` that touches `webapp/`. One-time setup: in the repository settings under **Pages**, set the source to **GitHub Actions**. The app is then live at `https://<user>.github.io/PubQuizTerminal/` (players) and `.../host.html` (quizmaster). Any other static host works too — just publish the `webapp/` folder.

For local development:

```bash
npm run web   # serves webapp/ on http://localhost:3000 (override with PORT)
```

### Quizmaster

1. Open `host.html` in a browser
2. Click **Raum erstellen** — a random 4-character room code is generated
3. Load a single quiz file (**Datei öffnen**) or a whole folder as a playlist (**Ordner öffnen**), same file formats and validation as the Electron app
4. Watch players join in real time
5. Start a playable quiz from the playlist (▶). Currently playable in the web mode: **Topic Quiz** (`.topicquiz`)

**Topic Quiz in web mode**: the quizmaster picks a topic from the 4x4 grid (just like in the Electron app — played topics are struck through). Every player then types an answer to the topic's question on their phone; answers can be changed until the reveal. The reveal button unlocks only once **all connected players** have typed; before the reveal the host screen only shows *who* has answered, never the answers (projector-safe). On reveal, everyone sees the correct answer, their own right/wrong verdict, and all answers (compared case-insensitively with normalized whitespace). After the last topic, the quiz is marked as played in the playlist.

Reloading the page restores the room (same code, players stay in). Closing the room notifies all players.

### Players

1. Open the join page on a smartphone (the room code can be pre-filled via `?code=XXXX` — the quizmaster page shows a ready-made link)
2. Enter the room code and a name
3. The phone shows the waiting screen until the quizmaster starts — if the connection drops, rejoining with the same name resumes the seat

### How it works

Each room is a Supabase Realtime channel (`room-<CODE>`). The quizmaster's browser is the authority: it answers join requests, tracks who is online via presence, and broadcasts the room state. No room data touches a database — everything lives in the channel while the room is open. The Supabase project URL and publishable key are configured in `webapp/config.js`.

## Usage

### Loading Quizzes

- **Single Quiz**: File > Open File (Cmd/Ctrl+O) to load a single quiz file
- **Playlist Mode**: File > Open Folder (Cmd/Ctrl+Shift+O) to load all quiz files in a folder and play them sequentially

### Navigation

All quizzes use keyboard-only navigation:
- **Arrow Keys**: Navigate between options
- **Enter**: Select/Confirm

## Quiz Types and Formats

### 1. Topic Quiz (`.topicquiz`)

A 4x4 grid of 16 topics. Players select a topic, see the question, then reveal the answer.

**Format**: Array of 16 topic objects

**JSON Template**:
```json
[
  {
    "name": "Topic 1",
    "question": "What is the question?",
    "answer": "This is the answer",
    "falseAnswers": ["Wrong 1", "Wrong 2", "Wrong 3"]
  },
  {
    "name": "Topic 2",
    "question": "Another question?",
    "answer": "Another answer"
  }
]
```

**Fields**:
- `name` (required): Topic name displayed on grid
- `question` (required): Question text
- `answer` (required): Answer text
- `falseAnswers` (optional): Array of incorrect answers

**Rules**:
- Must have exactly 16 topics
- Topics are disabled after being played until app restart or new file loaded

---

### 2. Pair Quiz (`.pairquiz`)

Match pairs of items. Players select an item from the left column, then match it with the correct item from the right column.

**Format**: Array of pair objects

**JSON Template**:
```json
[
  {
    "left": "Item A",
    "right": "Match A"
  },
  {
    "left": "Item B",
    "right": "Match B"
  },
  {
    "left": "Item C",
    "right": "Match C"
  },
  {
    "left": "",
    "right": "Extra Item"
  }
]
```

**Fields**:
- `left`: Left column item (empty string for extra items)
- `right`: Right column item

**Rules**:
- Must have 1-10 valid pairs (both left and right non-empty)
- Max 1 extra item (empty left, non-empty right)
- Total items: 1-11
- Wrong match or selecting extra item ends the game

---

### 3. Sort Quiz (`.sortquiz`)

Sort items in order between two labels. Players place items one by one in ascending order.

**Format**: Object with labels and items array

**JSON Template**:
```json
{
  "upperLabel": "Earliest",
  "lowerLabel": "Latest",
  "items": [
    "First item",
    "Second item",
    "Third item",
    "Fourth item",
    "Fifth item"
  ]
}
```

**Fields**:
- `upperLabel` (required): Label for top of scale
- `lowerLabel` (required): Label for bottom of scale
- `items` (required): Array of 2-11 strings to sort

**Rules**:
- Items must be placed in their original array order
- Wrong placement ends the game
- One item starts in center, others split between left/right columns

---

### 4. Image Quiz (`.imagequiz`)

Display images sequentially. Players progress through images, then see each image with its answer.

**Format**: Array of image objects

**JSON Template**:
```json
[
  {
    "image": "image1.jpg",
    "answer": "Answer for image 1"
  },
  {
    "image": "subfolder/image2.png",
    "answer": "Answer for image 2"
  },
  {
    "image": "image3.gif",
    "answer": "Answer for image 3"
  }
]
```

**Fields**:
- `image` (required): Image filename (relative to quiz file location)
- `answer` (required): Answer text

**Rules**:
- Must have at least 1 item
- Image paths are resolved relative to the `.imagequiz` file location
- Supports standard image formats (jpg, png, gif, etc.)

---

### 5. Title Quiz (`.title`)

Display a title screen with optional subtitle. Useful for section dividers in playlists.

**Format**: Object with title and optional subtitle

**JSON Template**:
```json
{
  "title": "Main Title Text",
  "subtitle": "Optional subtitle text"
}
```

**Fields**:
- `title` (required): Main title text
- `subtitle` (optional): Subtitle displayed above title

**Rules**:
- Title cannot be empty
- Press Enter to proceed to next quiz in playlist

---

## Example Quiz Files

Sample quiz files are included in each quiz type's subdirectory for reference.

There also is a subdirectory for the official Hopfenhirn-Quizzes.
