const { Menu, dialog, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

const QUIZ_TYPES = {
  TOPIC: { extension: '.topicquiz', path: 'topicquiz/topic.html' },
  PAIR: { extension: '.pairquiz', path: 'pairquiz/pair.html' },
  SORT: { extension: '.sortquiz', path: 'sortquiz/sort.html' },
  IMAGE: { extension: '.imagequiz', path: 'imagequiz/image.html' },
  TITLE: { extension: '.title', path: 'titlequiz/title.html' }
};

const STORAGE_FILES = {
  TEMP_QUIZ_DATA: 'temp-quiz-data.json',
  TEMP_ORIGINAL_PATH: 'temp-original-path.txt',
  TEMP_PLAYLIST: 'temp-playlist.json'
};

class QuizFileHandler {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
  }

  async openQuizFile() {
    const result = await this.showFileDialog();
    if (result.canceled || result.filePaths.length === 0) {
      return;
    }

    const filePath = result.filePaths[0];
    this.loadQuizFile(filePath);
  }

  async openQuizFolder() {
    const result = await this.showFolderDialog();
    if (result.canceled || result.filePaths.length === 0) {
      return;
    }

    const folderPath = result.filePaths[0];
    this.loadQuizFolder(folderPath);
  }

  async showFolderDialog() {
    return dialog.showOpenDialog(this.mainWindow, {
      properties: ['openDirectory'],
      title: 'Select Quiz Folder'
    });
  }

  loadQuizFolder(folderPath) {
    try {
      const quizFiles = this.scanFolderForQuizFiles(folderPath);

      if (quizFiles.length === 0) {
        this.showError('No Quiz Files Found', 'The selected folder does not contain any valid quiz files.');
        return;
      }

      // Validate all files before creating playlist
      for (const filePath of quizFiles) {
        const quizData = this.readQuizFile(filePath);
        const fileExtension = path.extname(filePath).toLowerCase();
        const validation = this.validateQuizData(fileExtension, quizData);

        if (!validation.isValid) {
          this.showValidationError([`Error in ${path.basename(filePath)}:`, ...validation.errors]);
          return;
        }
      }

      // Create playlist
      this.savePlaylist(quizFiles);

      // Load first quiz (don't clear playlist)
      this.loadQuizFile(quizFiles[0], false);
    } catch (error) {
      this.showError('Error loading quiz folder', error.message);
    }
  }

  scanFolderForQuizFiles(folderPath) {
    const validExtensions = Object.values(QUIZ_TYPES).map(type => type.extension);
    const files = fs.readdirSync(folderPath);

    const quizFiles = files
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return validExtensions.includes(ext);
      })
      .map(file => path.join(folderPath, file))
      .sort((a, b) => path.basename(a).localeCompare(path.basename(b)));

    return quizFiles;
  }

  savePlaylist(quizFiles) {
    const playlistPath = path.join(__dirname, STORAGE_FILES.TEMP_PLAYLIST);
    const playlist = {
      files: quizFiles,
      currentIndex: 0
    };
    fs.writeFileSync(playlistPath, JSON.stringify(playlist));
  }

  async showFileDialog() {
    return dialog.showOpenDialog(this.mainWindow, {
      properties: ['openFile'],
      title: 'Select Quiz File',
      filters: [
        { name: 'Quiz Files', extensions: ['topicquiz', 'pairquiz', 'sortquiz', 'imagequiz', 'title'] },
        { name: 'Topic Quiz Files', extensions: ['topicquiz'] },
        { name: 'Pair Quiz Files', extensions: ['pairquiz'] },
        { name: 'Sort Quiz Files', extensions: ['sortquiz'] },
        { name: 'Image Quiz Files', extensions: ['imagequiz'] },
        { name: 'Title Files', extensions: ['title'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });
  }

  loadQuizFile(filePath, clearPlaylist = true) {
    try {
      const quizData = this.readQuizFile(filePath);
      const fileExtension = path.extname(filePath).toLowerCase();
      const validation = this.validateQuizData(fileExtension, quizData);

      if (!validation.isValid) {
        this.showValidationError(validation.errors);
        return;
      }

      // Clear playlist when opening a single file
      if (clearPlaylist) {
        this.clearPlaylist();
      }

      this.saveQuizData(filePath, fileExtension, quizData);
      this.navigateToQuiz(fileExtension);
    } catch (error) {
      this.showError('Error loading quiz file', error.message);
    }
  }

  clearPlaylist() {
    const playlistPath = path.join(__dirname, STORAGE_FILES.TEMP_PLAYLIST);
    if (fs.existsSync(playlistPath)) {
      fs.unlinkSync(playlistPath);
    }
  }

  readQuizFile(filePath) {
    const rawData = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(rawData);
  }

  validateQuizData(fileExtension, data) {
    const validators = {
      [QUIZ_TYPES.TOPIC.extension]: this.validateTopicQuiz.bind(this),
      [QUIZ_TYPES.PAIR.extension]: this.validatePairQuiz.bind(this),
      [QUIZ_TYPES.SORT.extension]: this.validateSortQuiz.bind(this),
      [QUIZ_TYPES.IMAGE.extension]: this.validateImageQuiz.bind(this),
      [QUIZ_TYPES.TITLE.extension]: this.validateTitleQuiz.bind(this)
    };

    const validator = validators[fileExtension];
    return validator ? validator(data) : { isValid: false, errors: ['Unknown quiz type'] };
  }

  validateTopicQuiz(data) {
    if (!Array.isArray(data) || data.length !== 16) {
      return { isValid: false, errors: ['Topic quiz must have exactly 16 topics'] };
    }

    for (const topic of data) {
      if (!topic.name || !topic.question || !topic.answer) {
        return { isValid: false, errors: ['Each topic must have name, question, and answer'] };
      }
    }

    return { isValid: true };
  }

  validatePairQuiz(data) {
    if (!Array.isArray(data) || data.length < 1 || data.length > 11) {
      return { isValid: false, errors: ['Pair quiz must have 1-11 items'] };
    }

    let validPairs = 0;
    let extraItems = 0;

    for (const item of data) {
      if (!item.hasOwnProperty('left') || !item.hasOwnProperty('right')) {
        return { isValid: false, errors: ['Each item must have left and right properties'] };
      }

      if (item.left && item.right) {
        validPairs++;
      } else if (!item.left && item.right) {
        extraItems++;
      } else {
        return { isValid: false, errors: ['Invalid item structure'] };
      }
    }

    if (validPairs < 1 || validPairs > 10 || extraItems > 1) {
      return { isValid: false, errors: ['Must have 1-10 valid pairs and max 1 extra item'] };
    }

    return { isValid: true };
  }

  validateSortQuiz(data) {
    if (!data.upperLabel || !data.lowerLabel || !Array.isArray(data.items)) {
      return { isValid: false, errors: ['Sort quiz must have upperLabel, lowerLabel, and items'] };
    }

    if (typeof data.upperLabel !== 'string' || typeof data.lowerLabel !== 'string') {
      return { isValid: false, errors: ['Labels must be strings'] };
    }

    if (data.items.length < 2 || data.items.length > 11) {
      return { isValid: false, errors: ['Sort quiz must have 2-11 items'] };
    }

    for (const item of data.items) {
      if (typeof item !== 'string' || item.trim() === '') {
        return { isValid: false, errors: ['All items must be non-empty strings'] };
      }
    }

    return { isValid: true };
  }

  validateImageQuiz(data) {
    if (!Array.isArray(data) || data.length < 1) {
      return { isValid: false, errors: ['Image quiz must have at least 1 item'] };
    }

    for (const item of data) {
      if (!item.image || !item.answer) {
        return { isValid: false, errors: ['Each item must have image and answer'] };
      }

      if (typeof item.image !== 'string' || typeof item.answer !== 'string') {
        return { isValid: false, errors: ['Image and answer must be strings'] };
      }

      if (item.image.trim() === '' || item.answer.trim() === '') {
        return { isValid: false, errors: ['Image and answer cannot be empty'] };
      }
    }

    return { isValid: true };
  }

  validateTitleQuiz(data) {
    if (!data || typeof data !== 'object') {
      return { isValid: false, errors: ['Title quiz must be an object'] };
    }

    if (!data.title || typeof data.title !== 'string') {
      return { isValid: false, errors: ['Title quiz must have a title property that is a string'] };
    }

    if (data.title.trim() === '') {
      return { isValid: false, errors: ['Title cannot be empty'] };
    }

    return { isValid: true };
  }

  saveQuizData(filePath, fileExtension, quizData) {
    const tempFilePath = path.join(__dirname, STORAGE_FILES.TEMP_QUIZ_DATA);
    const dataToSave = {
      quizData: quizData,
      loadTimestamp: Date.now() // Add timestamp to detect file reloads
    };
    fs.writeFileSync(tempFilePath, JSON.stringify(dataToSave));

    if (fileExtension === QUIZ_TYPES.IMAGE.extension) {
      const originalPathFile = path.join(__dirname, STORAGE_FILES.TEMP_ORIGINAL_PATH);
      fs.writeFileSync(originalPathFile, filePath);
    }
  }

  navigateToQuiz(fileExtension) {
    const quizType = Object.values(QUIZ_TYPES).find(type => type.extension === fileExtension);
    if (quizType) {
      this.mainWindow.loadFile(quizType.path);
    }
  }

  showValidationError(errors) {
    dialog.showErrorBox('Invalid Quiz File', errors.join('\n'));
  }

  showError(title, message) {
    dialog.showErrorBox(title, message);
  }
}

class MenuController {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    this.fileHandler = new QuizFileHandler(mainWindow);
    this.setupIPC();
    this.createMenu();
  }

  setupIPC() {
    ipcMain.on('load-quiz-page', () => this.loadQuizPage());
    ipcMain.on('navigate-to-main', () => this.loadMainPage());
    ipcMain.on('quiz-completed', () => this.handleQuizCompleted());
  }

  handleQuizCompleted() {
    const playlistPath = path.join(__dirname, STORAGE_FILES.TEMP_PLAYLIST);

    if (!fs.existsSync(playlistPath)) {
      // No playlist, just return to main
      this.loadMainPage();
      return;
    }

    try {
      const playlist = JSON.parse(fs.readFileSync(playlistPath, 'utf8'));
      playlist.currentIndex++;

      if (playlist.currentIndex < playlist.files.length) {
        // Save updated playlist
        fs.writeFileSync(playlistPath, JSON.stringify(playlist));

        // Load next quiz
        const nextFile = playlist.files[playlist.currentIndex];
        this.fileHandler.loadQuizFile(nextFile, false);
      } else {
        // Playlist complete, clear it and return to main
        this.fileHandler.clearPlaylist();
        this.loadMainPage();
      }
    } catch (error) {
      console.error('Error handling playlist:', error);
      this.fileHandler.clearPlaylist();
      this.loadMainPage();
    }
  }

  createMenu() {
    const template = [{
      label: 'File',
      submenu: [
        {
          label: 'Open File',
          accelerator: 'CmdOrCtrl+O',
          click: () => this.fileHandler.openQuizFile()
        },
        {
          label: 'Open Folder',
          accelerator: 'CmdOrCtrl+Shift+O',
          click: () => this.fileHandler.openQuizFolder()
        }
      ]
    }];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  loadQuizPage() {
    this.mainWindow.loadFile('topicquiz/topic.html');
  }

  loadMainPage() {
    this.mainWindow.loadFile('index.html');
  }
}

function createMenu(mainWindow) {
  return new MenuController(mainWindow);
}

module.exports = { createMenu };
