import { BaseQuizController } from '../shared/base-quiz-controller.js';
import { KEYS } from '../shared/constants.js';
import { shuffleArray } from '../shared/utils.js';

class SortController extends BaseQuizController {
  constructor() {
    super();
    this.leftItems = [];
    this.rightItems = [];
    this.sortedItems = [];
    this.selectedLeftIndex = -1;
    this.selectedRightIndex = -1;
    this.currentColumn = 'left';
    this.itemSelected = false;
    this.highlightedSpot = -1;
    this.gameState = 'playing';
    this.maxSpots = 0;
  }

  initializeElements() {
    this.gameView = document.getElementById('gameView');
    this.resultView = document.getElementById('resultView');
    this.leftColumn = document.getElementById('leftColumn');
    this.centerColumn = document.getElementById('centerColumn');
    this.rightColumn = document.getElementById('rightColumn');
    this.centerGraph = document.getElementById('centerGraph');
    this.resultGraph = document.getElementById('resultGraph');
  }

  bindEvents() {
    document.addEventListener('keydown', (event) => this.handleKeyNavigation(event));
  }

  start() {
    if (!this.quizData) {
      this.errors.handleFileNotFoundError('Sort quiz data', this.gameView);
      return;
    }
    this.initializeGame();
  }

  handleNewQuizFile() {
    window.location.reload();
  }

  initializeGame() {
    if (!this.validateGameData()) {
      return;
    }

    this.maxSpots = this.quizData.items.length + 1;
    const shuffledItems = shuffleArray([...this.quizData.items]);

    const centerItemIndex = Math.floor(Math.random() * shuffledItems.length);
    const centerItem = shuffledItems.splice(centerItemIndex, 1)[0];

    this.leftItems = shuffledItems.slice(0, 5);
    this.rightItems = shuffledItems.slice(5, 10);

    this.sortedItems = [null, { text: centerItem, originalIndex: this.quizData.items.indexOf(centerItem) }, null];

    this.renderGame();
    this.selectedLeftIndex = 0;
    this.currentColumn = 'left';
    this.updateSelection();
  }

  validateGameData() {
    if (!this.quizData.upperLabel || !this.quizData.lowerLabel ||
        !Array.isArray(this.quizData.items) ||
        this.quizData.items.length < 2 || this.quizData.items.length > 11) {
      this.errors.showError('Invalid sort quiz data structure', this.gameView);
      return false;
    }
    return true;
  }

  renderGame() {
    this.renderColumns();
    this.renderCenterGraph();
    this.applyCenterGraphScaling();
  }

  renderColumns() {
    this.leftColumn.innerHTML = '';
    this.rightColumn.innerHTML = '';

    this.leftItems.forEach((item, index) => {
      if (item !== null) {
        this.leftColumn.appendChild(this.createSortItem(item, 'left', index));
      }
    });

    this.rightItems.forEach((item, index) => {
      if (item !== null) {
        this.rightColumn.appendChild(this.createSortItem(item, 'right', index));
      }
    });
  }

  createSortItem(text, column, index) {
    const item = document.createElement('div');
    item.className = 'sort-item';
    item.dataset.column = column;
    item.dataset.index = index;

    const textElement = document.createElement('span');
    textElement.className = 'sort-text';
    textElement.textContent = text;

    item.appendChild(textElement);
    return item;
  }

  renderCenterGraph() {
    this.centerGraph.innerHTML = '';

    if (this.itemSelected && this.currentColumn === 'center' && this.highlightedSpot >= 0) {
      this.renderPreviewGraph();
    } else {
      this.renderNormalGraph();
    }
  }

  renderNormalGraph() {
    this.addLabel(this.quizData.upperLabel);
    this.buildDynamicGraph();
    this.addConnector('lower-label');
    this.addLabel(this.quizData.lowerLabel);
  }

  renderPreviewGraph() {
    const selectedItem = this.getSelectedItem();
    if (!selectedItem) return;

    const previewArray = [...this.sortedItems];
    previewArray[this.highlightedSpot] = {
      text: selectedItem,
      originalIndex: this.quizData.items.indexOf(selectedItem),
      isPreview: true
    };

    this.addLabel(this.quizData.upperLabel);
    this.buildGraphFromArray(previewArray);
    this.addConnector('lower-label');
    this.addLabel(this.quizData.lowerLabel);
  }

