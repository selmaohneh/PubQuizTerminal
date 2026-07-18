// Browser port of the quiz validation rules from menu.js (the Electron menu
// controller) — keep the two in sync. Exposed as window.QuizValidation.
(function () {
  const QUIZ_TYPES = {
    '.topicquiz': 'Topic Quiz',
    '.pairquiz': 'Pair Quiz',
    '.sortquiz': 'Sort Quiz',
    '.imagequiz': 'Image Quiz',
    '.imagemutationquiz': 'Image Mutation Quiz',
    '.title': 'Title'
  };

  function getExtension(fileName) {
    const idx = fileName.lastIndexOf('.');
    return idx === -1 ? '' : fileName.slice(idx).toLowerCase();
  }

  function isKnownQuizExtension(fileName) {
    return Object.prototype.hasOwnProperty.call(QUIZ_TYPES, getExtension(fileName));
  }

  function validateTopicQuiz(data) {
    if (!Array.isArray(data) || data.length !== 16) {
      return { isValid: false, errors: ['Topic quiz must have exactly 16 topics'] };
    }
    for (const topic of data) {
      if (!topic.name || !topic.question || !topic.answer) {
        return { isValid: false, errors: ['Each topic must have name, question, and answer'] };
      }
    }
    return { isValid: true };
  }

  function validatePairQuiz(data) {
    if (!Array.isArray(data) || data.length < 1 || data.length > 11) {
      return { isValid: false, errors: ['Pair quiz must have 1-11 items'] };
    }
    let validPairs = 0;
    let extraItems = 0;
    for (const item of data) {
      if (!Object.prototype.hasOwnProperty.call(item, 'left') ||
          !Object.prototype.hasOwnProperty.call(item, 'right')) {
        return { isValid: false, errors: ['Each item must have left and right properties'] };
      }
      if (item.left && item.right) {
        validPairs++;
      } else if (!item.left && item.right) {
        extraItems++;
      } else {
        return { isValid: false, errors: ['Invalid item structure'] };
      }
    }
    if (validPairs < 1 || validPairs > 10 || extraItems > 1) {
      return { isValid: false, errors: ['Must have 1-10 valid pairs and max 1 extra item'] };
    }
    return { isValid: true };
  }

  function validateSortQuiz(data) {
    if (!data || !data.upperLabel || !data.lowerLabel || !Array.isArray(data.items)) {
      return { isValid: false, errors: ['Sort quiz must have upperLabel, lowerLabel, and items'] };
    }
    if (typeof data.upperLabel !== 'string' || typeof data.lowerLabel !== 'string') {
      return { isValid: false, errors: ['Labels must be strings'] };
    }
    if (data.items.length < 2 || data.items.length > 11) {
      return { isValid: false, errors: ['Sort quiz must have 2-11 items'] };
    }
    for (const item of data.items) {
      if (typeof item !== 'string' || item.trim() === '') {
        return { isValid: false, errors: ['All items must be non-empty strings'] };
      }
    }
    return { isValid: true };
  }

  function validateImageQuiz(data) {
    if (!Array.isArray(data) || data.length < 1) {
      return { isValid: false, errors: ['Image quiz must have at least 1 item'] };
    }
    for (const item of data) {
      if (!item.image || !item.answer) {
        return { isValid: false, errors: ['Each item must have image and answer'] };
      }
      if (typeof item.image !== 'string' || typeof item.answer !== 'string') {
        return { isValid: false, errors: ['Image and answer must be strings'] };
      }
      if (item.image.trim() === '' || item.answer.trim() === '') {
        return { isValid: false, errors: ['Image and answer cannot be empty'] };
      }
    }
    return { isValid: true };
  }

  function validateImageMutationQuiz(data) {
    if (!Array.isArray(data) || data.length < 1) {
      return { isValid: false, errors: ['Image mutation quiz must have at least 1 item'] };
    }
    for (const item of data) {
      if (!item.mutatedImage || !item.originalImage) {
        return { isValid: false, errors: ['Each item must have mutatedImage and originalImage'] };
      }
      if (typeof item.mutatedImage !== 'string' || typeof item.originalImage !== 'string') {
        return { isValid: false, errors: ['Images must be strings'] };
      }
      if (item.mutatedImage.trim() === '' || item.originalImage.trim() === '') {
        return { isValid: false, errors: ['Images cannot be empty'] };
      }
    }
    return { isValid: true };
  }

  function validateTitleQuiz(data) {
    if (!data || typeof data !== 'object') {
      return { isValid: false, errors: ['Title quiz must be an object'] };
    }
    if (!data.title || typeof data.title !== 'string') {
      return { isValid: false, errors: ['Title quiz must have a title property that is a string'] };
    }
    if (data.title.trim() === '') {
      return { isValid: false, errors: ['Title cannot be empty'] };
    }
    return { isValid: true };
  }

  const VALIDATORS = {
    '.topicquiz': validateTopicQuiz,
    '.pairquiz': validatePairQuiz,
    '.sortquiz': validateSortQuiz,
    '.imagequiz': validateImageQuiz,
    '.imagemutationquiz': validateImageMutationQuiz,
    '.title': validateTitleQuiz
  };

  // Validates a single quiz file (name + raw text content).
  // Returns { isValid, errors, quiz: { fileName, extension, typeName, quizData } }
  function validateQuizFile(fileName, content) {
    const extension = getExtension(fileName);
    const validator = VALIDATORS[extension];
    if (!validator) {
      return { isValid: false, errors: [`Unknown quiz type: ${extension || fileName}`] };
    }

    let data;
    try {
      data = JSON.parse(content);
    } catch (err) {
      return { isValid: false, errors: [`Invalid JSON: ${err.message}`] };
    }

    const result = validator(data);
    if (!result.isValid) {
      return { isValid: false, errors: result.errors };
    }

    return {
      isValid: true,
      errors: [],
      quiz: { fileName, extension, typeName: QUIZ_TYPES[extension], quizData: data }
    };
  }

  window.QuizValidation = { QUIZ_TYPES, getExtension, isKnownQuizExtension, validateQuizFile };
})();
