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
        { name: 'Topic Quiz Files', extensions: ['topicquiz'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
      const filePath = result.filePaths[0];
      console.log('Selected quiz file:', filePath);
      
      try {
        // Read and parse the quiz file
        const fs = require('fs');
        const quizData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        // Validate the quiz data structure
        if (this.validateQuizData(quizData)) {
          // Store quiz data in a temporary file for persistence between page loads
          const path = require('path');
          const tempFilePath = path.join(__dirname, 'temp-quiz-data.json');
          fs.writeFileSync(tempFilePath, JSON.stringify(quizData));
          
          // Show quiz page
          this.mainWindow.webContents.send('show-quiz-page');
        } else {
          dialog.showErrorBox('Invalid Quiz File', 'The selected file does not contain valid quiz data.');
        }
      } catch (error) {
        console.error('Error loading quiz file:', error);
        dialog.showErrorBox('Error Loading File', 'Could not load the selected quiz file. Please check the file format.');
      }
    }
  }

  validateQuizData(data) {
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
