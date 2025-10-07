import { IPC_CHANNELS } from './constants.js';
import { getElectronModules } from './utils.js';

export class IPCService {
  static send(channel, ...args) {
    const { ipcRenderer } = getElectronModules();
    if (!ipcRenderer) {
      console.warn(`IPC not available: ${channel}`);
      return;
    }
    ipcRenderer.send(channel, ...args);
  }

  static on(channel, callback) {
    const { ipcRenderer } = getElectronModules();
    if (!ipcRenderer) {
      return () => {};
    }
    ipcRenderer.on(channel, callback);
    return () => ipcRenderer.removeListener(channel, callback);
  }

  static navigateToMain() {
    this.send(IPC_CHANNELS.NAVIGATE_TO_MAIN);
  }

  static showMainPage() {
    this.send(IPC_CHANNELS.SHOW_MAIN_PAGE);
  }

  static loadQuizPage() {
    this.send(IPC_CHANNELS.LOAD_QUIZ_PAGE);
  }

  static onShowQuizPage(callback) {
    return this.on(IPC_CHANNELS.SHOW_QUIZ_PAGE, callback);
  }

  static onLoadQuizData(callback) {
    return this.on(IPC_CHANNELS.LOAD_QUIZ_DATA, callback);
  }
}
