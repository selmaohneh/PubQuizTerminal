/**
 * Topic Quiz Navigation
 * Handles 4x4 grid navigation with arrow keys
 * Yellow highlighting for selected cards
 */

class TopicQuizController {
    constructor() {
        this.initializeElements();
        this.bindEvents();
        this.currentSelectedIndex = 0;
        this.selectTopicByIndex(0); // Start with first topic selected
    }

    initializeElements() {
        this.topicCards = document.querySelectorAll('.topic-card');
    }

    bindEvents() {
        // Handle keyboard navigation only (no mouse interactions)
        document.addEventListener('keydown', (event) => {
            this.handleKeyNavigation(event);
        });
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
            case ' ':
                event.preventDefault();
                this.selectCurrentTopic();
                break;
        }
    }

    navigateUp() {
        // Move up one row (4 positions back)
        if (this.currentSelectedIndex >= 4) {
            this.selectTopicByIndex(this.currentSelectedIndex - 4);
        }
    }

    navigateDown() {
        // Move down one row (4 positions forward)
        if (this.currentSelectedIndex < 12) {
            this.selectTopicByIndex(this.currentSelectedIndex + 4);
        }
    }

    navigateLeft() {
        // Move left within the same row
        if (this.currentSelectedIndex % 4 !== 0) {
            this.selectTopicByIndex(this.currentSelectedIndex - 1);
        }
    }

    navigateRight() {
        // Move right within the same row
        if (this.currentSelectedIndex % 4 !== 3) {
            this.selectTopicByIndex(this.currentSelectedIndex + 1);
        }
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
        if (currentCard) {
            const topicId = currentCard.getAttribute('data-topic');
            const topicTitle = currentCard.querySelector('.topic-title').textContent;
            console.log('Selected topic:', topicId, '-', topicTitle);
            
            // TODO: In the future, this could navigate to questions for this topic
            // For now, just log the selection
        }
    }
}

// Initialize topic quiz controller when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TopicQuizController();
});
