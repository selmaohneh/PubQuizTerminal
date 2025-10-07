import { BaseQuizController } from '../shared/base-quiz-controller.js';
import { KEYS } from '../shared/constants.js';

class ImageController extends BaseQuizController {
  constructor() {
    super();
    this.currentIndex = 0;
    this.showingAnswer = false;
    this.quizComplete = false;
    this.originalFilePath = null;
  }

  initializeElements() {
    this.imageDisplay = document.getElementById('imageDisplay');
    this.answerDisplay = document.getElementById('answerDisplay');
  }

  bindEvents() {
    document.addEventListener('keydown', (event) => {
      if (event.key === KEYS.ENTER) {
        this.handleEnter();
      }
    });
  }

  start() {
    if (!this.quizData || this.quizData.length === 0) {
      this.showError('No quiz data found');
      return;
    }

    this.originalFilePath = this.storage.getOriginalFilePath();
    this.startQuiz();
  }

  handleNewQuizFile() {
    window.location.reload();
  }

  startQuiz() {
    this.currentIndex = 0;
    this.showingAnswer = false;
    this.quizComplete = false;
    this.showCurrentImage();
  }

  showCurrentImage() {
    if (this.currentIndex >= this.quizData.length) {
      this.startResultsPhase();
      return;
    }

    const currentItem = this.quizData[this.currentIndex];
    const imagePath = this.getImagePath(currentItem.image);

    this.imageDisplay.innerHTML = `<img src="${imagePath}" alt="Quiz Image">`;
    this.answerDisplay.style.display = 'none';

    this.sounds.playDing();
  }

  showImageWithAnswer() {
    const currentItem = this.quizData[this.currentIndex];
    const imagePath = this.getImagePath(currentItem.image);

    this.imageDisplay.innerHTML = `<img src="${imagePath}" alt="Quiz Image">`;
    this.answerDisplay.textContent = currentItem.answer;
    this.answerDisplay.style.display = 'flex';

    this.sounds.playCorrect();
  }

  getImagePath(imageFileName) {
    if (!this.originalFilePath) {
      return imageFileName;
    }

    try {
      const { path } = require('path') ? { path: require('path') } : { path: null };
      if (!path) {
        return imageFileName;
      }

      const quizDir = path.dirname(this.originalFilePath);
      return path.join(quizDir, imageFileName);
    } catch (error) {
      console.error('Error getting image path:', error);
      return imageFileName;
    }
  }

  handleEnter() {
    if (this.quizComplete) {
      this.handleResultsPhaseEnter();
    } else {
      this.handleQuestionPhaseEnter();
    }
  }

  handleQuestionPhaseEnter() {
    this.currentIndex++;
    if (this.currentIndex >= this.quizData.length) {
      this.startResultsPhase();
    } else {
      this.showCurrentImage();
    }
  }

  handleResultsPhaseEnter() {
    this.currentIndex++;
    if (this.currentIndex >= this.quizData.length) {
      this.returnToMainMenu();
    } else {
      this.showImageWithAnswer();
    }
  }

  startResultsPhase() {
    this.quizComplete = true;
    this.currentIndex = 0;
    this.showImageWithAnswer();
  }

  returnToMainMenu() {
    this.navigateToMain();
  }

  showError(message) {
    this.errors.showError(message, this.imageDisplay);
    this.sounds.playError();
  }
}

document.addEventListener('DOMContentLoaded', () => new ImageController());
