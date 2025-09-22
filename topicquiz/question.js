/**
 * Question View Logic
 * Handles question display and navigation
 */

class QuestionController {
    constructor() {
        this.initializeElements();
        this.bindEvents();
        this.loadQuestion();
    }

    initializeElements() {
        this.questionText = document.getElementById('question-text');
        this.topicName = document.getElementById('topic-name');
        this.questionNumber = document.getElementById('question-number');
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
                this.showAnswer();
                break;
        }
    }

    loadQuestion() {
        // Get topic and question data from URL parameters or localStorage
        const urlParams = new URLSearchParams(window.location.search);
        const topicId = urlParams.get('topic') || localStorage.getItem('selectedTopic');

        // Get quiz data from localStorage
        const quizData = JSON.parse(localStorage.getItem('currentQuizData') || 'null');
        
        if (!quizData) {
            this.questionText.textContent = "No quiz data available. Please load a quiz file.";
            this.topicName.textContent = "Error";
            return;
        }

        // Convert topicId to array index (topicId is 1-based, array is 0-based)
        const topicIndex = parseInt(topicId) - 1;
        
        if (topicIndex < 0 || topicIndex >= quizData.length) {
            this.questionText.textContent = "Invalid topic selected.";
            this.topicName.textContent = "Error";
            return;
        }

        const topic = quizData[topicIndex];

        this.questionText.textContent = topic.question;
        this.topicName.textContent = topic.name;
        
        // Store the answer for the answer view
        localStorage.setItem('currentAnswer', topic.answer);
        localStorage.setItem('currentQuestion', topic.question);
        localStorage.setItem('currentTopic', topic.name);
        
        // Play ding sound when question is displayed
        if (typeof soundManager !== 'undefined') {
            soundManager.playDing();
        }
    }


    showAnswer() {
        // Navigate to answer view
        window.location.href = 'answer.html';
    }
}

// Initialize question controller when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new QuestionController();
});
