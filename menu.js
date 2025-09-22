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
      properties: ['openDirectory'],
      title: 'Select Folder'
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
      console.log('Selected folder:', result.filePaths[0]);
      // Show quiz page when folder is selected
      this.mainWindow.webContents.send('show-quiz-page');
    }
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
