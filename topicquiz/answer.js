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
        } else {
            // Fallback if no data is available
            this.questionText.textContent = "No question data available.";
            this.answerText.textContent = "No answer available.";
            this.topicName.textContent = "Unknown Topic";
        }
    }

    goBackToTopics() {
        // Clear stored data and return to topic selection
        localStorage.removeItem('currentAnswer');
        localStorage.removeItem('currentQuestion');
        localStorage.removeItem('currentTopic');
        window.location.href = 'topic.html';
    }
}

// Initialize answer controller when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AnswerController();
});
