import { StorageService } from './storage-service.js';
import { SoundService } from './sound-service.js';
import { IPCService } from './ipc-service.js';
import { ErrorHandler } from './error-handler.js';

export class BaseQuizController {
  constructor() {
    this.storage = StorageService;
    this.sounds = new SoundService();
    this.ipc = IPCService;
    this.errors = ErrorHandler;
    this.quizData = null;

    this.initialize();
  }

  initialize() {
    this.initializeElements();
    this.bindCommonEvents();
    this.loadQuizData();
    this.bindEvents();
    this.start();
  }

  initializeElements() {
    throw new Error('initializeElements() must be implemented by subclass');
  }

  bindEvents() {
    throw new Error('bindEvents() must be implemented by subclass');
  }

  start() {
    throw new Error('start() must be implemented by subclass');
  }

  bindCommonEvents() {
    this.ipc.onShowQuizPage(() => {
      this.handleNewQuizFile();
    });
  }

  handleNewQuizFile() {
    console.log('New quiz file loaded');
  }

  loadQuizData() {
    try {
      this.quizData = this.storage.loadQuizDataFromFile();
      if (this.quizData) {
        this.storage.setQuizData(this.quizData);
      }
    } catch (error) {
      this.errors.logError(error, 'Quiz Data Load');
    }
  }

  handleError(error, context = '') {
    this.errors.logError(error, context);
  }

  navigateToMain() {
    this.ipc.navigateToMain();
  }

  navigateToMainPage() {
    this.ipc.showMainPage();
  }
}
