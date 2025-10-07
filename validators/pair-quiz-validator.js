import { BaseValidator } from './base-validator.js';
import { PAIR_QUIZ } from '../shared/constants.js';

export class PairQuizValidator extends BaseValidator {
  validate(data) {
    if (!Array.isArray(data)) {
      return this.failure('Quiz data must be an array');
    }

    if (data.length < PAIR_QUIZ.MIN_PAIRS || data.length > PAIR_QUIZ.MAX_TOTAL_ITEMS) {
      return this.failure(
        `Pair quiz must have ${PAIR_QUIZ.MIN_PAIRS}-${PAIR_QUIZ.MAX_TOTAL_ITEMS} items`
      );
    }

    let validPairs = 0;
    let extraItems = 0;

    for (let i = 0; i < data.length; i++) {
      const item = data[i];

      if (!item.hasOwnProperty('left') || !item.hasOwnProperty('right')) {
        return this.failure(`Item ${i + 1} must have both 'left' and 'right' properties`);
      }

      if (item.left && item.right) {
        validPairs++;
      } else if (!item.left && item.right) {
        extraItems++;
      } else {
        return this.failure(`Item ${i + 1} has invalid structure`);
      }
    }

    if (validPairs < PAIR_QUIZ.MIN_PAIRS || validPairs > PAIR_QUIZ.MAX_PAIRS) {
      return this.failure(
        `Must have ${PAIR_QUIZ.MIN_PAIRS}-${PAIR_QUIZ.MAX_PAIRS} valid pairs`
      );
    }

    if (extraItems > PAIR_QUIZ.MAX_EXTRA_ITEMS) {
      return this.failure(`Can have at most ${PAIR_QUIZ.MAX_EXTRA_ITEMS} extra item`);
    }

    return this.success();
  }
}
