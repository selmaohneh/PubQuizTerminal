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

The web mode turns every player's smartphone into a quiz terminal. The quizmaster starts a server, creates a room with a random code, and players join by entering the code and a name.

### Starting the Server

```bash
npm run server
```

The server prints the quizmaster URL (`http://localhost:3000/host`) and the join URLs for players on the local network. Set a custom port via `PORT=1234 npm run server`.

### Quizmaster

1. Open `http://localhost:3000/host` in a browser
2. Click **Raum erstellen** — a random 4-character room code is generated
3. Load a single quiz file (**Datei öffnen**) or a whole folder as a playlist (**Ordner öffnen**), same file formats and validation as the Electron app
4. Watch players join in real time

### Players

1. Open the join URL on a smartphone (the room code can be pre-filled via `?code=XXXX`)
2. Enter the room code and a name
3. The phone shows the waiting screen until the quizmaster starts — if the connection drops, rejoining with the same name resumes the seat

Rooms live in memory only. If the quizmaster's page disconnects, the room stays open for 60 seconds so it can be reclaimed; after that, players are notified that the room is closed.

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
