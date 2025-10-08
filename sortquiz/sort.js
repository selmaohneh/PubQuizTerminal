/**
 * Sort Quiz Game Logic
 * Handles sorting game with keyboard navigation
 * Three columns: left items, center graph, right items
 * Players sort items from upper label to lower label
 */

class SortController {
    constructor() {
        this.sortData = {};
        this.leftItems = [];
        this.rightItems = [];
        this.sortedItems = []; // Items placed in order with their positions
        this.selectedLeftIndex = -1;
        this.selectedRightIndex = -1;
        this.currentColumn = 'left'; // 'left', 'right', or 'center'
        this.itemSelected = false; // Track if an item was selected
        this.highlightedSpot = -1; // Which spot in center is highlighted
        this.gameState = 'playing'; // 'playing', 'finished', 'result'
        this.totalSpots = 0; // Total number of spots between labels
        
        // Check if sound manager is available
        if (typeof soundManager !== 'undefined') {
            console.log('Sound manager is available for sort quiz');
        } else {
            console.warn('Sound manager not found - sounds will not play');
        }
        
        this.initializeElements();
        this.bindEvents();
        this.loadSortData();
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
        document.addEventListener('keydown', (event) => {
            this.handleKeyNavigation(event);
        });
    }

    loadSortData() {
        // Try to load sort data from temporary file
        if (typeof require !== 'undefined') {
            try {
                const fs = require('fs');
                const path = require('path');
                const tempFilePath = path.join(__dirname, '..', 'temp-quiz-data.json');
                
                if (fs.existsSync(tempFilePath)) {
                    const rawData = fs.readFileSync(tempFilePath, 'utf8');
                    const parsedData = JSON.parse(rawData);
                    this.sortData = parsedData.quizData || parsedData;
                    console.log('Loaded sort data from temp file:', this.sortData);
                    this.initializeGame();
                } else {
                    console.error('No sort quiz file found');
                    this.showError('No quiz data found. Please load a quiz file first.');
                }
            } catch (error) {
                console.error('Error loading sort data:', error);
                this.showError('Error loading quiz data: ' + error.message);
            }
        } else {
            this.showError('No quiz data found. Please load a quiz file first.');
        }
    }


    initializeGame() {
        if (!this.sortData.upperLabel || !this.sortData.lowerLabel || !Array.isArray(this.sortData.items) ||
            this.sortData.items.length < 2 || this.sortData.items.length > 11) {
            console.error('Invalid sort data structure');
            this.loadFallbackData();
            return;
        }

        // Total spots will be items.length + 1 when game is complete (one before each item + one after last item)
        this.maxSpots = this.sortData.items.length + 1;
        
        // Select 5 items randomly for left and right columns
        const shuffledItems = [...this.sortData.items];
        this.shuffleArray(shuffledItems);
        
        // Place 1 item randomly in center
        const centerItemIndex = Math.floor(Math.random() * shuffledItems.length);
        const centerItem = shuffledItems.splice(centerItemIndex, 1)[0];
        
        // Split remaining items between left and right (5 each)
        this.leftItems = shuffledItems.slice(0, 5);
        this.rightItems = shuffledItems.slice(5, 10);
        
        // Initialize with 3 spots so we can have spots above and below the center item
        this.sortedItems = [null, null, null]; // Start with 3 spots
        
        // Place the center item at position 1 (middle position)
        this.sortedItems[1] = {
            text: centerItem,
            originalIndex: this.sortData.items.indexOf(centerItem)
        };
        
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
        this.renderCenterGraph();
        
        // Render left items
        this.leftItems.forEach((item, index) => {
            if (item !== null) {
                const itemElement = this.createSortItem(item, 'left', index);
                this.leftColumn.appendChild(itemElement);
            }
        });
        
        // Render right items
        this.rightItems.forEach((item, index) => {
            if (item !== null) {
                const itemElement = this.createSortItem(item, 'right', index);
                this.rightColumn.appendChild(itemElement);
            }
        });
    }

