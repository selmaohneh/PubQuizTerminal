import { TopicQuizValidator } from './topic-quiz-validator.js';
import { PairQuizValidator } from './pair-quiz-validator.js';
import { SortQuizValidator } from './sort-quiz-validator.js';
import { ImageQuizValidator } from './image-quiz-validator.js';
import { ImageMutationQuizValidator } from './image-mutation-quiz-validator.js';
import { QUIZ_TYPES } from '../shared/constants.js';

export class ValidatorFactory {
  static getValidator(fileExtension) {
    switch (fileExtension) {
      case QUIZ_TYPES.TOPIC.extension:
        return new TopicQuizValidator();
      case QUIZ_TYPES.PAIR.extension:
        return new PairQuizValidator();
      case QUIZ_TYPES.SORT.extension:
        return new SortQuizValidator();
      case QUIZ_TYPES.IMAGE.extension:
        return new ImageQuizValidator();
      case QUIZ_TYPES.IMAGE_MUTATION.extension:
        return new ImageMutationQuizValidator();
      default:
        return null;
    }
  }

  static validate(fileExtension, data) {
    const validator = this.getValidator(fileExtension);
    if (!validator) {
      return {
        isValid: false,
        errors: [`Unknown quiz type: ${fileExtension}`]
      };
    }
    return validator.validate(data);
  }
}
