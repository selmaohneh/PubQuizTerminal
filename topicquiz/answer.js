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
        // Get the topic ID from the topic name
        const topicMap = {
            'Geography': '1',
            'History': '2',
            'Science': '3',
            'Sports': '4',
            'Movies': '5',
            'Music': '6',
            'Literature': '7',
            'Art': '8',
            'Technology': '9',
            'Food & Drink': '10',
            'Nature': '11',
            'Politics': '12',
            'Fashion': '13',
            'Travel': '14',
            'Games': '15',
            'Miscellaneous': '16'
        };
        
        const topicId = topicMap[topicName];
        if (topicId) {
            // Get current played topics
            const playedTopics = JSON.parse(localStorage.getItem('playedTopics') || '[]');
            
            // Add this topic if not already played
            if (!playedTopics.includes(topicId)) {
                playedTopics.push(topicId);
                localStorage.setItem('playedTopics', JSON.stringify(playedTopics));
            }
        }
    }
}

// Initialize answer controller when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AnswerController();
});