    renderCenterGraph() {
        this.centerGraph.innerHTML = '';
        
        // Check if we should show preview instead of normal graph
        if (this.itemSelected && this.currentColumn === 'center' && this.highlightedSpot >= 0) {
            this.addPreviewItem();
        } else {
            // Normal graph rendering
            // Add upper label
            const upperLabel = document.createElement('div');
            upperLabel.className = 'graph-label';
            upperLabel.textContent = this.sortData.upperLabel;
            this.centerGraph.appendChild(upperLabel);
            
            // Build the dynamic graph with placed items and available spots
            this.buildDynamicGraph();
            
            // Add connector before lower label
            const lowerConnector = document.createElement('div');
            lowerConnector.className = 'graph-connector lower-label';
            this.centerGraph.appendChild(lowerConnector);
            
            // Add lower label
            const lowerLabel = document.createElement('div');
            lowerLabel.className = 'graph-label';
            lowerLabel.textContent = this.sortData.lowerLabel;
            this.centerGraph.appendChild(lowerLabel);
        }
        
        // Apply dynamic scaling based on number of items
        this.applyCenterGraphScaling();
    }

    buildDynamicGraph() {
        let spotNumber = 1;
        
        // Go through the sorted items array and build the graph
        for (let i = 0; i < this.sortedItems.length; i++) {
            if (this.sortedItems[i] === null) {
                // Empty spot - add connector for navigation
                this.addSpotIndicator(spotNumber++, i);
            } else {
                // Placed item - add as placed item
                this.addPlacedItem(this.sortedItems[i]);
            }
        }
    }

    addSpotIndicator(spotNumber, position) {
        // Add connector (empty spot for navigation)
        const connector = document.createElement('div');
        connector.className = 'graph-connector';
        this.centerGraph.appendChild(connector);
        
        // Add invisible spot indicator for navigation
        const spotIndicator = document.createElement('div');
        spotIndicator.className = 'spot-indicator';
        spotIndicator.dataset.spot = position;
        
        this.centerGraph.appendChild(spotIndicator);
    }

    addPlacedItem(item) {
        // Add connector before the item
        const connector = document.createElement('div');
        connector.className = 'graph-connector';
        this.centerGraph.appendChild(connector);
        
        // Add placed item
        const spot = document.createElement('div');
        spot.className = 'sort-item graph-item placed';
        
        const textElement = document.createElement('span');
        textElement.className = 'sort-text';
        textElement.textContent = item.text;
        spot.appendChild(textElement);
        
        this.centerGraph.appendChild(spot);
        
        // Add connector after the item
        const connectorAfter = document.createElement('div');
        connectorAfter.className = 'graph-connector';
        this.centerGraph.appendChild(connectorAfter);
    }

    addPlacedItemToResult(item) {
        // Add connector before the item
        const connector = document.createElement('div');
        connector.className = 'graph-connector';
        this.resultGraph.appendChild(connector);
        
        // Add placed item
        const spot = document.createElement('div');
        spot.className = 'sort-item graph-item placed';
        
        const textElement = document.createElement('span');
        textElement.className = 'sort-text';
        textElement.textContent = item.text;
        spot.appendChild(textElement);
        
        this.resultGraph.appendChild(spot);
        
        // Add connector after the item
        const connectorAfter = document.createElement('div');
        connectorAfter.className = 'graph-connector';
        this.resultGraph.appendChild(connectorAfter);
    }

    addPreviewItem() {
        // Only show preview if an item is selected and we're navigating in center
        if (!this.itemSelected || this.currentColumn !== 'center' || this.highlightedSpot < 0) {
            return;
        }

        // Get the selected item text
        let selectedItemText = '';
        if (this.selectedLeftIndex >= 0) {
            selectedItemText = this.leftItems[this.selectedLeftIndex];
        } else if (this.selectedRightIndex >= 0) {
            selectedItemText = this.rightItems[this.selectedRightIndex];
        }

        if (!selectedItemText) return;

        // Create a temporary array with the preview item placed
        const previewArray = [...this.sortedItems];
        previewArray[this.highlightedSpot] = {
            text: selectedItemText,
            originalIndex: this.sortData.items.indexOf(selectedItemText),
            isPreview: true
        };

        // Replace the normal graph with preview graph
        this.buildDynamicGraphWithPreview(previewArray);
    }

