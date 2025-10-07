import { BaseQuizController } from '../shared/base-quiz-controller.js';
import { KEYS } from '../shared/constants.js';
import { shuffleArray } from '../shared/utils.js';

class PairController extends BaseQuizController {
  constructor() {
    super();
    this.leftItems = [];
    this.rightItems = [];
    this.matchedPairs = [];
    this.selectedLeftIndex = -1;
    this.selectedRightIndex = -1;
    this.currentColumn = 'left';
    this.leftItemSelected = false;
    this.gameState = 'playing';
    this.totalPairs = 0;
  }

  initializeElements() {
    this.gameView = document.getElementById('gameView');
    this.resultView = document.getElementById('resultView');
    this.leftColumn = document.getElementById('leftColumn');
    this.centerColumn = document.getElementById('centerColumn');
    this.rightColumn = document.getElementById('rightColumn');
    this.resultPairs = document.getElementById('resultPairs');
  }

  bindEvents() {
    document.addEventListener('keydown', (event) => this.handleKeyNavigation(event));
  }

  start() {
    if (!this.quizData) {
      this.errors.handleFileNotFoundError('Pair quiz data', this.gameView);
      return;
    }
    this.initializeGame();
  }

  handleNewQuizFile() {
    window.location.reload();
  }

  initializeGame() {
    const validPairs = this.quizData.filter(item => item.left && item.right);
    const extraItems = this.quizData.filter(item => !item.left && item.right);

    this.leftItems = validPairs.map(pair => pair.left);
    this.rightItems = [...validPairs.map(pair => pair.right), ...extraItems.map(item => item.right)];
    this.totalPairs = validPairs.length;

    shuffleArray(this.leftItems);
    shuffleArray(this.rightItems);

    this.renderGame();
    this.selectedLeftIndex = 0;
    this.currentColumn = 'left';
    this.updateSelection();
  }

  renderGame() {
    this.leftColumn.innerHTML = '';
    this.rightColumn.innerHTML = '';
    this.centerColumn.innerHTML = '';

    this.leftItems.forEach((item, index) => {
      const element = this.createPairItem(item, 'left', index);
      element.style.visibility = 'visible';
      this.leftColumn.appendChild(element);
    });

    this.rightItems.forEach((item, index) => {
      const element = this.createPairItem(item, 'right', index);
      element.style.visibility = 'visible';
      this.rightColumn.appendChild(element);
    });
  }

  createPairItem(text, column, index) {
    const item = document.createElement('div');
    item.className = 'pair-item';
    item.dataset.column = column;
    item.dataset.index = index;

    const textElement = document.createElement('span');
    textElement.className = 'pair-text';
    textElement.textContent = text;

    item.appendChild(textElement);
    return item;
  }

  handleKeyNavigation(event) {
    if (this.gameState === 'result') {
      if (event.key === KEYS.ENTER) {
        this.returnToMenu();
      }
      return;
    }

    if (this.gameState !== 'playing') return;

    const handlers = {
      [KEYS.ARROW_UP]: () => this.navigateUp(),
      [KEYS.ARROW_DOWN]: () => this.navigateDown(),
      [KEYS.ARROW_LEFT]: () => this.navigateLeft(),
      [KEYS.ARROW_RIGHT]: () => this.navigateRight(),
      [KEYS.ENTER]: () => this.selectCurrentItem()
    };

    const handler = handlers[event.key];
    if (handler) {
      event.preventDefault();
      handler();
    }
  }

  navigateUp() {
    if (this.currentColumn === 'left') {
      this.navigateColumn(this.getAvailableLeftIndices(), this.selectedLeftIndex, -1,
        (index) => this.selectedLeftIndex = index);
    } else if (this.currentColumn === 'right') {
      this.navigateColumn(this.getAvailableRightIndices(), this.selectedRightIndex, -1,
        (index) => this.selectedRightIndex = index);
    }
  }

  navigateDown() {
    if (this.currentColumn === 'left') {
      this.navigateColumn(this.getAvailableLeftIndices(), this.selectedLeftIndex, 1,
        (index) => this.selectedLeftIndex = index);
    } else if (this.currentColumn === 'right') {
      this.navigateColumn(this.getAvailableRightIndices(), this.selectedRightIndex, 1,
        (index) => this.selectedRightIndex = index);
    }
  }

  navigateColumn(availableIndices, currentIndex, direction, setIndex) {
    const currentPos = availableIndices.indexOf(currentIndex);
    const newPos = currentPos + direction;

    if (newPos >= 0 && newPos < availableIndices.length) {
      setIndex(availableIndices[newPos]);
      this.updateSelection();
    }
  }

  navigateLeft() {
    if (this.currentColumn === 'right') {
      this.currentColumn = 'left';
      if (this.selectedLeftIndex === -1) {
        const availableIndices = this.getAvailableLeftIndices();
        if (availableIndices.length > 0) {
          this.selectedLeftIndex = availableIndices[0];
        }
      }
      this.selectedRightIndex = -1;
      this.updateSelection();
    }
  }

  navigateRight() {
    if (this.currentColumn === 'left' && this.leftItemSelected) {
      this.currentColumn = 'right';
      if (this.selectedRightIndex === -1) {
        const availableIndices = this.getAvailableRightIndices();
        if (availableIndices.length > 0) {
          this.selectedRightIndex = availableIndices[0];
        }
      }
      this.updateSelection();
    }
  }

  getAvailableLeftIndices() {
    return this.leftItems.map((_, index) => index)
      .filter(index => !this.isLeftItemMatched(index));
  }

  getAvailableRightIndices() {
    return this.rightItems.map((_, index) => index)
      .filter(index => !this.isRightItemMatched(index));
  }

