# PubQuizTerminal

A terminal-based pub quiz application built with Electron.

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

#### Development Mode
```bash
npm run dev
```
This will start the application with developer tools open.

#### Production Mode
```bash
npm start
```

### Building the Application

To build the application for distribution:
```bash
npm run build
```

To create distributables:
```bash
npm run dist
```

## Project Structure

```
PubQuizTerminal/
├── main.js          # Main Electron process
├── index.html       # Main application window
├── styles.css       # Application styling
├── renderer.js      # Renderer process logic
├── package.json     # Project configuration and dependencies
└── README.md        # This file
```

## Features

- Modern, responsive UI with a terminal-like interface
- Cross-platform support (Windows, macOS, Linux)
- Keyboard shortcuts for common actions
- Extensible architecture for quiz functionality

## Development

The application is structured with:
- **Main Process** (`main.js`): Handles window creation, menu setup, and app lifecycle
- **Renderer Process** (`renderer.js`): Handles UI interactions and business logic
- **Styling** (`styles.css`): Modern CSS with gradients and responsive design

## Future Enhancements

This is a basic Electron application template. Consider adding:
- Quiz creation and management
- Question database
- Scoring system
- Multiplayer support
- Quiz templates
- Import/export functionality

## License

MIT License
