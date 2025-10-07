const { Menu, dialog, ipcMain } = require('electron');

class MenuController {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    this.setupIPC();
    this.createMenu();
  }

  setupIPC() {
    // Handle navigation to quiz page
    ipcMain.on('load-quiz-page', () => {
      this.loadQuizPage();
    });

    // Handle navigation back to main page
    ipcMain.on('navigate-to-main', () => {
      this.loadMainPage();
    });
  }

  createMenu() {
    const template = [
      {
        label: 'File',
        submenu: [
          {
            label: 'Open',
            accelerator: 'CmdOrCtrl+O',
            click: () => this.handleOpenFolder()
          }
        ]
      }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  async handleOpenFolder() {
    const result = await dialog.showOpenDialog(this.mainWindow, {
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
    
    if (!result.canceled && result.filePaths.length > 0) {
      const filePath = result.filePaths[0];
      console.log('Selected quiz file:', filePath);
      
      try {
        // Read and parse the quiz file
        const fs = require('fs');
        const path = require('path');
        const quizData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const fileExtension = path.extname(filePath).toLowerCase();
        
        // Validate based on file type
        let isValid = false;
        if (fileExtension === '.topicquiz') {
          isValid = this.validateTopicQuizData(quizData);
        } else if (fileExtension === '.pairquiz') {
          isValid = this.validatePairQuizData(quizData);
        } else if (fileExtension === '.sortquiz') {
          isValid = this.validateSortQuizData(quizData);
        } else if (fileExtension === '.imagequiz') {
          isValid = this.validateImageQuizData(quizData);
        }
        
        if (isValid) {
          // Store quiz data in a temporary file for persistence between page loads
          const tempFilePath = path.join(__dirname, 'temp-quiz-data.json');
          fs.writeFileSync(tempFilePath, JSON.stringify(quizData));
          
          // For imagequiz, also store the original file path
          if (fileExtension === '.imagequiz') {
            const originalFilePath = path.join(__dirname, 'temp-original-path.txt');
            fs.writeFileSync(originalFilePath, filePath);
          }
          
          // Load appropriate quiz page based on file type
          if (fileExtension === '.topicquiz') {
            this.mainWindow.loadFile('topicquiz/topic.html');
          } else if (fileExtension === '.pairquiz') {
            this.mainWindow.loadFile('pairquiz/pair.html');
          } else if (fileExtension === '.sortquiz') {
            this.mainWindow.loadFile('sortquiz/sort.html');
          } else if (fileExtension === '.imagequiz') {
            this.mainWindow.loadFile('imagequiz/image.html');
          }
        } else {
          dialog.showErrorBox('Invalid Quiz File', 'The selected file does not contain valid quiz data.');
        }
      } catch (error) {
        console.error('Error loading quiz file:', error);
        dialog.showErrorBox('Error Loading File', 'Could not load the selected quiz file. Please check the file format.');
      }
    }
  }

  validateTopicQuizData(data) {
    // Check if data is an array with exactly 16 topics
    if (!Array.isArray(data) || data.length !== 16) {
      return false;
    }

    // Validate each topic
    for (const topic of data) {
      if (!topic.name || !topic.question || !topic.answer) {
        return false;
      }
    }

    return true;
  }

  validatePairQuizData(data) {
    // Check if data is an array with at least 1 item and max 11 items (same as sort quiz)
    if (!Array.isArray(data) || data.length < 1 || data.length > 11) {
      return false;
    }

    // Count valid pairs (items with both left and right)
    let validPairs = 0;
    let extraItems = 0;

    for (const item of data) {
      if (!item.hasOwnProperty('left') || !item.hasOwnProperty('right')) {
        return false;
      }
      
      if (item.left && item.right) {
        validPairs++;
      } else if (!item.left && item.right) {
        extraItems++;
      } else {
        return false; // Invalid item structure
      }
    }

    // Should have at least 1 valid pair, max 10 pairs, and max 1 extra item
    return validPairs >= 1 && validPairs <= 10 && extraItems <= 1;
  }

  validateSortQuizData(data) {
    // Check if data has required properties
    if (!data.upperLabel || !data.lowerLabel || !Array.isArray(data.items)) {
      return false;
    }

    // Check if labels are strings
    if (typeof data.upperLabel !== 'string' || typeof data.lowerLabel !== 'string') {
      return false;
    }

    // Check if items array has between 2 and 11 items
    if (data.items.length < 2 || data.items.length > 11) {
      return false;
    }

    // Check if all items are strings
    for (const item of data.items) {
      if (typeof item !== 'string' || item.trim() === '') {
        return false;
      }
    }

    return true;
  }

  validateImageQuizData(data) {
    // Check if data is an array with at least 1 item
    if (!Array.isArray(data) || data.length < 1) {
      return false;
    }

    // Validate each image item
    for (const item of data) {
      if (!item.image || !item.answer) {
        return false;
      }
      
      // Check if image and answer are strings
      if (typeof item.image !== 'string' || typeof item.answer !== 'string') {
        return false;
      }
      
      // Check if strings are not empty
      if (item.image.trim() === '' || item.answer.trim() === '') {
        return false;
      }
    }

    return true;
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
