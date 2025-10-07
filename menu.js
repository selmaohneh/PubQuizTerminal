const { Menu, dialog, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

const QUIZ_TYPES = {
  TOPIC: { extension: '.topicquiz', path: 'topicquiz/topic.html' },
  PAIR: { extension: '.pairquiz', path: 'pairquiz/pair.html' },
  SORT: { extension: '.sortquiz', path: 'sortquiz/sort.html' },
  IMAGE: { extension: '.imagequiz', path: 'imagequiz/image.html' }
};

const STORAGE_FILES = {
  TEMP_QUIZ_DATA: 'temp-quiz-data.json',
  TEMP_ORIGINAL_PATH: 'temp-original-path.txt'
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

  async showFileDialog() {
    return dialog.showOpenDialog(this.mainWindow, {
      properties: ['openFile'],
      title: 'Select Quiz File',
      filters: [
        { name: 'Quiz Files', extensions: ['topicquiz', 'pairquiz', 'sortquiz', 'imagequiz'] },
        { name: 'Topic Quiz Files', extensions: ['topicquiz'] },
        { name: 'Pair Quiz Files', extensions: ['pairquiz'] },
        { name: 'Sort Quiz Files', extensions: ['sortquiz'] },
        { name: 'Image Quiz Files', extensions: ['imagequiz'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });
  }

  loadQuizFile(filePath) {
    try {
      const quizData = this.readQuizFile(filePath);
      const fileExtension = path.extname(filePath).toLowerCase();
      const validation = this.validateQuizData(fileExtension, quizData);

      if (!validation.isValid) {
        this.showValidationError(validation.errors);
        return;
      }

      this.saveQuizData(filePath, fileExtension, quizData);
      this.navigateToQuiz(fileExtension);
    } catch (error) {
      this.showError('Error loading quiz file', error.message);
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
      [QUIZ_TYPES.IMAGE.extension]: this.validateImageQuiz.bind(this)
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

  saveQuizData(filePath, fileExtension, quizData) {
    const tempFilePath = path.join(__dirname, STORAGE_FILES.TEMP_QUIZ_DATA);
    fs.writeFileSync(tempFilePath, JSON.stringify(quizData));

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
  }

  createMenu() {
    const template = [{
      label: 'File',
      submenu: [{
        label: 'Open',
        accelerator: 'CmdOrCtrl+O',
        click: () => this.fileHandler.openQuizFile()
      }]
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