    buildDynamicGraphWithPreview(previewArray) {
        // Clear and rebuild with preview
        this.centerGraph.innerHTML = '';
        
        // Add upper label
        const upperLabel = document.createElement('div');
        upperLabel.className = 'graph-label';
        upperLabel.textContent = this.sortData.upperLabel;
        this.centerGraph.appendChild(upperLabel);

        let spotNumber = 1;
        
        // Go through the preview array and build the graph
        for (let i = 0; i < previewArray.length; i++) {
            if (previewArray[i] === null) {
                // Empty spot - add as numbered circle on connector
                this.addSpotIndicator(spotNumber++, i);
            } else {
                // Item (placed or preview) - add as item
                if (previewArray[i].isPreview) {
                    this.addPreviewItemElement(previewArray[i]);
                } else {
                    this.addPlacedItem(previewArray[i]);
                }
            }
        }
        
        // Add connector before lower label
        const lowerConnector = document.createElement('div');
        lowerConnector.className = 'graph-connector lower-label';
        this.centerGraph.appendChild(lowerConnector);
        
        // Add lower label
        const lowerLabel = document.createElement('div');
        lowerLabel.className = 'graph-label';
        lowerLabel.textContent = this.sortData.lowerLabel;
        this.centerGraph.appendChild(lowerLabel);
    }

    addPreviewItemElement(item) {
        // Add connector before the preview item
        const connector = document.createElement('div');
        connector.className = 'graph-connector';
        this.centerGraph.appendChild(connector);
        
        // Add preview item
        const spot = document.createElement('div');
        spot.className = 'sort-item graph-item preview-item';
        
        const textElement = document.createElement('span');
        textElement.className = 'sort-text';
        textElement.textContent = item.text;
        
        spot.appendChild(textElement);
        this.centerGraph.appendChild(spot);
        
        // Add connector after the preview item
        const connectorAfter = document.createElement('div');
        connectorAfter.className = 'graph-connector';
        this.centerGraph.appendChild(connectorAfter);
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
        } else if (this.currentColumn === 'center') {
            const availableSpots = this.getAvailableSpotsForNavigation();
            const currentPos = availableSpots.indexOf(this.highlightedSpot);
            if (currentPos > 0) {
                this.highlightedSpot = availableSpots[currentPos - 1];
                this.renderGame(); // Re-render to show preview
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
        } else if (this.currentColumn === 'center') {
            const availableSpots = this.getAvailableSpotsForNavigation();
            const currentPos = availableSpots.indexOf(this.highlightedSpot);
            if (currentPos < availableSpots.length - 1) {
                this.highlightedSpot = availableSpots[currentPos + 1];
                this.renderGame(); // Re-render to show preview
                this.updateSelection();
            }
        }
    }

