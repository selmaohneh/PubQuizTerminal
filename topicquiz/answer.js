/**
 * Answer View Logic
 * Displays the question and answer, navigates back to topics on Enter
 */

class AnswerController {
    constructor() {
        this.initializeElements();
        this.bindEvents();
        this.loadAnswer();
    }

    initializeElements() {
        this.questionText = document.getElementById('question-text');
        this.topicName = document.getElementById('topic-name');
        this.answerText = document.getElementById('answer-text');
    }

    bindEvents() {
        // Handle keyboard navigation
        document.addEventListener('keydown', (event) => {
            this.handleKeyNavigation(event);
        });
        
        // Listen for new quiz file loading
        if (typeof require !== 'undefined') {
            const { ipcRenderer } = require('electron');
            ipcRenderer.on('show-quiz-page', () => {
                console.log('New quiz file loaded - navigating to topic page');
                window.location.href = 'topic.html';
            });
        }
    }

    handleKeyNavigation(event) {
        switch(event.key) {
            case 'Enter':
                event.preventDefault();
                this.goBackToTopics();
                break;
        }
    }

    loadAnswer() {
        // Get question and answer data from localStorage
        const question = localStorage.getItem('currentQuestion');
        const answer = localStorage.getItem('currentAnswer');
        const topic = localStorage.getItem('currentTopic');

        if (question && answer && topic) {
            this.questionText.textContent = question;
            this.answerText.textContent = answer;
            this.topicName.textContent = topic;
            
            // Play correct sound when the answer is revealed
            if (typeof soundManager !== 'undefined') {
                soundManager.playCorrect();
            }
        } else {
            // Fallback if no data is available
            this.questionText.textContent = "No question data available.";
            this.answerText.textContent = "No answer available.";
            this.topicName.textContent = "Unknown Topic";
            
            // Play error sound for missing data
            if (typeof soundManager !== 'undefined') {
                soundManager.playError();
            }
        }
    }
    

    goBackToTopics() {
        // Mark the current topic as played
        const currentTopic = localStorage.getItem('currentTopic');
        if (currentTopic) {
            this.markTopicAsPlayed(currentTopic);
        }
        
        // Check if all topics have been played
        if (this.areAllTopicsPlayed()) {
            // All topics played - return to home screen
            this.returnToHomeScreen();
        } else {
            // Clear stored data and return to topic selection
            localStorage.removeItem('currentAnswer');
            localStorage.removeItem('currentQuestion');
            localStorage.removeItem('currentTopic');
            window.location.href = 'topic.html';
        }
    }

    markTopicAsPlayed(topicName) {
        // Get quiz data to find the topic index
        const quizData = JSON.parse(localStorage.getItem('currentQuizData') || 'null');
        
        if (!quizData) {
            console.error('No quiz data available to mark topic as played');
            return;
        }
        
        // Find the topic by name and get its index
        const topicIndex = quizData.findIndex(t => t.name === topicName);
        
        if (topicIndex !== -1) {
            // Convert index to 1-based ID for consistency
            const topicId = (topicIndex + 1).toString();
            
            // Get current played topics
            const playedTopics = JSON.parse(localStorage.getItem('playedTopics') || '[]');
            
            // Add this topic if not already played
            if (!playedTopics.includes(topicId)) {
                playedTopics.push(topicId);
                localStorage.setItem('playedTopics', JSON.stringify(playedTopics));
            }
        } else {
            console.error('Topic not found in quiz data:', topicName);
        }
    }

    areAllTopicsPlayed() {
        // Get quiz data to check total number of topics
        const quizData = JSON.parse(localStorage.getItem('currentQuizData') || 'null');
        
        if (!quizData) {
            console.error('No quiz data available to check if all topics are played');
            return false;
        }
        
        // Get played topics
        const playedTopics = JSON.parse(localStorage.getItem('playedTopics') || '[]');
        
        // Check if all topics have been played
        return playedTopics.length >= quizData.length;
    }

    returnToHomeScreen() {
        // Clear all quiz-related data
        localStorage.removeItem('currentAnswer');
        localStorage.removeItem('currentQuestion');
        localStorage.removeItem('currentTopic');
        localStorage.removeItem('currentQuizData');
        localStorage.removeItem('playedTopics');
        localStorage.removeItem('quizDataHash');
        sessionStorage.removeItem('quizSessionActive');
        
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

// Initialize answer controller when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AnswerController();
});
