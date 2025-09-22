/**
 * Topic Selection Navigation
 * Handles 4x4 grid navigation with arrow keys
 * Yellow highlighting for selected cards
 * Topics disable after being played during session
 */

class TopicController {
    constructor() {
        this.quizData = null;
        this.initializeElements();
        this.bindEvents();
        this.initializeQuiz();
    }

    initializeElements() {
        this.topicCards = document.querySelectorAll('.topic-card');
    }

    initializeQuiz() {
        // Clear temporary quiz data
        this.clearQuizData();
        
        // Check if this is a fresh app start (no session marker)
        if (!sessionStorage.getItem('quizSessionActive')) {
            // Fresh app start - clear played topics
            localStorage.removeItem('playedTopics');
            sessionStorage.setItem('quizSessionActive', 'true');
        }
        
        // Try to load quiz data from temporary file
        this.loadQuizDataFromFile();
        
        // Load any topics that were played in this session
        this.loadPlayedTopics();
        
        // Select first available topic
        this.currentSelectedIndex = 0;
        this.selectFirstAvailableTopic();
    }

    clearQuizData() {
        // Clear quiz-related data but preserve session state
        localStorage.removeItem('selectedTopic');
        localStorage.removeItem('selectedTopicName');
        localStorage.removeItem('questionIndex');
        localStorage.removeItem('currentAnswer');
        localStorage.removeItem('currentQuestion');
        localStorage.removeItem('currentTopic');
    }

    loadPlayedTopics() {
        // Load list of played topics from this session
        const playedTopics = JSON.parse(localStorage.getItem('playedTopics') || '[]');
        
        // Mark played topics as disabled
        playedTopics.forEach(topicId => {
            const card = document.querySelector(`[data-topic="${topicId}"]`);
            if (card) {
                card.classList.add('disabled');
            }
        });
    }

    selectFirstAvailableTopic() {
        // Find the first available (non-disabled) topic
        for (let i = 0; i < this.topicCards.length; i++) {
            if (!this.topicCards[i].classList.contains('disabled')) {
                this.currentSelectedIndex = i;
                this.selectTopicByIndex(i);
                return;
            }
        }
        // If all topics are disabled, select first one anyway
        this.selectTopicByIndex(0);
    }

    loadQuizData(quizData) {
        this.quizData = quizData;
        // Store quiz data in localStorage for other views to access
        localStorage.setItem('currentQuizData', JSON.stringify(quizData));
        
        // Update topic names on the cards
        this.updateTopicNames();
        
        console.log('Quiz data loaded:', quizData.length, 'topics');
    }

    loadQuizDataFromFile() {
        // Try to load quiz data from temporary file
        if (typeof require !== 'undefined') {
            try {
                const fs = require('fs');
                const path = require('path');
                const tempFilePath = path.join(__dirname, '..', 'temp-quiz-data.json');
                
                if (fs.existsSync(tempFilePath)) {
                    const quizData = JSON.parse(fs.readFileSync(tempFilePath, 'utf8'));
                    console.log('Loaded quiz data from temp file:', quizData.length, 'topics');
                    this.loadQuizData(quizData);
                }
            } catch (error) {
                console.error('Error loading quiz data from temp file:', error);
            }
        }
    }

    updateTopicNames() {
        if (!this.quizData) return;
        
        // Update each topic card with the name from quiz data
        this.quizData.forEach((topic, index) => {
            const card = this.topicCards[index];
            if (card) {
                const titleElement = card.querySelector('.topic-title');
                if (titleElement) {
                    titleElement.textContent = topic.name;
                }
                // Update data-topic attribute to use index as ID
                card.setAttribute('data-topic', (index + 1).toString());
            }
        });
    }

    bindEvents() {
        // Handle keyboard navigation only (no mouse interactions)
        document.addEventListener('keydown', (event) => {
            this.handleKeyNavigation(event);
        });

        // Listen for quiz data from main process
        if (typeof require !== 'undefined') {
            const { ipcRenderer } = require('electron');
            ipcRenderer.on('load-quiz-data', (event, quizData) => {
                console.log('Received quiz data via IPC:', quizData);
                this.loadQuizData(quizData);
            });
        }
    }

    handleKeyNavigation(event) {
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
                this.selectCurrentTopic();
                break;
        }
    }

    navigateUp() {
        // Move up one row (4 positions back), jumping over disabled topics
        let targetIndex = this.currentSelectedIndex;
        while (targetIndex >= 4) {
            targetIndex -= 4;
            if (!this.topicCards[targetIndex].classList.contains('disabled')) {
                this.selectTopicByIndex(targetIndex);
                return;
            }
        }
        // If no available topic found in direction, stay put
    }

    navigateDown() {
        // Move down one row (4 positions forward), jumping over disabled topics
        let targetIndex = this.currentSelectedIndex;
        while (targetIndex < 12) {
            targetIndex += 4;
            if (!this.topicCards[targetIndex].classList.contains('disabled')) {
                this.selectTopicByIndex(targetIndex);
                return;
            }
        }
        // If no available topic found in direction, stay put
    }

    navigateLeft() {
        // Move left within the same row, jumping over disabled topics
        let targetIndex = this.currentSelectedIndex;
        while (targetIndex % 4 !== 0) {
            targetIndex -= 1;
            if (!this.topicCards[targetIndex].classList.contains('disabled')) {
                this.selectTopicByIndex(targetIndex);
                return;
            }
        }
        // If no available topic found in direction, stay put
    }

    navigateRight() {
        // Move right within the same row, jumping over disabled topics
        let targetIndex = this.currentSelectedIndex;
        while (targetIndex % 4 !== 3) {
            targetIndex += 1;
            if (!this.topicCards[targetIndex].classList.contains('disabled')) {
                this.selectTopicByIndex(targetIndex);
                return;
            }
        }
        // If no available topic found in direction, stay put
    }


    selectTopicByIndex(index) {
        // Remove selected class from all cards
        this.topicCards.forEach(card => {
            card.classList.remove('selected');
        });

        // Add selected class to current card
        if (this.topicCards[index]) {
            this.topicCards[index].classList.add('selected');
            this.currentSelectedIndex = index;
        }
    }

    selectCurrentTopic() {
        const currentCard = this.topicCards[this.currentSelectedIndex];
        if (currentCard && !currentCard.classList.contains('disabled')) {
            const topicId = currentCard.getAttribute('data-topic');
            const topicTitle = currentCard.querySelector('.topic-title').textContent;
            console.log('Selected topic:', topicId, '-', topicTitle);
            
            // Navigate to question view for this topic
            this.navigateToQuestion(topicId, topicTitle);
        }
    }

    navigateToQuestion(topicId, topicTitle) {
        // Store topic info for the question view
        localStorage.setItem('selectedTopic', topicId);
        localStorage.setItem('selectedTopicName', topicTitle);
        localStorage.setItem('questionIndex', '0');
        
        // Navigate to question view
        window.location.href = `question.html?topic=${topicId}&q=0`;
    }

}

// Initialize topic controller when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TopicController();
});
