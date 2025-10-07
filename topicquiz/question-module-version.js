import { BaseQuizController } from '../shared/base-quiz-controller.js';
import { KEYS, STORAGE_KEYS } from '../shared/constants.js';
import { shuffleArray } from '../shared/utils.js';

class QuestionController extends BaseQuizController {
  constructor() {
    super();
    this.topic = null;
    this.questionText = null;
    this.topicName = null;
    this.questionNumber = null;
    this.answerCards = null;
    this.answerCardElements = null;
    this.correctAnswerIndex = null;
  }

  initializeElements() {
    this.questionText = document.getElementById('question-text');
    this.topicName = document.getElementById('topic-name');
    this.questionNumber = document.getElementById('question-number');
    this.answerCards = document.getElementById('answer-cards');
    this.answerCardElements = document.querySelectorAll('.answer-card');
  }

  bindEvents() {
    document.addEventListener('keydown', (event) => this.handleKeyNavigation(event));
  }

  start() {
    this.loadQuestion();
  }

  handleNewQuizFile() {
    window.location.href = 'topic.html';
  }

  loadQuestion() {
    const topicId = this.getTopicId();
    const topicIndex = parseInt(topicId) - 1;

    if (!this.quizData || topicIndex < 0 || topicIndex >= this.quizData.length) {
      this.showQuestionError();
      return;
    }

    this.topic = this.quizData[topicIndex];
    this.displayQuestion();
    this.saveTopicData();
    this.setupMultipleChoice();
    this.sounds.playDing();
  }

  getTopicId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('topic') || localStorage.getItem(STORAGE_KEYS.SELECTED_TOPIC);
  }

  displayQuestion() {
    this.questionText.textContent = this.topic.question;
    this.topicName.textContent = this.topic.name;
  }

  saveTopicData() {
    localStorage.setItem(STORAGE_KEYS.CURRENT_ANSWER, this.topic.answer);
    localStorage.setItem(STORAGE_KEYS.CURRENT_QUESTION, this.topic.question);
    localStorage.setItem(STORAGE_KEYS.CURRENT_TOPIC, this.topic.name);
  }

  setupMultipleChoice() {
    const falseAnswers = this.topic.falseAnswers || [];

    if (falseAnswers.length === 0) {
      this.answerCards.style.display = 'none';
      return;
    }

    this.answerCards.style.display = 'grid';

    const allAnswers = [this.topic.answer, ...falseAnswers];
    shuffleArray(allAnswers);

    this.correctAnswerIndex = allAnswers.indexOf(this.topic.answer) + 1;

    this.updateAnswerCards(allAnswers);
    this.saveAnswerData(allAnswers);
  }

  updateAnswerCards(allAnswers) {
    this.answerCardElements.forEach((card, index) => {
      if (index < allAnswers.length) {
        const answerText = card.querySelector('.answer-text');
        answerText.textContent = allAnswers[index];
        card.style.display = 'flex';
      } else {
        card.style.display = 'none';
      }
    });
  }

  saveAnswerData(allAnswers) {
    localStorage.setItem(STORAGE_KEYS.CORRECT_ANSWER_INDEX, this.correctAnswerIndex.toString());
    localStorage.setItem(STORAGE_KEYS.ANSWER_OPTIONS, JSON.stringify(allAnswers));
  }

  showQuestionError() {
    this.questionText.textContent = 'No quiz data available. Please load a quiz file.';
    this.topicName.textContent = 'Error';
    this.sounds.playError();
  }

  handleKeyNavigation(event) {
    const handlers = {
      [KEYS.ENTER]: () => this.showAnswer(),
      [KEYS.DIGIT_1]: () => this.selectAnswer(1),
      [KEYS.DIGIT_2]: () => this.selectAnswer(2),
      [KEYS.DIGIT_3]: () => this.selectAnswer(3),
      [KEYS.DIGIT_4]: () => this.selectAnswer(4)
    };

    const handler = handlers[event.key];
    if (handler) {
      event.preventDefault();
      handler();
    }
  }

  selectAnswer(answerNumber) {
    console.log(`Answer ${answerNumber} selected`);
  }

  showAnswer() {
    window.location.href = 'answer.html';
  }
}

document.addEventListener('DOMContentLoaded', () => new QuestionController());
