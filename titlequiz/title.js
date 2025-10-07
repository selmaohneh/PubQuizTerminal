/**
 * Title Quiz Controller
 * Displays a title with subtitle in topicquiz question style
 * Returns to main menu on Enter key press
 */

class TitleController {
    constructor() {
        this.titleData = null;
        this.initializeElements();
        this.bindEvents();
        this.loadTitleData();
    }

    initializeElements() {
        this.subtitleText = document.getElementById('subtitleText');
        this.titleText = document.getElementById('titleText');
    }

    bindEvents() {
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                this.returnToMainMenu();
            }
        });
    }

    loadTitleData() {
        try {
            const fs = require('fs');
            const path = require('path');
            const tempFilePath = path.join(__dirname, '..', 'temp-quiz-data.json');

            if (fs.existsSync(tempFilePath)) {
                const rawData = fs.readFileSync(tempFilePath, 'utf8');
                this.titleData = JSON.parse(rawData);
                this.displayTitle();
            } else {
                console.error('No title data found at:', tempFilePath);
                this.showError('No title data found');
            }
        } catch (error) {
            console.error('Error loading title data:', error);
            this.showError('Error loading title data: ' + error.message);
        }
    }

    displayTitle() {
        if (!this.titleData || !this.titleData.title || !this.titleData.subtitle) {
            this.showError('Invalid title data - missing title or subtitle');
            return;
        }

        this.subtitleText.textContent = this.titleData.subtitle;
        this.titleText.textContent = this.titleData.title;
    }

    showError(message) {
        this.titleText.innerHTML = `<div style="color: red; font-size: 3vh; text-align: center;">${message}</div>`;
    }

    returnToMainMenu() {
        // Send IPC message to return to main menu
        if (typeof require !== 'undefined') {
            const { ipcRenderer } = require('electron');
            ipcRenderer.send('show-main-page');
        } else {
            // Fallback for development
            window.location.href = '../index.html';
        }
    }
}

// Initialize the title quiz when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new TitleController();
});