  getSelectedItem() {
    if (this.selectedLeftIndex >= 0) {
      return this.leftItems[this.selectedLeftIndex];
    } else if (this.selectedRightIndex >= 0) {
      return this.rightItems[this.selectedRightIndex];
    }
    return null;
  }

  buildDynamicGraph() {
    this.buildGraphFromArray(this.sortedItems);
  }

  buildGraphFromArray(itemArray) {
    let spotNumber = 1;

    itemArray.forEach((item, index) => {
      if (item === null) {
        this.addSpotIndicator(spotNumber++, index);
      } else {
        this.addGraphItem(item, item.isPreview);
      }
    });
  }

  addLabel(text) {
    const label = document.createElement('div');
    label.className = 'graph-label';
    label.textContent = text;
    this.centerGraph.appendChild(label);
  }

  addConnector(additionalClass = '') {
    const connector = document.createElement('div');
    connector.className = `graph-connector ${additionalClass}`.trim();
    this.centerGraph.appendChild(connector);
  }

  addSpotIndicator(spotNumber, position) {
    this.addConnector();
    const spotIndicator = document.createElement('div');
    spotIndicator.className = 'spot-indicator';
    spotIndicator.dataset.spot = position;
    this.centerGraph.appendChild(spotIndicator);
  }

  addGraphItem(item, isPreview = false) {
    this.addConnector();

    const spot = document.createElement('div');
    spot.className = `sort-item graph-item ${isPreview ? 'preview-item' : 'placed'}`;

    const textElement = document.createElement('span');
    textElement.className = 'sort-text';
    textElement.textContent = item.text;
    spot.appendChild(textElement);

    this.centerGraph.appendChild(spot);
    this.addConnector();
  }

  applyCenterGraphScaling() {
    const totalElements = this.centerGraph.children.length;
    this.applyScaling(this.centerGraph, totalElements);
  }

  applyScaling(container, totalElements) {
    const labels = container.querySelectorAll('.graph-label');
    const items = container.querySelectorAll('.graph-item');
    const connectors = container.querySelectorAll('.graph-connector');

    if (totalElements > 20) {
      this.applySmallScale(labels, items, connectors);
    } else if (totalElements > 15) {
      this.applyMediumScale(labels, items, connectors);
    }
  }

  applySmallScale(labels, items, connectors) {
    labels.forEach(label => {
      label.style.fontSize = 'clamp(0.8rem, 1.6vw, 1.6rem)';
      label.style.padding = '0.1vh';
    });
    items.forEach(item => {
      item.style.minHeight = '2.5vh';
      item.style.maxHeight = '5vh';
      const text = item.querySelector('.sort-text');
      if (text) text.style.fontSize = 'clamp(0.8rem, 1.6vw, 1.6rem)';
    });
    connectors.forEach(connector => {
      connector.style.height = '1vh';
      connector.style.minHeight = '0.8vh';
    });
  }

