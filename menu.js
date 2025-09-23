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
        { name: 'Quiz Files', extensions: ['topicquiz', 'pairquiz'] },
        { name: 'Topic Quiz Files', extensions: ['topicquiz'] },
        { name: 'Pair Quiz Files', extensions: ['pairquiz'] },
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
        }
        
        if (isValid) {
          // Store quiz data in a temporary file for persistence between page loads
          const tempFilePath = path.join(__dirname, 'temp-quiz-data.json');
          fs.writeFileSync(tempFilePath, JSON.stringify(quizData));
          
          // Load appropriate quiz page based on file type
          if (fileExtension === '.topicquiz') {
            this.mainWindow.loadFile('topicquiz/topic.html');
          } else if (fileExtension === '.pairquiz') {
            this.mainWindow.loadFile('pairquiz/pair.html');
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
    // Check if data is an array with at least 1 item and max 11 items
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
