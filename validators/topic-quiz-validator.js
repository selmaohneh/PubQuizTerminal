import { BaseValidator } from './base-validator.js';
import { TOPIC_QUIZ } from '../shared/constants.js';

export class TopicQuizValidator extends BaseValidator {
  validate(data) {
    if (!Array.isArray(data)) {
      return this.failure('Quiz data must be an array');
    }

    if (data.length !== TOPIC_QUIZ.GRID_SIZE) {
      return this.failure(`Topic quiz must have exactly ${TOPIC_QUIZ.GRID_SIZE} topics`);
    }

    for (let i = 0; i < data.length; i++) {
      const topic = data[i];

      if (!topic.name || typeof topic.name !== 'string') {
        return this.failure(`Topic ${i + 1} must have a valid name`);
      }

      if (!topic.question || typeof topic.question !== 'string') {
        return this.failure(`Topic ${i + 1} must have a valid question`);
      }

      if (!topic.answer || typeof topic.answer !== 'string') {
        return this.failure(`Topic ${i + 1} must have a valid answer`);
      }

      if (topic.falseAnswers !== undefined) {
        if (!Array.isArray(topic.falseAnswers)) {
          return this.failure(`Topic ${i + 1}: falseAnswers must be an array`);
        }
        if (topic.falseAnswers.length > 0 && topic.falseAnswers.length !== 3) {
          return this.failure(`Topic ${i + 1}: falseAnswers must have exactly 3 items or be empty`);
        }
      }
    }

    return this.success();
  }
}
