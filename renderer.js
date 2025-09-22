/**
 * Main Page Logic
 * Handles navigation and main page functionality
 */

class MainController {
    constructor() {
        this.initializeIPC();
    }

    initializeIPC() {
        const { ipcRenderer } = require('electron');
        
        // Listen for IPC messages from main process
        ipcRenderer.on('show-quiz-page', () => {
            this.navigateToQuiz();
        });
    }

    navigateToQuiz() {
        // Send message to main process to load quiz page
        const { ipcRenderer } = require('electron');
        ipcRenderer.send('load-quiz-page');
    }
}

// Initialize main controller when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('PubQuizTerminal Main Page Loaded');
    new MainController();
});
