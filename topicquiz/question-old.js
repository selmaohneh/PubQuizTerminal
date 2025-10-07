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
        this.answerCards = document.getElementById('answer-cards');
        this.answerCardElements = document.querySelectorAll('.answer-card');
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
            case '1':
            case '2':
            case '3':
            case '4':
                event.preventDefault();
                this.selectAnswer(parseInt(event.key));
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
        
        // Handle multiple choice answers
        this.setupMultipleChoice(topic);
        
        // Play ding sound when question is displayed
        if (typeof soundManager !== 'undefined') {
            soundManager.playDing();
        }
    }


    setupMultipleChoice(topic) {
        const falseAnswers = topic.falseAnswers || [];
        const totalAnswers = 1 + falseAnswers.length; // 1 correct + false answers
        
        // If no false answers, hide answer cards and work as before
        if (falseAnswers.length === 0) {
            this.answerCards.style.display = 'none';
            return;
        }
        
        // Show answer cards
        this.answerCards.style.display = 'grid';
        
        // Create array with correct answer and false answers
        const allAnswers = [topic.answer, ...falseAnswers];
        
        // Randomize the order
        this.shuffleArray(allAnswers);
        
        // Store the correct answer position for later use
        this.correctAnswerIndex = allAnswers.indexOf(topic.answer) + 1;
        
        // Update answer cards with the randomized answers
        this.answerCardElements.forEach((card, index) => {
            if (index < allAnswers.length) {
                const answerText = card.querySelector('.answer-text');
                answerText.textContent = allAnswers[index];
                card.style.display = 'flex';
            } else {
                card.style.display = 'none';
            }
        });
        
        // Store the correct answer position for the answer view
        localStorage.setItem('correctAnswerIndex', this.correctAnswerIndex.toString());
        
        // Store all answer options for the answer view
        localStorage.setItem('answerOptions', JSON.stringify(allAnswers));
    }
    
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
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
