/**
 * Pair Quiz Game Logic
 * Handles pairing game with keyboard navigation
 * Three columns: left items, center matched pairs, right items
 */

class PairController {
    constructor() {
        this.pairData = [];
        this.leftItems = [];
        this.rightItems = [];
        this.matchedPairs = [];
        this.selectedLeftIndex = -1;
        this.selectedRightIndex = -1;
        this.currentColumn = 'left'; // 'left' or 'right'
        this.leftItemSelected = false; // Track if left item was selected first
        this.gameState = 'playing'; // 'playing', 'finished', 'result'
        
        // Check if sound manager is available
        if (typeof soundManager !== 'undefined') {
            console.log('Sound manager is available for pair quiz');
        } else {
            console.warn('Sound manager not found - sounds will not play');
        }
        
        this.initializeElements();
        this.bindEvents();
        this.loadPairData();
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
        document.addEventListener('keydown', (event) => {
            this.handleKeyNavigation(event);
        });
    }

    loadPairData() {
        // Try to load pair data from temporary file
        if (typeof require !== 'undefined') {
            try {
                const fs = require('fs');
                const path = require('path');
                const tempFilePath = path.join(__dirname, '..', 'temp-quiz-data.json');
                
                if (fs.existsSync(tempFilePath)) {
                    const rawData = fs.readFileSync(tempFilePath, 'utf8');
                    const parsedData = JSON.parse(rawData);
                    this.pairData = parsedData.quizData || parsedData;
                    console.log('Loaded pair data from temp file:', this.pairData.length, 'pairs');
                    this.initializeGame();
                } else {
                    console.error('No pair quiz file found');
                    this.showError('No quiz data found. Please load a quiz file first.');
                }
            } catch (error) {
                console.error('Error loading pair data:', error);
                this.showError('Error loading quiz data: ' + error.message);
            }
        } else {
            this.showError('No quiz data found. Please load a quiz file first.');
        }
    }