  applyMediumScale(labels, items, connectors) {
    labels.forEach(label => {
      label.style.fontSize = 'clamp(0.9rem, 1.9vw, 1.9rem)';
      label.style.padding = '0.15vh';
    });
    items.forEach(item => {
      item.style.minHeight = '3vh';
      item.style.maxHeight = '7vh';
      const text = item.querySelector('.sort-text');
      if (text) text.style.fontSize = 'clamp(0.9rem, 1.9vw, 1.9rem)';
    });
    connectors.forEach(connector => {
      connector.style.height = '1.2vh';
      connector.style.minHeight = '1vh';
    });
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
      this.navigateInColumn(this.getAvailableLeftIndices(), this.selectedLeftIndex, -1,
        (index) => this.selectedLeftIndex = index);
    } else if (this.currentColumn === 'right') {
      this.navigateInColumn(this.getAvailableRightIndices(), this.selectedRightIndex, -1,
        (index) => this.selectedRightIndex = index);
    } else if (this.currentColumn === 'center') {
      this.navigateInColumn(this.getAvailableSpots(), this.highlightedSpot, -1,
        (spot) => {
          this.highlightedSpot = spot;
          this.renderGame();
        });
    }
  }

  navigateDown() {
    if (this.currentColumn === 'left') {
      this.navigateInColumn(this.getAvailableLeftIndices(), this.selectedLeftIndex, 1,
        (index) => this.selectedLeftIndex = index);
    } else if (this.currentColumn === 'right') {
      this.navigateInColumn(this.getAvailableRightIndices(), this.selectedRightIndex, 1,
        (index) => this.selectedRightIndex = index);
    } else if (this.currentColumn === 'center') {
      this.navigateInColumn(this.getAvailableSpots(), this.highlightedSpot, 1,
        (spot) => {
          this.highlightedSpot = spot;
          this.renderGame();
        });
    }
  }

  navigateInColumn(available, current, direction, setter) {
    const currentPos = available.indexOf(current);
    const newPos = currentPos + direction;

    if (newPos >= 0 && newPos < available.length) {
      setter(available[newPos]);
      this.updateSelection();
    }
  }

  navigateLeft() {
    if (this.currentColumn === 'center' && this.itemSelected) {
      return;
    }
    if (this.currentColumn === 'right') {
      this.switchToColumn('left', this.getAvailableLeftIndices(),
        (index) => this.selectedLeftIndex = index);
      this.selectedRightIndex = -1;
    }
  }

  navigateRight() {
    if (this.currentColumn === 'center' && this.itemSelected) {
      return;
    }
    if (this.currentColumn === 'left') {
      this.switchToColumn('right', this.getAvailableRightIndices(),
        (index) => this.selectedRightIndex = index);
      this.selectedLeftIndex = -1;
    }
  }

  switchToColumn(column, availableIndices, setter) {
    this.currentColumn = column;
    if (availableIndices.length > 0) {
      setter(availableIndices[0]);
    }
    this.updateSelection();
  }

  getAvailableLeftIndices() {
    return this.leftItems.map((_, index) => index).filter(index => this.leftItems[index] !== null);
  }

  getAvailableRightIndices() {
    return this.rightItems.map((_, index) => index).filter(index => this.rightItems[index] !== null);
  }

  getAvailableSpots() {
    return this.sortedItems.map((_, index) => index).filter(index => this.sortedItems[index] === null);
  }

  updateSelection() {
    document.querySelectorAll('.sort-item').forEach(item => {
      item.classList.remove('selected', 'highlight-spot');
    });

    if (this.currentColumn === 'left' && this.selectedLeftIndex >= 0) {
      this.highlightItemInColumn(this.leftColumn, this.getAvailableLeftIndices(), this.selectedLeftIndex);
    } else if (this.currentColumn === 'right' && this.selectedRightIndex >= 0) {
      this.highlightItemInColumn(this.rightColumn, this.getAvailableRightIndices(), this.selectedRightIndex);
    }
  }

  highlightItemInColumn(column, availableIndices, selectedIndex) {
    const displayIndex = availableIndices.indexOf(selectedIndex);
    if (displayIndex >= 0 && column.children[displayIndex]) {
      column.children[displayIndex].classList.add('selected');
    }
  }

  selectCurrentItem() {
    if ((this.currentColumn === 'left' && this.selectedLeftIndex >= 0 && !this.itemSelected) ||
        (this.currentColumn === 'right' && this.selectedRightIndex >= 0 && !this.itemSelected)) {
      this.selectItemForPlacement();
    } else if (this.currentColumn === 'center' && this.highlightedSpot >= 0 && this.itemSelected) {
      this.placeItem();
    }
  }

  selectItemForPlacement() {
    this.itemSelected = true;
    this.currentColumn = 'center';
    const availableSpots = this.getAvailableSpots();
    if (availableSpots.length > 0) {
      this.highlightedSpot = availableSpots[0];
    }
    this.renderGame();
    this.updateSelection();
  }

  placeItem() {
    const itemText = this.getSelectedItem();
    const itemOriginalIndex = this.quizData.items.indexOf(itemText);

    if (this.selectedLeftIndex >= 0) {
      this.leftItems[this.selectedLeftIndex] = null;
    } else if (this.selectedRightIndex >= 0) {
      this.rightItems[this.selectedRightIndex] = null;
    }

    if (this.isPlacementCorrect(itemOriginalIndex, this.highlightedSpot)) {
      this.handleCorrectPlacement(itemText, itemOriginalIndex);
    } else {
      this.handleWrongPlacement();
    }
  }

  isPlacementCorrect(itemOriginalIndex, spotIndex) {
    const tempSorted = [...this.sortedItems];
    tempSorted[spotIndex] = { originalIndex: itemOriginalIndex };

    const placedItems = tempSorted
      .map((item, position) => item ? { position, originalIndex: item.originalIndex } : null)
      .filter(item => item !== null)
      .sort((a, b) => a.position - b.position);

    for (let i = 1; i < placedItems.length; i++) {
      if (placedItems[i].originalIndex <= placedItems[i - 1].originalIndex) {
        return false;
      }
    }
    return true;
  }

  handleCorrectPlacement(itemText, itemOriginalIndex) {
    this.sounds.playCorrect();

    this.sortedItems[this.highlightedSpot] = { text: itemText, originalIndex: itemOriginalIndex };
    this.rebuildSortedArray();

    this.resetSelection();
    this.renderGame();
    this.updateSelection();

    const remainingItems = this.getAvailableLeftIndices().length + this.getAvailableRightIndices().length;
    if (remainingItems === 0) {
      setTimeout(() => this.sounds.playCompleted(), 500);
      this.gameState = 'finished';
      setTimeout(() => this.showResults(), 1000);
    }
  }

  handleWrongPlacement() {
    this.sounds.playError();
    this.gameState = 'finished';
    this.showResults();
  }

  resetSelection() {
    this.selectedLeftIndex = -1;
    this.selectedRightIndex = -1;
    this.highlightedSpot = -1;
    this.itemSelected = false;

    const availableLeftIndices = this.getAvailableLeftIndices();
    const availableRightIndices = this.getAvailableRightIndices();

    if (availableLeftIndices.length > 0) {
      this.selectedLeftIndex = availableLeftIndices[0];
      this.currentColumn = 'left';
    } else if (availableRightIndices.length > 0) {
      this.selectedRightIndex = availableRightIndices[0];
      this.currentColumn = 'right';
    }
  }

  rebuildSortedArray() {
    const placedItems = this.sortedItems
      .filter(item => item !== null)
      .sort((a, b) => a.originalIndex - b.originalIndex);

    const newArray = [null];
    placedItems.forEach(item => {
      newArray.push(item);
      newArray.push(null);
    });

    this.sortedItems = newArray;
  }

  showResults() {
    this.gameView.style.display = 'none';
    this.resultView.style.display = 'flex';
    this.gameState = 'result';
    this.renderResultGraph();
  }

  renderResultGraph() {
    this.resultGraph.innerHTML = '';

    this.addResultLabel(this.quizData.upperLabel);
    this.quizData.items.forEach((item, index) => {
      this.addResultItem({ text: item, originalIndex: index });
    });
    this.addResultConnector('lower-label');
    this.addResultLabel(this.quizData.lowerLabel);

    const totalElements = this.resultGraph.children.length;
    this.applyScaling(this.resultGraph, totalElements);
  }

  addResultLabel(text) {
    const label = document.createElement('div');
    label.className = 'graph-label';
    label.textContent = text;
    this.resultGraph.appendChild(label);
  }

  addResultConnector(additionalClass = '') {
    const connector = document.createElement('div');
    connector.className = `graph-connector ${additionalClass}`.trim();
    this.resultGraph.appendChild(connector);
  }

  addResultItem(item) {
    this.addResultConnector();

    const spot = document.createElement('div');
    spot.className = 'sort-item graph-item placed';

    const textElement = document.createElement('span');
    textElement.className = 'sort-text';
    textElement.textContent = item.text;
    spot.appendChild(textElement);

    this.resultGraph.appendChild(spot);
    this.addResultConnector();
  }

  returnToMenu() {
    this.navigateToMainPage();
  }
}

document.addEventListener('DOMContentLoaded', () => new SortController());