    navigateLeft() {
        // If we're in center column placing an item, don't allow left/right navigation
        if (this.currentColumn === 'center' && this.itemSelected) {
            // Stay in center - no left/right navigation while placing item
            return;
        } else if (this.currentColumn === 'right') {
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
        // If we're in center column placing an item, don't allow left/right navigation
        if (this.currentColumn === 'center' && this.itemSelected) {
            // Stay in center - no left/right navigation while placing item
            return;
        } else if (this.currentColumn === 'left') {
            this.currentColumn = 'right';
            if (this.selectedRightIndex === -1) {
                const availableIndices = this.getAvailableRightIndices();
                if (availableIndices.length > 0) {
                    this.selectedRightIndex = availableIndices[0];
                }
            }
            this.selectedLeftIndex = -1;
            this.updateSelection();
        }
    }

    selectCurrentItem() {
        if (this.currentColumn === 'left' && this.selectedLeftIndex >= 0 && !this.itemSelected) {
            // Left item selected, move to center to choose placement
            this.itemSelected = true;
            this.currentColumn = 'center';
            const availableSpots = this.getAvailableSpotsForNavigation();
            if (availableSpots.length > 0) {
                this.highlightedSpot = availableSpots[0];
            }
            this.renderGame(); // Re-render to show preview
            this.updateSelection();
        } else if (this.currentColumn === 'right' && this.selectedRightIndex >= 0 && !this.itemSelected) {
            // Right item selected, move to center to choose placement
            this.itemSelected = true;
            this.currentColumn = 'center';
            const availableSpots = this.getAvailableSpotsForNavigation();
            if (availableSpots.length > 0) {
                this.highlightedSpot = availableSpots[0];
            }
            this.renderGame(); // Re-render to show preview
            this.updateSelection();
        } else if (this.currentColumn === 'center' && this.highlightedSpot >= 0 && this.itemSelected) {
            // Place the item in the selected spot
            this.placeItem();
        }
    }

    placeItem() {
        let itemText = '';
        let itemOriginalIndex = -1;
        
        // Get the selected item
        if (this.selectedLeftIndex >= 0) {
            itemText = this.leftItems[this.selectedLeftIndex];
            itemOriginalIndex = this.sortData.items.indexOf(itemText);
            this.leftItems[this.selectedLeftIndex] = null; // Remove from left
        } else if (this.selectedRightIndex >= 0) {
            itemText = this.rightItems[this.selectedRightIndex];
            itemOriginalIndex = this.sortData.items.indexOf(itemText);
            this.rightItems[this.selectedRightIndex] = null; // Remove from right
        }
        
        // Check if placement is correct
        const isCorrect = this.isPlacementCorrect(itemOriginalIndex, this.highlightedSpot);
        
        if (isCorrect) {
            // Play correct sound
            if (typeof soundManager !== 'undefined') {
                console.log('Playing correct sound for item:', itemText, 'at position', this.highlightedSpot + 1);
                soundManager.playCorrect();
            }
            
            // Place the item at the highlighted spot
            this.sortedItems[this.highlightedSpot] = {
                text: itemText,
                originalIndex: itemOriginalIndex
            };
            
            // Rebuild the array to ensure spots between all items
            this.rebuildSortedArray();
            
            console.log('After placement, sortedItems:', this.sortedItems.map(item => item ? item.text : 'null'));
            console.log('Array length:', this.sortedItems.length, 'Max spots:', this.maxSpots);
            
            // Reset selection
            this.selectedLeftIndex = -1;
            this.selectedRightIndex = -1;
            this.highlightedSpot = -1;
            this.currentColumn = 'left';
            this.itemSelected = false;
            
            // Select next available item
            const availableLeftIndices = this.getAvailableLeftIndices();
            const availableRightIndices = this.getAvailableRightIndices();
            
            if (availableLeftIndices.length > 0) {
                this.selectedLeftIndex = availableLeftIndices[0];
                this.currentColumn = 'left';
            } else if (availableRightIndices.length > 0) {
                this.selectedRightIndex = availableRightIndices[0];
                this.currentColumn = 'right';
            }
            
            this.renderGame();
            this.updateSelection();
            
            // Check if game is complete (all left and right items used)
            const remainingItems = this.getAvailableLeftIndices().length + this.getAvailableRightIndices().length;
            if (remainingItems === 0) {
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
                console.log('Playing error sound for wrong placement:', itemText, 'at position', this.highlightedSpot + 1);
                soundManager.playError();
            }
            
            // Wrong placement - end game
            this.gameState = 'finished';
            this.showResults();
        }
    }

    isPlacementCorrect(itemOriginalIndex, spotIndex) {
        // Create a temporary copy to test the placement
        const tempSorted = [...this.sortedItems];
        tempSorted[spotIndex] = { originalIndex: itemOriginalIndex };
        
        // Get all placed items (including the new one) in order
        const placedItems = [];
        for (let i = 0; i < tempSorted.length; i++) {
            if (tempSorted[i] !== null) {
                placedItems.push({
                    position: i,
                    originalIndex: tempSorted[i].originalIndex
                });
            }
        }
        
        // Sort by position and check if original indices are in ascending order
        placedItems.sort((a, b) => a.position - b.position);
        
        for (let i = 1; i < placedItems.length; i++) {
            if (placedItems[i].originalIndex <= placedItems[i-1].originalIndex) {
                return false; // Wrong order
            }
        }
        
        return true;
    }

    rebuildSortedArray() {
        // Get all placed items
        const placedItems = [];
        for (let i = 0; i < this.sortedItems.length; i++) {
            if (this.sortedItems[i] !== null) {
                placedItems.push(this.sortedItems[i]);
            }
        }
        
        // Sort placed items by their original index (correct order)
        placedItems.sort((a, b) => a.originalIndex - b.originalIndex);
        
        // Rebuild array with spots between all items: null, item, null, item, null, etc.
        const newArray = [];
        
        // Always start with a spot
        newArray.push(null);
        
        // Add each placed item followed by a spot
        for (let i = 0; i < placedItems.length; i++) {
            newArray.push(placedItems[i]);
            newArray.push(null); // Spot after each item
        }
        
        // Replace the old array
        this.sortedItems = newArray;
        
        console.log('Rebuilt array:', this.sortedItems.map(item => item ? item.text : 'null'));
    }

    applyCenterGraphScaling() {
        // Apply same scaling logic as result screen but for center graph
        const totalElements = this.centerGraph.children.length;
        
        const labels = this.centerGraph.querySelectorAll('.graph-label');
        const items = this.centerGraph.querySelectorAll('.graph-item');
        const connectors = this.centerGraph.querySelectorAll('.graph-connector');
        
        if (totalElements > 20) {
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
        } else if (totalElements > 15) {
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
    }

    getAvailableLeftIndices() {
        return this.leftItems.map((_, index) => index)
            .filter(index => this.leftItems[index] !== null);
    }

    getAvailableRightIndices() {
        return this.rightItems.map((_, index) => index)
            .filter(index => this.rightItems[index] !== null);
    }

    getAvailableSpots() {
        return this.sortedItems.map((_, index) => index)
            .filter(index => this.sortedItems[index] === null);
    }

    getAvailableSpotsForNavigation() {
        // Get available spots that are actually visible in the current graph
        const availableSpots = this.getAvailableSpots();
        return availableSpots;
    }

    updateSelection() {
        // Clear all selections and highlights
        document.querySelectorAll('.sort-item').forEach(item => {
            item.classList.remove('selected', 'highlight-spot');
        });
        
        // Clear spot indicator highlights (none needed anymore)
        
        // Highlight current selection
        if (this.currentColumn === 'left' && this.selectedLeftIndex >= 0) {
            const leftItems = this.leftColumn.children;
            const availableIndices = this.getAvailableLeftIndices();
            const displayIndex = availableIndices.indexOf(this.selectedLeftIndex);
            if (displayIndex >= 0 && leftItems[displayIndex]) {
                leftItems[displayIndex].classList.add('selected');
            }
        } else if (this.currentColumn === 'right' && this.selectedRightIndex >= 0) {
            const rightItems = this.rightColumn.children;
            const availableIndices = this.getAvailableRightIndices();
            const displayIndex = availableIndices.indexOf(this.selectedRightIndex);
            if (displayIndex >= 0 && rightItems[displayIndex]) {
                rightItems[displayIndex].classList.add('selected');
            }
        } else if (this.currentColumn === 'center' && this.highlightedSpot >= 0) {
            // Center navigation - highlighting is handled by preview item
            // No visual highlighting needed for invisible spot indicators
        }
    }

    showResults() {
        // Hide game view and show result view
        this.gameView.style.display = 'none';
        this.resultView.style.display = 'flex';
        this.gameState = 'result';
        
        this.renderResultGraph();
    }

    renderResultGraph() {
        this.resultGraph.innerHTML = '';
        
        // Add upper label
        const upperLabel = document.createElement('div');
        upperLabel.className = 'graph-label';
        upperLabel.textContent = this.sortData.upperLabel;
        this.resultGraph.appendChild(upperLabel);
        
        // Add all items in correct order using the same method as center graph
        this.sortData.items.forEach((item, index) => {
            this.addPlacedItemToResult({ text: item, originalIndex: index });
        });
        
        // Add connector before lower label
        const lowerConnector = document.createElement('div');
        lowerConnector.className = 'graph-connector lower-label';
        this.resultGraph.appendChild(lowerConnector);
        
        // Add lower label
        const lowerLabel = document.createElement('div');
        lowerLabel.className = 'graph-label';
        lowerLabel.textContent = this.sortData.lowerLabel;
        this.resultGraph.appendChild(lowerLabel);
        
        // Apply dynamic scaling based on number of items
        this.applyResultGraphScaling();
    }

    applyResultGraphScaling() {
        const totalElements = this.resultGraph.children.length;
        
        // Adjust font sizes and heights for many items - better scaling for larger base sizes
        const labels = this.resultGraph.querySelectorAll('.graph-label');
        const items = this.resultGraph.querySelectorAll('.graph-item');
        const connectors = this.resultGraph.querySelectorAll('.graph-connector');
        
        if (totalElements > 20) {
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
        } else if (totalElements > 15) {
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

// Initialize sort controller when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SortController();
});