    initializeGame() {
        // Separate valid pairs from extra items
        const validPairs = this.pairData.filter(item => item.left && item.right);
        const extraItems = this.pairData.filter(item => !item.left && item.right);
        
        // Extract left and right items from valid pairs
        this.leftItems = validPairs.map(pair => pair.left);
        this.rightItems = validPairs.map(pair => pair.right);
        
        // Add extra items to right side
        extraItems.forEach(item => {
            this.rightItems.push(item.right);
        });
        
        // Store the number of actual pairs for game completion check
        this.totalPairs = validPairs.length;
        
        // Shuffle both arrays
        this.shuffleArray(this.leftItems);
        this.shuffleArray(this.rightItems);
        
        // Render the game
        this.renderGame();
        
        // Start with first left item selected
        this.selectedLeftIndex = 0;
        this.currentColumn = 'left';
        this.updateSelection();
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    renderGame() {
        // Clear columns
        this.leftColumn.innerHTML = '';
        this.rightColumn.innerHTML = '';
        this.centerColumn.innerHTML = '';
        
        // Render left items
        this.leftItems.forEach((item, index) => {
            const itemElement = this.createPairItem(item, 'left', index);
            itemElement.style.visibility = 'visible'; // Ensure visibility is reset
            this.leftColumn.appendChild(itemElement);
        });
        
        // Render right items
        this.rightItems.forEach((item, index) => {
            const itemElement = this.createPairItem(item, 'right', index);
            itemElement.style.visibility = 'visible'; // Ensure visibility is reset
            this.rightColumn.appendChild(itemElement);
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
            if (event.key === 'Enter') {
                this.returnToMenu();
            }
            return;
        }

        if (this.gameState !== 'playing') return;

        switch(event.key) {
            case 'ArrowUp':
                event.preventDefault();
                this.navigateUp();
                break;
            case 'ArrowDown':
                event.preventDefault();
                this.navigateDown();
                break;
            case 'ArrowLeft':
                event.preventDefault();
                this.navigateLeft();
                break;
            case 'ArrowRight':
                event.preventDefault();
                this.navigateRight();
                break;
            case 'Enter':
                event.preventDefault();
                this.selectCurrentItem();
                break;
        }
    }

    navigateUp() {
        if (this.currentColumn === 'left') {
            const availableIndices = this.getAvailableLeftIndices();
            const currentPos = availableIndices.indexOf(this.selectedLeftIndex);
            if (currentPos > 0) {
                this.selectedLeftIndex = availableIndices[currentPos - 1];
                this.updateSelection();
            }
        } else if (this.currentColumn === 'right') {
            const availableIndices = this.getAvailableRightIndices();
            const currentPos = availableIndices.indexOf(this.selectedRightIndex);
            if (currentPos > 0) {
                this.selectedRightIndex = availableIndices[currentPos - 1];
                this.updateSelection();
            }
        }
    }

    navigateDown() {
        if (this.currentColumn === 'left') {
            const availableIndices = this.getAvailableLeftIndices();
            const currentPos = availableIndices.indexOf(this.selectedLeftIndex);
            if (currentPos < availableIndices.length - 1) {
                this.selectedLeftIndex = availableIndices[currentPos + 1];
                this.updateSelection();
            }
        } else if (this.currentColumn === 'right') {
            const availableIndices = this.getAvailableRightIndices();
            const currentPos = availableIndices.indexOf(this.selectedRightIndex);
            if (currentPos < availableIndices.length - 1) {
                this.selectedRightIndex = availableIndices[currentPos + 1];
                this.updateSelection();
            }
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
        // Only allow moving to right column if a left item was selected first
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
        // Clear all selections
        document.querySelectorAll('.pair-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        // Keep left item highlighted if it was selected
        if (this.leftItemSelected && this.selectedLeftIndex >= 0) {
            const leftItem = this.leftColumn.children[this.selectedLeftIndex];
            if (leftItem) {
                leftItem.classList.add('selected');
            }
        }
        
        // Highlight current selection
        if (this.currentColumn === 'left' && this.selectedLeftIndex >= 0 && !this.leftItemSelected) {
            const leftItem = this.leftColumn.children[this.selectedLeftIndex];
            if (leftItem) {
                leftItem.classList.add('selected');
            }
        } else if (this.currentColumn === 'right' && this.selectedRightIndex >= 0) {
            const rightItem = this.rightColumn.children[this.selectedRightIndex];
            if (rightItem) {
                rightItem.classList.add('selected');
            }
        }
    }

    selectCurrentItem() {
        if (this.currentColumn === 'left' && this.selectedLeftIndex >= 0) {
            // Left item selected, mark it as selected and move to right column
            this.leftItemSelected = true;
            this.currentColumn = 'right';
            const availableRightIndices = this.getAvailableRightIndices();
            if (availableRightIndices.length > 0) {
                this.selectedRightIndex = availableRightIndices[0];
            }
            this.updateSelection();
        } else if (this.currentColumn === 'right' && this.selectedRightIndex >= 0) {
            // Right item selected, check if it's a correct pair
            this.checkPair();
        }
    }

    checkPair() {
        const leftText = this.leftItems[this.selectedLeftIndex];
        const rightText = this.rightItems[this.selectedRightIndex];
        
        // Check if this is a correct pair
        const validPairs = this.pairData.filter(item => item.left && item.right);
        const isCorrectPair = validPairs.some(pair => 
            pair.left === leftText && pair.right === rightText
        );
        
        if (isCorrectPair) {
            // Play correct sound
            if (typeof soundManager !== 'undefined') {
                console.log('Playing correct sound for pair:', leftText, '-', rightText);
                soundManager.playCorrect();
            } else {
                console.warn('Sound manager not available');
            }
            
            // Correct pair - move to center
            this.matchedPairs.push({
                leftIndex: this.selectedLeftIndex,
                rightIndex: this.selectedRightIndex,
                leftText: leftText,
                rightText: rightText
            });
            
            this.addMatchedPairToCenter(leftText, rightText);
            
            // Reset selection
            this.selectedLeftIndex = -1;
            this.selectedRightIndex = -1;
            this.currentColumn = 'left';
            this.leftItemSelected = false;
            
            // Select next available left item
            const availableLeftIndices = this.getAvailableLeftIndices();
            if (availableLeftIndices.length > 0) {
                this.selectedLeftIndex = availableLeftIndices[0];
            }
            
            this.updateSelection();
            this.updateItemStates();
            
            // Check if game is complete
            if (this.matchedPairs.length === this.totalPairs) {
                // Play completion sound
                if (typeof soundManager !== 'undefined') {
                    setTimeout(() => soundManager.playCompleted(), 500);
                }
                this.gameState = 'finished';
                setTimeout(() => this.showResults(), 1000);
            }
        } else {
            // Play error sound
            if (typeof soundManager !== 'undefined') {
                console.log('Playing error sound for wrong pair:', leftText, '-', rightText);
                soundManager.playError();
            } else {
                console.warn('Sound manager not available');
            }
            
            // Incorrect pair - end game and show results
            this.gameState = 'finished';
            this.showResults();
        }
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
        // Hide matched items by setting visibility to hidden (keeps layout)
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
        // Hide game view and show result view
        this.gameView.style.display = 'none';
        this.resultView.style.display = 'flex';
        this.gameState = 'result';
        
        // Clear any existing extra items
        this.resultView.querySelectorAll('.extra-item').forEach(item => item.remove());
        
        // Show all correct pairs
        this.renderAllCorrectPairs();
    }

    renderAllCorrectPairs() {
        this.resultPairs.innerHTML = '';
        
        // Show all correct pairs (filter out extra items)
        const validPairs = this.pairData.filter(item => item.left && item.right);
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
        
        // Show extra item(s) in red at the bottom
        const extraItems = this.pairData.filter(item => !item.left && item.right);
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
        // Send IPC message to signal quiz completion
        if (typeof require !== 'undefined') {
            const { ipcRenderer } = require('electron');
            ipcRenderer.send('quiz-completed');
        } else {
            // Fallback for browser testing
            window.location.href = '../index.html';
        }
    }
}

// Initialize pair controller when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PairController();
});
