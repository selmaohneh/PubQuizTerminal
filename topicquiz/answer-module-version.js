import { BaseQuizController } from '../shared/base-quiz-controller.js';
import { KEYS, STORAGE_KEYS } from '../shared/constants.js';

class AnswerController extends BaseQuizController {
  constructor() {
    super();
    this.questionText = null;
    this.topicName = null;
    this.answerText = null;
  }

  initializeElements() {
    this.questionText = document.getElementById('question-text');
    this.topicName = document.getElementById('topic-name');
    this.answerText = document.getElementById('answer-text');
  }

  bindEvents() {
    document.addEventListener('keydown', (event) => this.handleKeyNavigation(event));
  }

  start() {
    this.loadAnswer();
  }

  handleNewQuizFile() {
    window.location.href = 'topic.html';
  }

  loadAnswer() {
    const question = localStorage.getItem(STORAGE_KEYS.CURRENT_QUESTION);
    const answer = localStorage.getItem(STORAGE_KEYS.CURRENT_ANSWER);
    const topic = localStorage.getItem(STORAGE_KEYS.CURRENT_TOPIC);

    if (question && answer && topic) {
      this.displayAnswer(question, answer, topic);
      this.sounds.playCorrect();
    } else {
      this.displayError();
      this.sounds.playError();
    }
  }

  displayAnswer(question, answer, topic) {
    this.questionText.textContent = question;
    this.answerText.textContent = answer;
    this.topicName.textContent = topic;
  }

  displayError() {
    this.questionText.textContent = 'No question data available.';
    this.answerText.textContent = 'No answer available.';
    this.topicName.textContent = 'Unknown Topic';
  }

  handleKeyNavigation(event) {
    if (event.key === KEYS.ENTER) {
      event.preventDefault();
      this.goBackToTopics();
    }
  }

  goBackToTopics() {
    this.markTopicAsPlayed();

    if (this.areAllTopicsPlayed()) {
      this.returnToHomeScreen();
    } else {
      this.storage.clearQuizSession();
      window.location.href = 'topic.html';
    }
  }

  markTopicAsPlayed() {
    const currentTopic = localStorage.getItem(STORAGE_KEYS.CURRENT_TOPIC);
    if (!currentTopic || !this.quizData) {
      return;
    }

    const topicIndex = this.quizData.findIndex(t => t.name === currentTopic);
    if (topicIndex === -1) {
      return;
    }

    const topicId = (topicIndex + 1).toString();
    this.storage.addPlayedTopic(topicId);
  }

  areAllTopicsPlayed() {
    if (!this.quizData) {
      return false;
    }

    const playedTopics = this.storage.getPlayedTopics();
    return playedTopics.length >= this.quizData.length;
  }

  returnToHomeScreen() {
    this.storage.clearAllQuizData();
    this.navigateToMainPage();
  }
}

document.addEventListener('DOMContentLoaded', () => new AnswerController());
