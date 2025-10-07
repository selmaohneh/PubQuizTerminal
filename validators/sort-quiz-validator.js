import { BaseValidator } from './base-validator.js';
import { SORT_QUIZ } from '../shared/constants.js';

export class SortQuizValidator extends BaseValidator {
  validate(data) {
    if (!data || typeof data !== 'object') {
      return this.failure('Quiz data must be an object');
    }

    if (!data.upperLabel || typeof data.upperLabel !== 'string') {
      return this.failure('Must have a valid upperLabel string');
    }

    if (!data.lowerLabel || typeof data.lowerLabel !== 'string') {
      return this.failure('Must have a valid lowerLabel string');
    }

    if (!Array.isArray(data.items)) {
      return this.failure('Must have an items array');
    }

    if (data.items.length < SORT_QUIZ.MIN_ITEMS || data.items.length > SORT_QUIZ.MAX_ITEMS) {
      return this.failure(
        `Must have ${SORT_QUIZ.MIN_ITEMS}-${SORT_QUIZ.MAX_ITEMS} items`
      );
    }

    for (let i = 0; i < data.items.length; i++) {
      const item = data.items[i];
      if (typeof item !== 'string' || item.trim() === '') {
        return this.failure(`Item ${i + 1} must be a non-empty string`);
      }
    }

    return this.success();
  }
}
