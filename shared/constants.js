export const STORAGE_KEYS = {
  QUIZ_DATA: 'currentQuizData',
  PLAYED_TOPICS: 'playedTopics',
  SELECTED_TOPIC: 'selectedTopic',
  SELECTED_TOPIC_NAME: 'selectedTopicName',
  QUESTION_INDEX: 'questionIndex',
  CURRENT_ANSWER: 'currentAnswer',
  CURRENT_QUESTION: 'currentQuestion',
  CURRENT_TOPIC: 'currentTopic',
  QUIZ_DATA_HASH: 'quizDataHash',
  CORRECT_ANSWER_INDEX: 'correctAnswerIndex',
  ANSWER_OPTIONS: 'answerOptions'
};

export const SESSION_KEYS = {
  QUIZ_SESSION_ACTIVE: 'quizSessionActive'
};

export const TEMP_FILES = {
  QUIZ_DATA: 'temp-quiz-data.json',
  ORIGINAL_PATH: 'temp-original-path.txt'
};

export const QUIZ_TYPES = {
  TOPIC: {
    extension: '.topicquiz',
    path: 'topicquiz/topic.html',
    name: 'Topic Quiz'
  },
  PAIR: {
    extension: '.pairquiz',
    path: 'pairquiz/pair.html',
    name: 'Pair Quiz'
  },
  SORT: {
    extension: '.sortquiz',
    path: 'sortquiz/sort.html',
    name: 'Sort Quiz'
  },
  IMAGE: {
    extension: '.imagequiz',
    path: 'imagequiz/image.html',
    name: 'Image Quiz'
  }
};

export const SOUNDS = {
  DING: 'ding',
  CORRECT: 'correct',
  BUZZER: 'buzzer',
  ERROR: 'error',
  COMPLETED: 'completed'
};

export const IPC_CHANNELS = {
  SHOW_MAIN_PAGE: 'show-main-page',
  SHOW_QUIZ_PAGE: 'show-quiz-page',
  LOAD_QUIZ_PAGE: 'load-quiz-page',
  LOAD_QUIZ_DATA: 'load-quiz-data',
  NAVIGATE_TO_MAIN: 'navigate-to-main',
  QUIZ_COMPLETED: 'quiz-completed'
};

export const TOPIC_QUIZ = {
  GRID_SIZE: 16,
  GRID_COLUMNS: 4,
  GRID_ROWS: 4
};

export const PAIR_QUIZ = {
  MIN_PAIRS: 1,
  MAX_PAIRS: 10,
  MAX_EXTRA_ITEMS: 1,
  MAX_TOTAL_ITEMS: 11
};

export const SORT_QUIZ = {
  MIN_ITEMS: 2,
  MAX_ITEMS: 11
};

export const KEYS = {
  ENTER: 'Enter',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  DIGIT_1: '1',
  DIGIT_2: '2',
  DIGIT_3: '3',
  DIGIT_4: '4'
};
