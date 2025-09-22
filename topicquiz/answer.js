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
        // Mark the current topic as played
        const currentTopic = localStorage.getItem('currentTopic');
        if (currentTopic) {
            this.markTopicAsPlayed(currentTopic);
        }
        
        // Clear stored data and return to topic selection
        localStorage.removeItem('currentAnswer');
        localStorage.removeItem('currentQuestion');
        localStorage.removeItem('currentTopic');
        window.location.href = 'topic.html';
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
}

// Initialize answer controller when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AnswerController();
});
