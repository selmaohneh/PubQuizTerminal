export class ErrorHandler {
  static showError(message, containerElement = null) {
    console.error(message);

    if (containerElement) {
      containerElement.innerHTML = `
        <div style="color: #ff4444; font-size: 2vh; text-align: center; padding: 2vh;">
          ${message}
        </div>
      `;
    }
  }

  static logError(error, context = '') {
    const errorMessage = context
      ? `[${context}] ${error.message || error}`
      : error.message || error;

    console.error(errorMessage, error);
  }

  static handleQuizLoadError(error, containerElement = null) {
    const message = 'Error loading quiz data. Please load a valid quiz file.';
    this.showError(message, containerElement);
    this.logError(error, 'Quiz Load');
  }

  static handleFileNotFoundError(fileName, containerElement = null) {
    const message = `File not found: ${fileName}. Please load a quiz file first.`;
    this.showError(message, containerElement);
  }
}