  isLeftItemMatched(index) {
    return this.matchedPairs.some(pair => pair.leftIndex === index);
  }

  isRightItemMatched(index) {
    return this.matchedPairs.some(pair => pair.rightIndex === index);
  }

  updateSelection() {
    document.querySelectorAll('.pair-item').forEach(item => item.classList.remove('selected'));

    if (this.leftItemSelected && this.selectedLeftIndex >= 0) {
      const leftItem = this.leftColumn.children[this.selectedLeftIndex];
      if (leftItem) leftItem.classList.add('selected');
    }

    if (this.currentColumn === 'left' && this.selectedLeftIndex >= 0 && !this.leftItemSelected) {
      const leftItem = this.leftColumn.children[this.selectedLeftIndex];
      if (leftItem) leftItem.classList.add('selected');
    } else if (this.currentColumn === 'right' && this.selectedRightIndex >= 0) {
      const rightItem = this.rightColumn.children[this.selectedRightIndex];
      if (rightItem) rightItem.classList.add('selected');
    }
  }

  selectCurrentItem() {
    if (this.currentColumn === 'left' && this.selectedLeftIndex >= 0) {
      this.leftItemSelected = true;
      this.currentColumn = 'right';
      const availableRightIndices = this.getAvailableRightIndices();
      if (availableRightIndices.length > 0) {
        this.selectedRightIndex = availableRightIndices[0];
      }
      this.updateSelection();
    } else if (this.currentColumn === 'right' && this.selectedRightIndex >= 0) {
      this.checkPair();
    }
  }

  checkPair() {
    const leftText = this.leftItems[this.selectedLeftIndex];
    const rightText = this.rightItems[this.selectedRightIndex];

    const validPairs = this.quizData.filter(item => item.left && item.right);
    const isCorrectPair = validPairs.some(pair => pair.left === leftText && pair.right === rightText);

    if (isCorrectPair) {
      this.handleCorrectPair(leftText, rightText);
    } else {
      this.handleWrongPair();
    }
  }

  handleCorrectPair(leftText, rightText) {
    this.sounds.playCorrect();

    this.matchedPairs.push({
      leftIndex: this.selectedLeftIndex,
      rightIndex: this.selectedRightIndex,
      leftText,
      rightText
    });

    this.addMatchedPairToCenter(leftText, rightText);
    this.resetSelection();
    this.updateItemStates();

    if (this.matchedPairs.length === this.totalPairs) {
      setTimeout(() => this.sounds.playCompleted(), 500);
      this.gameState = 'finished';
      setTimeout(() => this.showResults(), 1000);
    }
  }

  handleWrongPair() {
    this.sounds.playError();
    this.gameState = 'finished';
    this.showResults();
  }

  resetSelection() {
    this.selectedLeftIndex = -1;
    this.selectedRightIndex = -1;
    this.currentColumn = 'left';
    this.leftItemSelected = false;

    const availableLeftIndices = this.getAvailableLeftIndices();
    if (availableLeftIndices.length > 0) {
      this.selectedLeftIndex = availableLeftIndices[0];
    }

    this.updateSelection();
  }

  addMatchedPairToCenter(leftText, rightText) {
    const matchedPair = document.createElement('div');
    matchedPair.className = 'matched-pair';

    const leftItem = this.createPairItem(leftText, 'center', -1);
    const rightItem = this.createPairItem(rightText, 'center', -1);
    const connectionLine = document.createElement('div');
    connectionLine.className = 'connection-line';

    leftItem.classList.add('matched');
    rightItem.classList.add('matched');

    matchedPair.appendChild(leftItem);
    matchedPair.appendChild(connectionLine);
    matchedPair.appendChild(rightItem);

    this.centerColumn.appendChild(matchedPair);
  }

  updateItemStates() {
    this.leftColumn.querySelectorAll('.pair-item').forEach((item, index) => {
      if (this.isLeftItemMatched(index)) {
        item.style.visibility = 'hidden';
      }
    });

    this.rightColumn.querySelectorAll('.pair-item').forEach((item, index) => {
      if (this.isRightItemMatched(index)) {
        item.style.visibility = 'hidden';
      }
    });
  }

  showResults() {
    this.gameView.style.display = 'none';
    this.resultView.style.display = 'flex';
    this.gameState = 'result';

    this.resultView.querySelectorAll('.extra-item').forEach(item => item.remove());
    this.renderAllCorrectPairs();
  }

  renderAllCorrectPairs() {
    this.resultPairs.innerHTML = '';

    const validPairs = this.quizData.filter(item => item.left && item.right);
    validPairs.forEach(pair => {
      const matchedPair = document.createElement('div');
      matchedPair.className = 'matched-pair';

      const leftItem = this.createPairItem(pair.left, 'result', -1);
      const rightItem = this.createPairItem(pair.right, 'result', -1);
      const connectionLine = document.createElement('div');
      connectionLine.className = 'connection-line';

      leftItem.classList.add('matched');
      rightItem.classList.add('matched');

      matchedPair.appendChild(leftItem);
      matchedPair.appendChild(connectionLine);
      matchedPair.appendChild(rightItem);

      this.resultPairs.appendChild(matchedPair);
    });

    const extraItems = this.quizData.filter(item => !item.left && item.right);
    extraItems.forEach(item => {
      const extraItem = document.createElement('div');
      extraItem.className = 'extra-item';

      const textElement = document.createElement('span');
      textElement.className = 'pair-text';
      textElement.textContent = item.right;

      extraItem.appendChild(textElement);
      this.resultView.appendChild(extraItem);
    });
  }

  returnToMenu() {
    this.navigateToMainPage();
  }
}

document.addEventListener('DOMContentLoaded', () => new PairController());
