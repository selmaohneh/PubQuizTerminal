import { STORAGE_KEYS, SESSION_KEYS, TEMP_FILES } from './constants.js';
import { getElectronModules } from './utils.js';

export class StorageService {
  static getQuizData() {
    const data = localStorage.getItem(STORAGE_KEYS.QUIZ_DATA);
    return data ? JSON.parse(data) : null;
  }

  static setQuizData(data) {
    if (!data) {
      localStorage.removeItem(STORAGE_KEYS.QUIZ_DATA);
      return;
    }
    localStorage.setItem(STORAGE_KEYS.QUIZ_DATA, JSON.stringify(data));
  }

  static getPlayedTopics() {
    const topics = localStorage.getItem(STORAGE_KEYS.PLAYED_TOPICS);
    return topics ? JSON.parse(topics) : [];
  }

  static setPlayedTopics(topics) {
    localStorage.setItem(STORAGE_KEYS.PLAYED_TOPICS, JSON.stringify(topics));
  }

  static addPlayedTopic(topicId) {
    const played = this.getPlayedTopics();
    if (!played.includes(topicId)) {
      played.push(topicId);
      this.setPlayedTopics(played);
    }
  }

  static clearPlayedTopics() {
    localStorage.removeItem(STORAGE_KEYS.PLAYED_TOPICS);
  }

  static getQuizDataHash() {
    return localStorage.getItem(STORAGE_KEYS.QUIZ_DATA_HASH);
  }

  static setQuizDataHash(hash) {
    localStorage.setItem(STORAGE_KEYS.QUIZ_DATA_HASH, hash);
  }

  static isQuizSessionActive() {
    return sessionStorage.getItem(SESSION_KEYS.QUIZ_SESSION_ACTIVE) === 'true';
  }

  static setQuizSessionActive(active) {
    if (active) {
      sessionStorage.setItem(SESSION_KEYS.QUIZ_SESSION_ACTIVE, 'true');
    } else {
      sessionStorage.removeItem(SESSION_KEYS.QUIZ_SESSION_ACTIVE);
    }
  }

  static clearQuizSession() {
    localStorage.removeItem(STORAGE_KEYS.SELECTED_TOPIC);
    localStorage.removeItem(STORAGE_KEYS.SELECTED_TOPIC_NAME);
    localStorage.removeItem(STORAGE_KEYS.QUESTION_INDEX);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_ANSWER);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_QUESTION);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_TOPIC);
    localStorage.removeItem(STORAGE_KEYS.CORRECT_ANSWER_INDEX);
    localStorage.removeItem(STORAGE_KEYS.ANSWER_OPTIONS);
  }

  static clearAllQuizData() {
    this.clearQuizSession();
    this.setQuizData(null);
    this.clearPlayedTopics();
    localStorage.removeItem(STORAGE_KEYS.QUIZ_DATA_HASH);
    this.setQuizSessionActive(false);
  }

  static loadQuizDataFromFile() {
    const { fs, path } = getElectronModules();
    if (!fs || !path) {
      return null;
    }

    try {
      const tempFilePath = path.join(__dirname, '..', TEMP_FILES.QUIZ_DATA);
      if (fs.existsSync(tempFilePath)) {
        const rawData = fs.readFileSync(tempFilePath, 'utf8');
        return JSON.parse(rawData);
      }
    } catch (error) {
      console.error('Error loading quiz data from file:', error);
    }
    return null;
  }

  static getOriginalFilePath() {
    const { fs, path } = getElectronModules();
    if (!fs || !path) {
      return null;
    }

    try {
      const originalPathFile = path.join(__dirname, '..', TEMP_FILES.ORIGINAL_PATH);
      if (fs.existsSync(originalPathFile)) {
        return fs.readFileSync(originalPathFile, 'utf8').trim();
      }
    } catch (error) {
      console.error('Error loading original file path:', error);
    }
    return null;
  }
}
