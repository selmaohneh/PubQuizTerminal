import { BaseQuizController } from '../shared/base-quiz-controller.js';
import { TOPIC_QUIZ, KEYS, STORAGE_KEYS } from '../shared/constants.js';
import { hashString } from '../shared/utils.js';

class TopicController extends BaseQuizController {
  constructor() {
    super();
    this.currentSelectedIndex = 0;
    this.topicCards = null;
  }

  initializeElements() {
    this.topicCards = document.querySelectorAll('.topic-card');
  }

  bindEvents() {
    document.addEventListener('keydown', (event) => this.handleKeyNavigation(event));
  }

  start() {
    this.initializeQuizSession();
    this.loadPlayedTopics();
    this.updateTopicNames();
    this.selectFirstAvailableTopic();
  }

  handleNewQuizFile() {
    window.location.reload();
  }

  initializeQuizSession() {
    this.storage.clearQuizSession();

    const isNewFile = this.isNewQuizFile();
    const isFirstStart = !this.storage.isQuizSessionActive();

    if (isFirstStart || isNewFile) {
      this.storage.clearPlayedTopics();
      this.storage.setQuizSessionActive(true);

      if (this.quizData) {
        const hash = this.generateQuizDataHash();
        this.storage.setQuizDataHash(hash);
      }
    }
  }

  isNewQuizFile() {
    if (!this.quizData) {
      return false;
    }

    const currentHash = this.generateQuizDataHash();
    const storedHash = this.storage.getQuizDataHash();

    return currentHash !== storedHash;
  }

  generateQuizDataHash() {
    const simplified = this.quizData.map(topic => ({
      name: topic.name,
      question: topic.question,
      answer: topic.answer
    }));
    return hashString(JSON.stringify(simplified));
  }

  loadPlayedTopics() {
    const playedTopics = this.storage.getPlayedTopics();

    playedTopics.forEach(topicId => {
      const card = document.querySelector(`[data-topic="${topicId}"]`);
      if (card) {
        card.classList.add('disabled');
      }
    });
  }

  updateTopicNames() {
    if (!this.quizData) {
      return;
    }

    this.quizData.forEach((topic, index) => {
      const card = this.topicCards[index];
      if (card) {
        const titleElement = card.querySelector('.topic-title');
        if (titleElement) {
          titleElement.textContent = topic.name;
        }
        card.setAttribute('data-topic', (index + 1).toString());
      }
    });
  }

  selectFirstAvailableTopic() {
    for (let i = 0; i < this.topicCards.length; i++) {
      if (!this.topicCards[i].classList.contains('disabled')) {
        this.currentSelectedIndex = i;
        this.selectTopicByIndex(i);
        return;
      }
    }
    this.selectTopicByIndex(0);
  }

  handleKeyNavigation(event) {
    const handlers = {
      [KEYS.ARROW_UP]: () => this.navigateUp(),
      [KEYS.ARROW_DOWN]: () => this.navigateDown(),
      [KEYS.ARROW_LEFT]: () => this.navigateLeft(),
      [KEYS.ARROW_RIGHT]: () => this.navigateRight(),
      [KEYS.ENTER]: () => this.selectCurrentTopic()
    };

    const handler = handlers[event.key];
    if (handler) {
      event.preventDefault();
      handler();
    }
  }

  navigateUp() {
    this.navigateInDirection(-TOPIC_QUIZ.GRID_COLUMNS);
  }

  navigateDown() {
    this.navigateInDirection(TOPIC_QUIZ.GRID_COLUMNS);
  }

  navigateLeft() {
    let targetIndex = this.currentSelectedIndex;
    while (targetIndex % TOPIC_QUIZ.GRID_COLUMNS !== 0) {
      targetIndex--;
      if (!this.topicCards[targetIndex].classList.contains('disabled')) {
        this.selectTopicByIndex(targetIndex);
        return;
      }
    }
  }

  navigateRight() {
    let targetIndex = this.currentSelectedIndex;
    while (targetIndex % TOPIC_QUIZ.GRID_COLUMNS !== TOPIC_QUIZ.GRID_COLUMNS - 1) {
      targetIndex++;
      if (!this.topicCards[targetIndex].classList.contains('disabled')) {
        this.selectTopicByIndex(targetIndex);
        return;
      }
    }
  }

  navigateInDirection(delta) {
    let targetIndex = this.currentSelectedIndex;
    const limit = delta > 0 ? TOPIC_QUIZ.GRID_SIZE : 0;
    const condition = delta > 0 ? () => targetIndex < limit : () => targetIndex >= limit;

    while (condition()) {
      targetIndex += delta;
      if (targetIndex >= 0 && targetIndex < TOPIC_QUIZ.GRID_SIZE &&
          !this.topicCards[targetIndex].classList.contains('disabled')) {
        this.selectTopicByIndex(targetIndex);
        return;
      }
    }
  }

  selectTopicByIndex(index) {
    this.topicCards.forEach(card => card.classList.remove('selected'));

    if (this.topicCards[index]) {
      this.topicCards[index].classList.add('selected');
      this.currentSelectedIndex = index;
    }
  }

  selectCurrentTopic() {
    const currentCard = this.topicCards[this.currentSelectedIndex];
    if (!currentCard || currentCard.classList.contains('disabled')) {
      return;
    }

    const topicId = currentCard.getAttribute('data-topic');
    const topicTitle = currentCard.querySelector('.topic-title').textContent;

    localStorage.setItem(STORAGE_KEYS.SELECTED_TOPIC, topicId);
    localStorage.setItem(STORAGE_KEYS.SELECTED_TOPIC_NAME, topicTitle);
    localStorage.setItem(STORAGE_KEYS.QUESTION_INDEX, '0');

    window.location.href = `question.html?topic=${topicId}&q=0`;
  }
}

document.addEventListener('DOMContentLoaded', () => new TopicController());
