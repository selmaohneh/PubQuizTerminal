/**
 * Image Quiz Game Logic
 * Displays images sequentially and shows answers
 * Simple navigation with Enter key
 */

class ImageController {
    constructor() {
        this.imageData = [];
        this.currentIndex = 0;
        this.showingAnswer = false;
        this.quizComplete = false;
        
        // Check if sound manager is available
        if (typeof soundManager !== 'undefined') {
            console.log('Sound manager is available for image quiz');
        } else {
            console.warn('Sound manager not found - sounds will not play');
        }
        
        this.initializeElements();
        this.bindEvents();
        this.loadImageData();
    }

    initializeElements() {
        this.imageDisplay = document.getElementById('imageDisplay');
        this.answerDisplay = document.getElementById('answerDisplay');
    }

    bindEvents() {
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                this.handleEnter();
            }
        });
    }

    loadImageData() {
        try {
            const fs = require('fs');
            const path = require('path');
            const tempFilePath = path.join(__dirname, '..', 'temp-quiz-data.json');
            const originalPathFile = path.join(__dirname, '..', 'temp-original-path.txt');
            
            if (fs.existsSync(tempFilePath)) {
                const rawData = fs.readFileSync(tempFilePath, 'utf8');
                this.imageData = JSON.parse(rawData);
                
                // Try to read original file path
                if (fs.existsSync(originalPathFile)) {
                    this.originalFilePath = fs.readFileSync(originalPathFile, 'utf8').trim();
                }
                
                this.startQuiz();
            } else {
                console.error('No quiz data found at:', tempFilePath);
                this.showError('No quiz data found');
            }
        } catch (error) {
            console.error('Error loading image data:', error);
            this.showError('Error loading quiz data: ' + error.message);
        }
    }

    startQuiz() {
        if (this.imageData.length === 0) {
            this.showError('No images found in quiz data');
            return;
        }

        this.currentIndex = 0;
        this.showingAnswer = false;
        this.quizComplete = false;
        this.showCurrentImage();
    }

    showCurrentImage() {
        if (this.currentIndex >= this.imageData.length) {
            this.quizComplete = true;
            this.currentIndex = 0;
            this.showingAnswer = true;
            this.showImageWithAnswer();
            return;
        }

        const currentItem = this.imageData[this.currentIndex];
        const imagePath = this.getImagePath(currentItem.image);
        
        this.imageDisplay.innerHTML = `<img src="${imagePath}" alt="Quiz Image">`;
        this.answerDisplay.style.display = 'none';
        
        // Play ding sound for new image
        if (typeof soundManager !== 'undefined') {
            soundManager.playDing();
        }
    }

    showImageWithAnswer() {
        const currentItem = this.imageData[this.currentIndex];
        const imagePath = this.getImagePath(currentItem.image);
        
        this.imageDisplay.innerHTML = `<img src="${imagePath}" alt="Quiz Image">`;
        this.answerDisplay.textContent = currentItem.answer;
        this.answerDisplay.style.display = 'flex';
        
        // Play correct sound for showing answer
        if (typeof soundManager !== 'undefined') {
            soundManager.playCorrect();
        }
    }

    getImagePath(imageFileName) {
        // Get the directory of the original .imagequiz file
        const path = require('path');
        
        try {
            if (this.originalFilePath) {
                const quizDir = path.dirname(this.originalFilePath);
                return path.join(quizDir, imageFileName);
            } else {
                // Fallback to relative path
                return path.join(__dirname, '..', 'imagequiz', imageFileName);
            }
        } catch (error) {
            console.error('Error getting image path:', error);
            return imageFileName; // Fallback to just the filename
        }
    }

    handleEnter() {
        if (this.quizComplete) {
            // We're in the results phase - showing images with answers
            this.currentIndex++;
            if (this.currentIndex >= this.imageData.length) {
                // All results shown, return to main menu
                this.returnToMainMenu();
                return;
            }
            this.showImageWithAnswer();
        } else {
            // We're in the question phase - showing images without answers
            this.currentIndex++;
            if (this.currentIndex >= this.imageData.length) {
                // All images shown, start results phase
                this.quizComplete = true;
                this.currentIndex = 0;
                this.showImageWithAnswer();
            } else {
                this.showCurrentImage();
            }
        }
    }

    returnToMainMenu() {
        // Send IPC message to return to main menu
        if (typeof require !== 'undefined') {
            const { ipcRenderer } = require('electron');
            ipcRenderer.send('navigate-to-main');
        } else {
            // Fallback for development
            window.location.href = '../index.html';
        }
    }

    showError(message) {
        this.imageDisplay.innerHTML = `<div style="color: red; font-size: 2vh; text-align: center;">${message}</div>`;
        this.answerDisplay.style.display = 'none';
    }
}

// Initialize the image quiz when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new ImageController();
});
